-- Création de la table pour les catégories financières
CREATE TABLE "public"."financial_categories" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "last_modified" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "local_id" INTEGER
);

-- Création de la table pour les transactions financières
CREATE TABLE "public"."financial_transactions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "date" TIMESTAMPTZ NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "last_modified" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "local_id" INTEGER,
    CONSTRAINT "financial_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."financial_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Ajout d'un index pour améliorer les performances des recherches par catégorie
CREATE INDEX "financial_transactions_category_id_idx" ON "public"."financial_transactions"("category_id");
