const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

// Promisify sqlite3 functions
const run = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve(this);
  });
});

const all = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

const exec = (db, sql) => new Promise((resolve, reject) => {
  db.exec(sql, (err) => {
    if (err) return reject(err);
    resolve();
  });
});

async function runProductionMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith('file:')) {
    throw new Error('DATABASE_URL is not set correctly for SQLite.');
  }
  const dbPath = dbUrl.slice(5);
  const migrationsDir = app.isPackaged
    ? path.join(process.resourcesPath, 'prisma', 'migrations')
    : path.join(__dirname, '..', 'prisma', 'migrations');

  console.log('[MIGRATE-PROD] Starting production migrations...');
  console.log(`[MIGRATE-PROD] Database path: ${dbPath}`);
  console.log(`[MIGRATE-PROD] Migrations directory: ${migrationsDir}`);

  if (!fs.existsSync(migrationsDir)) {
    console.log('[MIGRATE-PROD] No migrations directory found, skipping.');
    return;
  }

  const backupPath = `${dbPath}.${Date.now()}.bak`;
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`[MIGRATE-PROD] Database backup created at: ${backupPath}`);
  }

  const db = new sqlite3.Database(dbPath);

  try {
    // Prisma uses `_prisma_migrations` table.
    await run(db, `
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                    TEXT NOT NULL PRIMARY KEY,
        "checksum"              TEXT NOT NULL,
        "finished_at"           TEXT,
        "migration_name"        TEXT NOT NULL,
        "logs"                  TEXT,
        "rolled_back_at"        TEXT,
        "started_at"            TEXT NOT NULL DEFAULT current_timestamp,
        "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
      )
    `);

    const appliedRows = await all(db, 'SELECT migration_name FROM _prisma_migrations');
    const appliedMigrations = new Set(appliedRows.map(r => r.migration_name));
    console.log('[MIGRATE-PROD] Already applied migrations:', Array.from(appliedMigrations));

    const migrationFolders = fs.readdirSync(migrationsDir)
      .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
      .sort();

    for (const folder of migrationFolders) {
      if (appliedMigrations.has(folder)) {
        continue;
      }

      console.log(`[MIGRATE-PROD] Applying migration: ${folder}`);
      const sqlPath = path.join(migrationsDir, folder, 'migration.sql');
      if (!fs.existsSync(sqlPath)) {
        console.warn(`[MIGRATE-PROD] migration.sql not found for ${folder}, skipping.`);
        continue;
      }

      const sql = fs.readFileSync(sqlPath, 'utf8');

      await exec(db, 'BEGIN TRANSACTION');
      try {
        await exec(db, 'PRAGMA foreign_keys = OFF;');
        await exec(db, sql);
        await exec(db, 'PRAGMA foreign_keys = ON;');
        
        const migrationId = `${Date.now()}_${folder}`;
        await run(
          db,
          'INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (?, ?, ?, ?, ?)',
          [`${migrationId}-prod`, 'production-migration-checksum', new Date().toISOString(), folder, 1]
        );

        await exec(db, 'COMMIT');
        console.log(`[MIGRATE-PROD] Successfully applied migration: ${folder}`);
      } catch (err) {
        console.error(`[MIGRATE-PROD] Failed to apply migration ${folder}:`, err);
        await exec(db, 'ROLLBACK');
        db.close(); // Close before restoring
        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, dbPath);
          console.log('[MIGRATE-PROD] Database restored from backup.');
        }
        throw new Error(`Migration ${folder} failed and database has been restored.`);
      }
    }

    console.log('[MIGRATE-PROD] All new migrations applied successfully.');
  } catch (e) {
    console.error('[MIGRATE-PROD] An error occurred during the migration process:', e);
    if (db && db.open) {
        db.close();
    }
    throw e;
  } finally {
    if (db && db.open) {
      db.close((err) => {
        if (err) {
          console.error('[MIGRATE-PROD] Error closing the database:', err.message);
        }
      });
    }
  }
}

module.exports = { runProductionMigration };
