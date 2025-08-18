-- CreateIndex
CREATE INDEX "attendances_student_id_date_idx" ON "attendances"("student_id", "date");

-- CreateIndex
CREATE INDEX "employees_is_deleted_email_idx" ON "employees"("is_deleted", "email");

-- CreateIndex
CREATE INDEX "lessons_class_id_subject_id_teacher_id_idx" ON "lessons"("class_id", "subject_id", "teacher_id");

-- CreateIndex
CREATE INDEX "notes_student_id_lesson_id_quarter_idx" ON "notes"("student_id", "lesson_id", "quarter");

-- CreateIndex
CREATE INDEX "payments_registration_id_fee_id_idx" ON "payments"("registration_id", "fee_id");

-- CreateIndex
CREATE INDEX "registrations_student_id_class_id_idx" ON "registrations"("student_id", "class_id");

-- CreateIndex
CREATE INDEX "salary_payments_employee_id_idx" ON "salary_payments"("employee_id");

-- CreateIndex
CREATE INDEX "schedules_lesson_id_idx" ON "schedules"("lesson_id");

-- CreateIndex
CREATE INDEX "student_parents_student_id_parent_id_idx" ON "student_parents"("student_id", "parent_id");

-- CreateIndex
CREATE INDEX "students_is_deleted_idx" ON "students"("is_deleted");

-- CreateIndex
CREATE INDEX "subjects_class_id_idx" ON "subjects"("class_id");

-- CreateIndex
CREATE INDEX "teacher_work_hours_teacher_id_date_idx" ON "teacher_work_hours"("teacher_id", "date");

-- CreateIndex
CREATE INDEX "teachers_is_deleted_email_idx" ON "teachers"("is_deleted", "email");
