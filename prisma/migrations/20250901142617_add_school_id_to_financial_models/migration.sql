-- AlterTable
ALTER TABLE "financial_transactions" ADD COLUMN "school_id" TEXT;

-- CreateIndex
CREATE INDEX "financial_transactions_school_id_idx" ON "financial_transactions"("school_id");
