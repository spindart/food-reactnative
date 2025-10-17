-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "mercadoPagoCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_mercadoPagoCustomerId_key" ON "Usuario"("mercadoPagoCustomerId");

-- CreateTable
CREATE TABLE "Cartao" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "mercadoPagoCardId" TEXT NOT NULL,
    "lastFourDigits" TEXT NOT NULL,
    "firstSixDigits" TEXT NOT NULL,
    "expirationMonth" INTEGER NOT NULL,
    "expirationYear" INTEGER NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cartao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cartao_mercadoPagoCardId_key" ON "Cartao"("mercadoPagoCardId");

-- AddForeignKey
ALTER TABLE "Cartao" ADD CONSTRAINT "Cartao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
