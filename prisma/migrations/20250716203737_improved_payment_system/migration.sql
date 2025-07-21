-- CreateTable
CREATE TABLE "fee_payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "payment_id" INTEGER NOT NULL,
    "fee_id" INTEGER NOT NULL,
    "amount_paid" REAL NOT NULL,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "fee_payments_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fee_payments_fee_id_fkey" FOREIGN KEY ("fee_id") REFERENCES "fees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_fees" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "registration_id" INTEGER,
    "name" TEXT,
    "amount" REAL,
    "due_date" TEXT,
    "school_year" TEXT,
    "supabase_id" TEXT,
    "last_modified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_sync" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "fees_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_fees" ("amount", "due_date", "id", "is_deleted", "last_modified", "name", "needs_sync", "school_year", "supabase_id") SELECT "amount", "due_date", "id", "is_deleted", "last_modified", "name", "needs_sync", "school_year", "supabase_id" FROM "fees";
DROP TABLE "fees";
ALTER TABLE "new_fees" RENAME TO "fees";
CREATE UNIQUE INDEX "fees_supabase_id_key" ON "fees"("supabase_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "fee_payments_supabase_id_key" ON "fee_payments"("supabase_id");
