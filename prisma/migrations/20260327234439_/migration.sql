/*
  Warnings:

  - A unique constraint covering the columns `[pedidoId]` on the table `Avaliacao` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paymentId]` on the table `Pedido` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[refundId]` on the table `Pedido` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cpf]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pedidoId` to the `Avaliacao` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('STATUS_PEDIDO', 'MENSAGEM_RESTAURANTE', 'PROMOCAO_CUPOM', 'AVISO_IMPORTANTE', 'EVENTO_SISTEMA', 'AVALIAR_PEDIDO');

-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'em_entrega';

-- AlterTable
ALTER TABLE "Avaliacao" ADD COLUMN     "motivos" TEXT[],
ADD COLUMN     "notaEntregador" INTEGER,
ADD COLUMN     "pedidoId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Estabelecimento" ADD COLUMN     "aberto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "diasAbertos" INTEGER[],
ADD COLUMN     "freteGratisAtivado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "horaAbertura" TEXT,
ADD COLUMN     "horaFechamento" TEXT,
ADD COLUMN     "valorMinimoFreteGratis" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ItemPedido" ADD COLUMN     "observacao" TEXT;

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "enderecoEntrega" TEXT,
ADD COLUMN     "entregueEm" TIMESTAMP(3),
ADD COLUMN     "formaPagamento" TEXT,
ADD COLUMN     "formaPagamentoEntrega" TEXT,
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "precisaTroco" BOOLEAN,
ADD COLUMN     "refundAmount" DOUBLE PRECISION,
ADD COLUMN     "refundDate" TIMESTAMP(3),
ADD COLUMN     "refundId" TEXT,
ADD COLUMN     "refundStatus" TEXT,
ADD COLUMN     "taxaEntrega" DOUBLE PRECISION,
ADD COLUMN     "totalAmount" DOUBLE PRECISION,
ADD COLUMN     "trocoParaQuanto" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "produtoCategoriaId" INTEGER;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "cpfVerificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dataNascimento" TIMESTAMP(3),
ADD COLUMN     "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "expoPushToken" TEXT,
ADD COLUMN     "fotoPerfil" TEXT,
ADD COLUMN     "genero" TEXT,
ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "telefoneVerificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProdutoCategoria" (
    "id" SERIAL NOT NULL,
    "estabelecimentoId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT,
    "ordem" INTEGER DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProdutoCategoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "data" TIMESTAMP(3),
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "lidaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pedidoId" INTEGER,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoCategoria_estabelecimentoId_nome_key" ON "ProdutoCategoria"("estabelecimentoId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Avaliacao_pedidoId_key" ON "Avaliacao"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_paymentId_key" ON "Pedido"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_refundId_key" ON "Pedido"("refundId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_cpf_key" ON "Usuario"("cpf");

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_produtoCategoriaId_fkey" FOREIGN KEY ("produtoCategoriaId") REFERENCES "ProdutoCategoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoCategoria" ADD CONSTRAINT "ProdutoCategoria_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
