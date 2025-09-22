const runProductionMigration = async (prisma) => {
  console.log("Vérification de la structure de la base de données de production...");

  const migrationTasks = [
    // Migration: Ajout de schoolYearStartDate à Settings
    async () => {
      const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(settings);`);
      if (!columns.some(c => c.name === 'schoolYearStartDate')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE settings ADD COLUMN schoolYearStartDate DATETIME;`);
        console.log('[MIGRATION] Colonne schoolYearStartDate ajoutée à settings.');
      }
    },
    // Migration: Ajout des champs de synchro à FeeTemplate
    async () => {
      try {
        const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(fee_templates);`);
        if (!columns.some(c => c.name === 'supabase_id')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE fee_templates ADD COLUMN supabase_id TEXT;`);
          await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "fee_templates_supabase_id_key" ON "fee_templates"("supabase_id");`);
        }
        if (!columns.some(c => c.name === 'needs_sync')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE fee_templates ADD COLUMN needs_sync BOOLEAN NOT NULL DEFAULT false;`);
        }
        if (!columns.some(c => c.name === 'is_deleted')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE fee_templates ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;`);
        }
      } catch (e) { /* La table n'existe probablement pas, elle sera créée par une autre migration */ }
    },
    // Migration: Ajout des colonnes à Payments
    async () => {
      const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(payments);`);
      if (!columns.some(c => c.name === 'single_fee_id')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE payments ADD COLUMN single_fee_id INTEGER;`);
      }
      if (!columns.some(c => c.name === 'fee_template_id')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE payments ADD COLUMN fee_template_id INTEGER;`);
      }
      if (!columns.some(c => c.name === 'period_identifier')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE payments ADD COLUMN period_identifier TEXT;`);
      }
    },
    // Ajoutez ici d'autres tâches de migration pour les futures versions
  ];

  console.log(`[MIGRATION] Exécution de ${migrationTasks.length} tâches de migration...`);
  for (const task of migrationTasks) {
    try {
      await task();
    } catch (error) {
      console.error("Erreur durant une tâche de migration de production:", error);
    }
  }
  console.log("[MIGRATION] Vérification de la base de données de production terminée.");
};

module.exports = { runProductionMigration };
