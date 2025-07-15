-- AlterTable
ALTER TABLE "teachers" ADD COLUMN "hourlyRate" REAL DEFAULT 0;

-- CreateTable
CREATE TABLE "teacher_work_hours" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "teacher_id" INTEGER NOT NULL,
    "subject_id" INTEGER,
    "hours" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "teacher_work_hours_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "teacher_work_hours_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "teacher_work_hours_supabase_id_key" ON "teacher_work_hours"("supabase_id");
