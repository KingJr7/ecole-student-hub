-- CreateTable
CREATE TABLE "financial_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "financial_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "financial_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_categories_supabase_id_key" ON "financial_categories"("supabase_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_supabase_id_key" ON "financial_transactions"("supabase_id");

-- CreateIndex
CREATE INDEX "financial_transactions_category_id_idx" ON "financial_transactions"("category_id");
