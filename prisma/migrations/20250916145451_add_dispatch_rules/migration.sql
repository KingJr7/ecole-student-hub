-- CreateTable
CREATE TABLE "budgets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "school_id" TEXT,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "financial_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "generated_at" DATETIME NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "content" TEXT NOT NULL,
    "school_id" TEXT,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "dispatch_rules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "source_fee_id" INTEGER NOT NULL,
    "school_id" TEXT NOT NULL,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "dispatch_rules_source_fee_id_fkey" FOREIGN KEY ("source_fee_id") REFERENCES "fees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dispatch_rule_details" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dispatch_rule_id" INTEGER NOT NULL,
    "destination_category_id" INTEGER NOT NULL,
    "percentage" REAL NOT NULL,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "dispatch_rule_details_dispatch_rule_id_fkey" FOREIGN KEY ("dispatch_rule_id") REFERENCES "dispatch_rules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dispatch_rule_details_destination_category_id_fkey" FOREIGN KEY ("destination_category_id") REFERENCES "financial_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "budgets_supabase_id_key" ON "budgets"("supabase_id");

-- CreateIndex
CREATE INDEX "budgets_school_id_idx" ON "budgets"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_reports_supabase_id_key" ON "financial_reports"("supabase_id");

-- CreateIndex
CREATE INDEX "financial_reports_school_id_idx" ON "financial_reports"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_rules_source_fee_id_key" ON "dispatch_rules"("source_fee_id");

-- CreateIndex
CREATE INDEX "dispatch_rules_school_id_idx" ON "dispatch_rules"("school_id");
