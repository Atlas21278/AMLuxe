-- AlterTable
ALTER TABLE "Commande" ADD COLUMN     "trackingData" JSONB,
ADD COLUMN     "trackingUpdatedAt" TIMESTAMP(3);
