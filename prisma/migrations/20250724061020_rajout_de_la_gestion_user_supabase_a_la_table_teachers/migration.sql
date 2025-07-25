/*
  Warnings:

  - You are about to drop the column `gender` on the `teachers` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_teachers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "first_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "adress" TEXT,
    "password_hash" TEXT,
    "role_id" TEXT DEFAULT '6bd5dc10-9df7-43f4-8539-6c0386b3cc33',
    "speciality" TEXT,
    "matricule" TEXT,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" REAL DEFAULT 0,
    "school_id" TEXT
);
INSERT INTO "new_teachers" ("adress", "email", "first_name", "hourlyRate", "id", "is_deleted", "last_modified", "matricule", "name", "needs_sync", "phone", "school_id", "speciality", "supabase_id") SELECT "adress", "email", "first_name", "hourlyRate", "id", "is_deleted", "last_modified", "matricule", "name", "needs_sync", "phone", "school_id", "speciality", "supabase_id" FROM "teachers";
DROP TABLE "teachers";
ALTER TABLE "new_teachers" RENAME TO "teachers";
CREATE UNIQUE INDEX "teachers_email_key" ON "teachers"("email");
CREATE UNIQUE INDEX "teachers_supabase_id_key" ON "teachers"("supabase_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
