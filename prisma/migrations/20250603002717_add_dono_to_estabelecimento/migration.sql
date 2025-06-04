/*
  Warnings:

  - Added the required column `donoId` to the `Estabelecimento` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Estabelecimento" ADD COLUMN     "donoId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Estabelecimento" ADD CONSTRAINT "Estabelecimento_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
