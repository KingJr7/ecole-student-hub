/*
  Warnings:

  - A unique constraint covering the columns `[supabase_id]` on the table `dispatch_rule_details` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[supabase_id]` on the table `dispatch_rules` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[student_id,lesson_id,quarter,type]` on the table `notes` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "dispatch_rule_details" ADD COLUMN "supabase_id" TEXT;

-- AlterTable
ALTER TABLE "dispatch_rules" ADD COLUMN "supabase_id" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_fee_templates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "frequency" TEXT NOT NULL,
    "due_day" INTEGER,
    "applicable_months" JSONB,
    "school_id" TEXT NOT NULL,
    "applies_to_level" TEXT,
    "applies_to_class_id" INTEGER,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "fee_templates_applies_to_class_id_fkey" FOREIGN KEY ("applies_to_class_id") REFERENCES "classes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_fee_templates" ("amount", "applicable_months", "applies_to_class_id", "applies_to_level", "due_day", "frequency", "id", "name", "school_id") SELECT "amount", "applicable_months", "applies_to_class_id", "applies_to_level", "due_day", "frequency", "id", "name", "school_id" FROM "fee_templates";
DROP TABLE "fee_templates";
ALTER TABLE "new_fee_templates" RENAME TO "fee_templates";
CREATE UNIQUE INDEX "fee_templates_supabase_id_key" ON "fee_templates"("supabase_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_rule_details_supabase_id_key" ON "dispatch_rule_details"("supabase_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_rules_supabase_id_key" ON "dispatch_rules"("supabase_id");

-- CreateIndex
CREATE UNIQUE INDEX "notes_student_id_lesson_id_quarter_type_key" ON "notes"("student_id", "lesson_id", "quarter", "type");
