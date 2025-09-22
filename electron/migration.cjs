const runProductionMigration = async (prisma) => {
  console.log("[MIGRATION] Vérification de la structure de la base de données de production...");

  // Helper pour vérifier si une table existe
  const tableExists = async (tableName) => {
    try {
      const result = await prisma.$queryRawUnsafe(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        tableName
      );
      return result.length > 0;
    } catch (e) {
      console.error(`Erreur lors de la vérification de la table ${tableName}:`, e);
      return false;
    }
  };

  // Helper pour vérifier si une colonne existe
  const columnExists = async (tableName, columnName) => {
    try {
      const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(${tableName});`);
      return columns.some(c => c.name === columnName);
    } catch (e) {
      return false; // La table n'existe probablement pas
    }
  };

  const migrationTasks = [
    // Création de la table single_fees (mappée depuis le modèle SingleFee)
    async () => {
      if (!(await tableExists('single_fees'))) {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE "single_fees" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "name" TEXT,
            "amount" REAL,
            "due_date" TEXT,
            "school_year" TEXT,
            "level" TEXT,
            "class_id" INTEGER,
            "school_id" TEXT,
            "supabase_id" TEXT,
            "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "needs_sync" BOOLEAN NOT NULL DEFAULT false,
            "is_deleted" BOOLEAN NOT NULL DEFAULT false
          );
        `);
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "single_fees_supabase_id_key" ON "single_fees"("supabase_id");`);
        console.log('[MIGRATION] Table single_fees créée.');
      }
    },
    // Création de la table fee_templates
    async () => {
      if (!(await tableExists('fee_templates'))) {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE "fee_templates" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "name" TEXT NOT NULL,
            "amount" REAL NOT NULL,
            "frequency" TEXT NOT NULL,
            "due_day" INTEGER,
            "applicable_months" TEXT,
            "school_id" TEXT NOT NULL,
            "applies_to_level" TEXT,
            "applies_to_class_id" INTEGER,
            "supabase_id" TEXT,
            "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "needs_sync" BOOLEAN NOT NULL DEFAULT false,
            "is_deleted" BOOLEAN NOT NULL DEFAULT false
          );
        `);
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "fee_templates_supabase_id_key" ON "fee_templates"("supabase_id");`);
        console.log('[MIGRATION] Table fee_templates créée.');
      }
    },
    // Ajout de colonnes à la table payments
    async () => {
      if (await tableExists('payments')) {
        if (!(await columnExists('payments', 'single_fee_id'))) {
          await prisma.$executeRawUnsafe(`ALTER TABLE payments ADD COLUMN single_fee_id INTEGER;`);
        }
        if (!(await columnExists('payments', 'fee_template_id'))) {
          await prisma.$executeRawUnsafe(`ALTER TABLE payments ADD COLUMN fee_template_id INTEGER;`);
        }
        if (!(await columnExists('payments', 'period_identifier'))) {
          await prisma.$executeRawUnsafe(`ALTER TABLE payments ADD COLUMN period_identifier TEXT;`);
        }
        console.log('[MIGRATION] Table payments vérifiée/mise à jour.');
      }
    },
    // Ajout de la colonne schoolYearStartDate à la table settings
    async () => {
        if (await tableExists('settings') && !(await columnExists('settings', 'schoolYearStartDate'))) {
            await prisma.$executeRawUnsafe(`ALTER TABLE settings ADD COLUMN schoolYearStartDate DATETIME;`);
            console.log('[MIGRATION] Colonne schoolYearStartDate ajoutée à settings.');
        }
    },
  ];

  console.log(`[MIGRATION] Exécution de ${migrationTasks.length} tâches de migration de production...`);
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