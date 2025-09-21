# Guide d'intégration : Gestion des Frais Mixtes (Abonnements)

## Objectif
Ce guide explique comment modifier l'application pour permettre à un élève de choisir une fréquence de paiement (par exemple, mensuelle ou hebdomadaire) pour un même type de frais (par exemple, la cantine), en utilisant un système d'abonnements individuels.

---

## Étape 1 : Modification de la Base de Données (`prisma/schema.prisma`)

Nous devons d'abord adapter la base de données pour regrouper les modèles de frais et pour enregistrer les abonnements des élèves.

### 1.1. Ajouter un "groupe" aux modèles de frais
Cela permettra de lier "Cantine (Mensuel)" et "Cantine (Hebdomadaire)" au même groupe "Cantine".

Ouvrez `prisma/schema.prisma` et ajoutez le champ `groupName` au modèle `FeeTemplate` :

```prisma
model FeeTemplate {
  id                  Int      @id @default(autoincrement())
  name                String
  groupName           String?  // <--- AJOUTER CETTE LIGNE
  amount              Float
  frequency           String   // monthly, weekly, unique
  // ... autres champs
}
```

### 1.2. Créer la table des "Abonnements"
Cette table liera une inscription d'élève à un modèle de frais spécifique.

Ajoutez le nouveau modèle suivant à votre fichier `prisma/schema.prisma` :

```prisma
model FeeSubscription {
  id              Int           @id @default(autoincrement())
  registration_id Int
  fee_template_id Int
  registration    Registrations @relation(fields: [registration_id], references: [id], onDelete: Cascade)
  fee_template    FeeTemplate   @relation(fields: [fee_template_id], references: [id], onDelete: Cascade)
  last_modified   DateTime      @default(now())
  needs_sync      Boolean       @default(false)
  is_deleted      Boolean       @default(false)

  @@unique([registration_id, fee_template_id])
  @@map("fee_subscriptions")
}
```
**Note :** Il faudra aussi ajouter `FeeSubscription[]` aux modèles `Registrations` et `FeeTemplate` pour compléter la relation.
```prisma
model Registrations {
  //...
  fee_subscriptions FeeSubscription[]
}

model FeeTemplate {
  //...
  fee_subscriptions FeeSubscription[]
}
```

### 1.3. Appliquer les changements
Exécutez la commande suivante pour créer et appliquer la migration.
**Attention :** Si une "dérive de schéma" est détectée, une réinitialisation de la base de données pourrait être nécessaire.

```bash
npx prisma migrate dev --name add_fee_subscriptions
```

---

## Étape 2 : Modification de la Logique Serveur (Backend)

### 2.1. Créer les "handlers" pour les abonnements
Créez un nouveau fichier `electron/ipc/handlers/subscriptions.cjs` avec le contenu suivant :

```javascript
const { ipcMain } = require('electron');
const { getUserSchoolId } = require('./helpers.cjs');

function setupSubscriptionsIPC(prisma) {
  // Récupère les abonnements pour une inscription donnée
  ipcMain.handle('db:subscriptions:getByRegistration', async (event, registrationId) => {
    // Note : Ajoutez une vérification de schoolId pour la sécurité
    return prisma.feeSubscription.findMany({
      where: { registration_id: registrationId, is_deleted: false },
      include: { fee_template: true },
    });
  });

  // Met à jour les abonnements pour une inscription
  ipcMain.handle('db:subscriptions:set', async (event, { registrationId, templateIds }) => {
    // Note : Ajoutez une vérification de schoolId pour la sécurité
    return prisma.$transaction(async (tx) => {
      // Marque les anciens abonnements comme supprimés
      await tx.feeSubscription.updateMany({
        where: { registration_id: registrationId },
        data: { is_deleted: true, needs_sync: true, last_modified: new Date() },
      });

      // Crée ou met à jour les nouveaux abonnements
      for (const templateId of templateIds) {
        await tx.feeSubscription.upsert({
          where: { registration_id_fee_template_id: { registration_id: registrationId, fee_template_id: templateId } },
          update: { is_deleted: false, needs_sync: true, last_modified: new Date() },
          create: { registration_id: registrationId, fee_template_id: templateId, needs_sync: true },
        });
      }
      return { success: true };
    });
  });
}

module.exports = { setupSubscriptionsIPC };
```

### 2.2. Mettre à jour `database.cjs`
Dans `electron/ipc/database.cjs`, importez et appelez la nouvelle fonction :

```javascript
// ... autres imports
const { setupSubscriptionsIPC } = require('./handlers/subscriptions.cjs');

function setupDatabaseIPC(prisma) {
  // ... autres appels setup
  setupSubscriptionsIPC(prisma);
}
```

### 2.3. Mettre à jour le calcul des frais (`fees.cjs`)
C'est l'étape la plus complexe. La fonction `getStudentFeeStatus` doit être entièrement réécrite pour utiliser la nouvelle logique.

**Nouvel Algorithme :**
1.  Récupérer les abonnements explicites de l'élève.
2.  Récupérer les frais qui s'appliquent à sa classe/niveau.
3.  Créer une liste finale de frais à appliquer :
    *   Prendre tous les frais de classe/niveau.
    *   Pour chaque abonnement explicite, remplacer tous les frais du même groupe par celui de l'abonnement.
4.  Calculer le statut pour cette liste finale.

Voici le code complet à utiliser pour remplacer la fonction `db:fees:getStudentFeeStatus` dans `electron/ipc/handlers/fees.cjs` (ce code est une ébauche et devra être testé en profondeur) :

