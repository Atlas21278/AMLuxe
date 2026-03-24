-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Commande" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Article_deletedAt_idx" ON "Article"("deletedAt");

-- CreateIndex
CREATE INDEX "Commande_deletedAt_idx" ON "Commande"("deletedAt");
