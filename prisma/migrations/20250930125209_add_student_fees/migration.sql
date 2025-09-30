-- CreateTable
CREATE TABLE "student_fees" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "registration_id" INTEGER NOT NULL,
    "fee_template_id" INTEGER,
    "single_fee_id" INTEGER,
    "custom_amount" REAL NOT NULL,
    "reason" TEXT,
    "school_year" TEXT,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "student_fees_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "student_fees_fee_template_id_fkey" FOREIGN KEY ("fee_template_id") REFERENCES "fee_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "student_fees_single_fee_id_fkey" FOREIGN KEY ("single_fee_id") REFERENCES "single_fees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "student_fees_supabase_id_key" ON "student_fees"("supabase_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_fees_registration_id_fee_template_id_key" ON "student_fees"("registration_id", "fee_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_fees_registration_id_single_fee_id_key" ON "student_fees"("registration_id", "single_fee_id");
