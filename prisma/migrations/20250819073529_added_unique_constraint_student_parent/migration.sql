/*
  Warnings:

  - A unique constraint covering the columns `[student_id,parent_id]` on the table `student_parents` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "student_parents_student_id_parent_id_key" ON "student_parents"("student_id", "parent_id");
