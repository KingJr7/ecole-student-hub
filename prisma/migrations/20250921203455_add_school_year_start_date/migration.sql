/*
  Warnings:

  - You are about to drop the `fees` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `school_year` on the `financial_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `fee_id` on the `payments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "fees_supabase_id_key";

-- AlterTable
ALTER TABLE "settings" ADD COLUMN "permissions" JSONB;
ALTER TABLE "settings" ADD COLUMN "roleId" TEXT;
ALTER TABLE "settings" ADD COLUMN "schoolYearStartDate" DATETIME;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "fees";
PRAGMA foreign_keys=on;

-- CreateTable
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
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "single_fees_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fee_templates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "frequency" TEXT NOT NULL,
    "due_day" INTEGER,
    "applicable_months" JSONB,
    "school_id" TEXT NOT NULL,
    "applies_to_level" TEXT,
    "applies_to_class_id" INTEGER,
    CONSTRAINT "fee_templates_applies_to_class_id_fkey" FOREIGN KEY ("applies_to_class_id") REFERENCES "classes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_dispatch_rules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "source_fee_id" INTEGER NOT NULL,
    "school_id" TEXT NOT NULL,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "dispatch_rules_source_fee_id_fkey" FOREIGN KEY ("source_fee_id") REFERENCES "single_fees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_dispatch_rules" ("id", "is_deleted", "last_modified", "name", "needs_sync", "school_id", "source_fee_id") SELECT "id", "is_deleted", "last_modified", "name", "needs_sync", "school_id", "source_fee_id" FROM "dispatch_rules";
DROP TABLE "dispatch_rules";
ALTER TABLE "new_dispatch_rules" RENAME TO "dispatch_rules";
CREATE UNIQUE INDEX "dispatch_rules_source_fee_id_key" ON "dispatch_rules"("source_fee_id");
CREATE INDEX "dispatch_rules_school_id_idx" ON "dispatch_rules"("school_id");
CREATE TABLE "new_financial_transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "school_id" TEXT,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "financial_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "financial_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_financial_transactions" ("amount", "category_id", "date", "description", "id", "is_deleted", "last_modified", "needs_sync", "school_id", "supabase_id", "type") SELECT "amount", "category_id", "date", "description", "id", "is_deleted", "last_modified", "needs_sync", "school_id", "supabase_id", "type" FROM "financial_transactions";
DROP TABLE "financial_transactions";
ALTER TABLE "new_financial_transactions" RENAME TO "financial_transactions";
CREATE UNIQUE INDEX "financial_transactions_supabase_id_key" ON "financial_transactions"("supabase_id");
CREATE INDEX "financial_transactions_category_id_idx" ON "financial_transactions"("category_id");
CREATE INDEX "financial_transactions_school_id_idx" ON "financial_transactions"("school_id");
CREATE TABLE "new_payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "registration_id" INTEGER,
    "amount" REAL,
    "method" TEXT,
    "date" TEXT,
    "reference" TEXT,
    "emitter_id" TEXT,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "single_fee_id" INTEGER,
    "fee_template_id" INTEGER,
    "period_identifier" TEXT,
    CONSTRAINT "payments_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_single_fee_id_fkey" FOREIGN KEY ("single_fee_id") REFERENCES "single_fees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_fee_template_id_fkey" FOREIGN KEY ("fee_template_id") REFERENCES "fee_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amount", "date", "emitter_id", "id", "is_deleted", "last_modified", "method", "needs_sync", "reference", "registration_id", "supabase_id") SELECT "amount", "date", "emitter_id", "id", "is_deleted", "last_modified", "method", "needs_sync", "reference", "registration_id", "supabase_id" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE UNIQUE INDEX "payments_supabase_id_key" ON "payments"("supabase_id");
CREATE INDEX "payments_registration_id_single_fee_id_fee_template_id_idx" ON "payments"("registration_id", "single_fee_id", "fee_template_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "single_fees_supabase_id_key" ON "single_fees"("supabase_id");
