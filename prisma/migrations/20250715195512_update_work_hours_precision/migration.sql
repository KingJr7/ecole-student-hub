-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_teacher_work_hours" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "teacher_id" INTEGER NOT NULL,
    "subject_id" INTEGER,
    "date" TEXT,
    "start_time" TEXT,
    "end_time" TEXT,
    "hours" REAL NOT NULL,
    "notes" TEXT,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "teacher_work_hours_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "teacher_work_hours_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_teacher_work_hours" ("date", "hours", "id", "is_deleted", "last_modified", "needs_sync", "notes", "subject_id", "supabase_id", "teacher_id") SELECT "date", "hours", "id", "is_deleted", "last_modified", "needs_sync", "notes", "subject_id", "supabase_id", "teacher_id" FROM "teacher_work_hours";
DROP TABLE "teacher_work_hours";
ALTER TABLE "new_teacher_work_hours" RENAME TO "teacher_work_hours";
CREATE UNIQUE INDEX "teacher_work_hours_supabase_id_key" ON "teacher_work_hours"("supabase_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
