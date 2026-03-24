/*
  Warnings:

  - You are about to drop the column `trackingData` on the `Commande` table. All the data in the column will be lost.
  - You are about to drop the column `trackingUpdatedAt` on the `Commande` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Commande" DROP COLUMN "trackingData",
DROP COLUMN "trackingUpdatedAt";
