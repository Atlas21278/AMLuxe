-- CreateTable
CREATE TABLE "DepensePro" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "categorie" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepensePro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepensePro_date_idx" ON "DepensePro"("date");

-- CreateIndex
CREATE INDEX "DepensePro_categorie_idx" ON "DepensePro"("categorie");
