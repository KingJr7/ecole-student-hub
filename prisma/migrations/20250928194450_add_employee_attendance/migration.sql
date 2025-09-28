-- CreateTable
CREATE TABLE "employee_attendances" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER,
    "teacher_id" INTEGER,
    "check_in" DATETIME NOT NULL,
    "check_out" DATETIME,
    "notes" TEXT,
    "school_id" TEXT,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "employee_attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "employee_attendances_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_attendances_supabase_id_key" ON "employee_attendances"("supabase_id");

-- CreateIndex
CREATE INDEX "employee_attendances_employee_id_idx" ON "employee_attendances"("employee_id");

-- CreateIndex
CREATE INDEX "employee_attendances_teacher_id_idx" ON "employee_attendances"("teacher_id");

-- CreateIndex
CREATE INDEX "employee_attendances_school_id_idx" ON "employee_attendances"("school_id");
