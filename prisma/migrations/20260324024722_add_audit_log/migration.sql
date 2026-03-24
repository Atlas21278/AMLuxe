-- CreateTable
CREATE TABLE "Audit" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "ressource" TEXT NOT NULL,
    "cible" INTEGER,
    "details" TEXT,
    "userEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Audit_ressource_idx" ON "Audit"("ressource");

-- CreateIndex
CREATE INDEX "Audit_createdAt_idx" ON "Audit"("createdAt");