```javascript
// Code à adapter et à insérer dans fees.cjs

// ... (début du fichier)

ipcMain.handle('db:fees:getStudentFeeStatus', async (event, { registrationId }) => {
  // ... (récupération de registration, schoolId, etc.)

  // 1. Récupérer toutes les données nécessaires
  const [payments, classAndLevelTemplates, subscriptions] = await Promise.all([
    prisma.payments.findMany({ where: { registration_id: registrationId, is_deleted: false } }),
    prisma.feeTemplate.findMany({
      where: { school_id: schoolId, OR: [{ applies_to_level: studentLevel }, { applies_to_class_id: studentClassId }] },
    }),
    prisma.feeSubscription.findMany({
      where: { registration_id: registrationId, is_deleted: false },
      include: { fee_template: true },
    }),
  ]);

  const subscribedTemplates = subscriptions.map(s => s.fee_template);
  const subscribedGroupNames = subscribedTemplates.map(t => t.groupName).filter(Boolean);

  // 2. Filtrer les frais de classe/niveau pour enlever ceux gérés par abonnement
  const nonSubscribedClassAndLevelTemplates = classAndLevelTemplates.filter(t => {
    return !t.groupName || !subscribedGroupNames.includes(t.groupName);
  });

  // 3. Créer la liste finale des modèles à appliquer
  const finalTemplates = [...subscribedTemplates, ...nonSubscribedClassAndLevelTemplates];

  // 4. Calculer le statut pour chaque modèle (logique de boucle mensuelle/hebdomadaire à appliquer ici)
  // ... Le reste de la logique de calcul reste similaire mais doit boucler sur `finalTemplates`.
  
  // ... (le reste de la fonction doit être réécrit en se basant sur cette nouvelle logique)
});

// ... (fin du fichier)
```

---

## Étape 3 : Modification de l'Interface Utilisateur (Frontend)

### 3.1. Mettre à jour le `useDatabase.ts`
Ajoutez les nouvelles fonctions pour gérer les abonnements :

```typescript
// Dans src/hooks/useDatabase.ts
// ...
  const getSubscriptionsByRegistration = useCallback((registrationId: number) => invoke('db:subscriptions:getByRegistration', registrationId), []);
  const setSubscriptionsForRegistration = useCallback((registrationId: number, templateIds: number[]) => invoke('db:subscriptions:set', { registrationId, templateIds }), []);
// ...
// N'oubliez pas de les exporter dans le `return useMemo(...)`
```

### 3.2. Ajouter le champ "Groupe" au formulaire
Dans `src/components/FeeTemplateForm.tsx`, ajoutez un champ de texte pour le `groupName`.

```jsx
// Dans FeeTemplateForm.tsx
<FormField name="groupName" control={form.control} render={({ field }) => (
  <FormItem>
    <FormLabel>Nom du groupe (optionnel)</FormLabel>
    <FormControl><Input placeholder="Cantine" {...field} /></FormControl>
    <FormMessage />
  </FormItem>
)} />
```
N'oubliez pas de l'ajouter au schéma Zod et aux `defaultValues`.

### 3.3. Créer le composant de gestion des abonnements
Créez un nouveau fichier `src/components/FeeSubscriptionsManager.tsx`. Ce composant affichera les groupes de frais et permettra de choisir un abonnement pour l'élève.

```jsx
// src/components/FeeSubscriptionsManager.tsx (Exemple simplifié)
import React, { useState, useEffect } from 'react';
import { useDatabase } from '@/hooks/useDatabase';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function FeeSubscriptionsManager({ registrationId }) {
  const db = useDatabase();
  const [groupedTemplates, setGroupedTemplates] = useState({});
  const [subscriptions, setSubscriptions] = useState({});

  useEffect(() => {
    // Charger tous les FeeTemplate et les regrouper par `groupName`
    // Charger les abonnements actuels de l'élève
  }, [registrationId]);

  const handleSubscriptionChange = (groupId, templateId) => {
    setSubscriptions(prev => ({ ...prev, [groupId]: templateId }));
  };

  const handleSave = () => {
    // Appeler db.setSubscriptionsForRegistration avec les IDs des templates choisis
  };

  return (
    <div>
      {Object.entries(groupedTemplates).map(([groupName, templates]) => (
        <div key={groupName}>
          <h3>{groupName}</h3>
          <RadioGroup onValueChange={(id) => handleSubscriptionChange(groupName, id)} value={subscriptions[groupName]}>
            {templates.map(template => (
              <FormItem key={template.id}>
                <FormControl><RadioGroupItem value={template.id} /></FormControl>
                <Label>{template.name}</Label>
              </FormItem>
            ))}
          </RadioGroup>
        </div>
      ))}
      <Button onClick={handleSave}>Enregistrer les abonnements</Button>
    </div>
  );
}
```

### 3.4. Intégrer le nouveau composant
Dans `src/pages/StudentDetails.tsx`, ajoutez ce nouveau composant pour permettre la gestion des abonnements pour l'élève affiché.

```jsx
// Dans StudentDetails.tsx
// ...
import { FeeSubscriptionsManager } from '@/components/FeeSubscriptionsManager';

// ...
// Dans le JSX, après les informations de l'élève :
<Card>
  <CardHeader><CardTitle>Abonnements aux frais</CardTitle></CardHeader>
  <CardContent>
    <FeeSubscriptionsManager registrationId={registration.id} />
  </CardContent>
</Card>
// ...
```

Ce guide est une ébauche de haut niveau. L'implémentation exacte, en particulier la réécriture de `getStudentFeeStatus`, demandera une attention particulière pour gérer tous les cas de figure.
