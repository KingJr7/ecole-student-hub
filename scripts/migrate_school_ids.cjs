const { PrismaClient } = require('../src/generated/prisma');

async function main() {
  const prisma = new PrismaClient();
  console.log('Démarrage du script de migration des school_id...');

  try {
    // 1. Récupérer le school_id depuis les paramètres
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const schoolId = settings?.schoolId;

    if (!schoolId) {
      console.log('Aucun school_id trouvé dans les paramètres. La migration n\'est pas nécessaire.');
      return;
    }

    console.log(`Utilisation du school_id: ${schoolId}`);

    const modelsToUpdate = [
      'classes',
      'teachers',
      'employees',
      'parents',
      'financialCategory',
      'financialTransaction',
      'fees',
      'budgets',
      'financialReport'
    ];

    for (const model of modelsToUpdate) {
      try {
        console.log(`Mise à jour du modèle: ${model}...`);
        const result = await prisma[model].updateMany({
          where: {
            school_id: null,
          },
          data: {
            school_id: schoolId,
          },
        });
        console.log(` -> ${result.count} enregistrement(s) mis à jour pour ${model}.`);
      } catch (e) {
        console.warn(` -> Avertissement: Impossible de mettre à jour le modèle ${model}. Il ne possède peut-être pas de champ school_id. Erreur: ${e.message}`);
      }
    }

    console.log('\nMigration des school_id terminée avec succès !');

  } catch (error) {
    console.error('Une erreur est survenue lors de la migration des school_id:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
