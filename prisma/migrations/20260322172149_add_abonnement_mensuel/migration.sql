-- CreateTable
CREATE TABLE "AbonnementMensuel" (
    "id" SERIAL NOT NULL,
    "mois" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbonnementMensuel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AbonnementMensuel_mois_key" ON "AbonnementMensuel"("mois");
