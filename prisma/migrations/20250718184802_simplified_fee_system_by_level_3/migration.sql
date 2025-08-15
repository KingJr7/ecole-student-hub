/*
  Warnings:

  - You are about to drop the `fee_payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `registration_id` on the `fees` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "fee_payments_supabase_id_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "fee_payments";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_fees" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "amount" REAL,
    "due_date" TEXT,
    "school_year" TEXT,
    "level" TEXT,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_fees" ("amount", "due_date", "id", "is_deleted", "last_modified", "name", "needs_sync", "school_year", "supabase_id") SELECT "amount", "due_date", "id", "is_deleted", "last_modified", "name", "needs_sync", "school_year", "supabase_id" FROM "fees";
DROP TABLE "fees";
ALTER TABLE "new_fees" RENAME TO "fees";
CREATE UNIQUE INDEX "fees_supabase_id_key" ON "fees"("supabase_id");
CREATE TABLE "new_payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "registration_id" INTEGER,
    "fee_id" INTEGER,
    "amount" REAL,
    "method" TEXT,
    "date" TEXT,
    "reference" TEXT,
    "emitter_id" TEXT,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "payments_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_fee_id_fkey" FOREIGN KEY ("fee_id") REFERENCES "fees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amount", "date", "emitter_id", "id", "is_deleted", "last_modified", "method", "needs_sync", "reference", "registration_id", "supabase_id") SELECT "amount", "date", "emitter_id", "id", "is_deleted", "last_modified", "method", "needs_sync", "reference", "registration_id", "supabase_id" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE UNIQUE INDEX "payments_supabase_id_key" ON "payments"("supabase_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
