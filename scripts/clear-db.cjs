const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Assurer que le chemin vers la base de données est correct
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(__dirname, '../database.sqlite')}`,
    },
  },
});

// Ordre de suppression pour respecter les contraintes de clés étrangères
// On supprime les tables qui dépendent des autres en premier.
const modelDeletionOrder = [
    'Notes',
    'Attendances',
    'Payments',
    'Schedules',
    'StudentParents',
    'Lessons',
    'Registrations',
    'Subjects',
    'Teachers',
    'Parents',
    'Students',
    'Classes',
    'Employees',
];

async function clearDatabase() {
  console.log('🧹 Démarrage du nettoyage de la base de données...');

  // Supprimer les données de chaque table dans l'ordre défini
  for (const modelName of modelDeletionOrder) {
    try {
      const model = prisma[modelName.toLowerCase()];
      if (model && typeof model.deleteMany === 'function') {
        const { count } = await model.deleteMany({});
        console.log(`🗑️  Supprimé ${count} enregistrements de la table ${modelName}`);
      } else {
        console.warn(`⚠️  Le modèle ${modelName} n'a pas été trouvé ou ne supporte pas deleteMany. Saut.`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors du nettoyage de la table ${modelName}:`, error.message);
    }
  }

  // Réinitialiser la table des paramètres
  try {
    await prisma.settings.deleteMany({});
    console.log(`🗑️  Supprimé les anciens paramètres.`);
    await prisma.settings.create({
        data: {
            id: 1,
            schoolName: 'Mon École',
            loggedIn: 0,
            userRole: null,
            schoolId: null,
            userToken: null,
            last_sync: null,
        }
    });
    console.log('🔄 Table des paramètres réinitialisée.');
  } catch(e) {
      console.error('❌ Erreur lors de la réinitialisation des paramètres:', e.message);
  }

  console.log('✅ Nettoyage de la base de données terminé.');
}

clearDatabase()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
