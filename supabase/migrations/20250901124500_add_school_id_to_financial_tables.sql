-- Ajout de la colonne school_id à la table financial_categories
ALTER TABLE "public"."financial_categories" ADD COLUMN "school_id" UUID;

-- Ajout de la colonne school_id à la table financial_transactions
ALTER TABLE "public"."financial_transactions" ADD COLUMN "school_id" UUID;

-- Ajout de la contrainte de clé étrangère pour financial_categories
ALTER TABLE "public"."financial_categories"
ADD CONSTRAINT "financial_categories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;

-- Ajout de la contrainte de clé étrangère pour financial_transactions
ALTER TABLE "public"."financial_transactions"
ADD CONSTRAINT "financial_transactions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;

-- Ajout des index pour améliorer les performances
CREATE INDEX "financial_categories_school_id_idx" ON "public"."financial_categories"("school_id");
CREATE INDEX "financial_transactions_school_id_idx" ON "public"."financial_transactions"("school_id");