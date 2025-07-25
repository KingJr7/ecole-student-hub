/*
  Warnings:

  - A unique constraint covering the columns `[matricul]` on the table `students` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "parents" ADD COLUMN "school_id" TEXT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN "matricul" TEXT;

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN "school_id" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "schoolName" TEXT,
    "schoolAddress" TEXT,
    "loggedIn" INTEGER DEFAULT 0,
    "userRole" TEXT,
    "schoolId" TEXT,
    "userToken" TEXT,
    "last_sync" DATETIME
);
INSERT INTO "new_settings" ("id", "last_sync", "loggedIn", "schoolAddress", "schoolId", "schoolName", "userRole", "userToken") SELECT "id", "last_sync", "loggedIn", "schoolAddress", "schoolId", "schoolName", "userRole", "userToken" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "students_matricul_key" ON "students"("matricul");
