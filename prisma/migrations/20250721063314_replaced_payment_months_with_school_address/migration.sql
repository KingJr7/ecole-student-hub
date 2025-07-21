/*
  Warnings:

  - You are about to drop the column `paymentMonths` on the `settings` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_salary_payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "base_salary" REAL NOT NULL DEFAULT 0,
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
INSERT INTO "new_salary_payments" ("base_salary", "bonus_amount", "employee_id", "id", "is_deleted", "last_modified", "needs_sync", "notes", "payment_date", "supabase_id", "total_amount") SELECT "base_salary", "bonus_amount", "employee_id", "id", "is_deleted", "last_modified", "needs_sync", "notes", "payment_date", "supabase_id", "total_amount" FROM "salary_payments";
DROP TABLE "salary_payments";
ALTER TABLE "new_salary_payments" RENAME TO "salary_payments";
CREATE UNIQUE INDEX "salary_payments_supabase_id_key" ON "salary_payments"("supabase_id");
CREATE TABLE "new_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "schoolName" TEXT,
    "schoolAddress" TEXT,
    "loggedIn" INTEGER DEFAULT 0,
    "userRole" TEXT,
    "schoolId" TEXT,
    "userToken" TEXT,
    "last_sync" DATETIME
);
INSERT INTO "new_settings" ("id", "last_sync", "loggedIn", "schoolId", "schoolName", "userRole", "userToken") SELECT "id", "last_sync", "loggedIn", "schoolId", "schoolName", "userRole", "userToken" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
