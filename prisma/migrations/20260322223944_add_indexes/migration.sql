-- CreateIndex
CREATE INDEX "Article_marque_idx" ON "Article"("marque");

-- CreateIndex
CREATE INDEX "Article_statut_idx" ON "Article"("statut");

-- CreateIndex
CREATE INDEX "Article_commandeId_idx" ON "Article"("commandeId");

-- CreateIndex
CREATE INDEX "Article_plateforme_idx" ON "Article"("plateforme");

-- CreateIndex
CREATE INDEX "Commande_fournisseur_idx" ON "Commande"("fournisseur");

-- CreateIndex
CREATE INDEX "Commande_statut_idx" ON "Commande"("statut");

-- CreateIndex
CREATE INDEX "Commande_date_idx" ON "Commande"("date");
