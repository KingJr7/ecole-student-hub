/*
  Warnings:

  - You are about to alter the `salary_payments` table. If the table is not empty, all the data it contains will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_salary_payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "base_salary" REAL NOT NULL,
    "bonus_amount" REAL NOT NULL DEFAULT 0,
    "total_amount" REAL NOT NULL,
    "payment_date" TEXT NOT NULL,
    "notes" TEXT,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "salary_payments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_salary_payments" ("id", "employee_id", "payment_date", "notes", "supabase_id", "last_modified", "needs_sync", "is_deleted", "total_amount", "base_salary") SELECT "id", "employee_id", "payment_date", "notes", "supabase_id", "last_modified", "needs_sync", "is_deleted", "amount", "amount" FROM "salary_payments";
DROP TABLE "salary_payments";
ALTER TABLE "new_salary_payments" RENAME TO "salary_payments";
CREATE UNIQUE INDEX "salary_payments_supabase_id_key" ON "salary_payments"("supabase_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;