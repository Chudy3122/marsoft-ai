/*
  Warnings:

  - You are about to drop the `Export` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Export" DROP CONSTRAINT "Export_chatId_fkey";

-- DropTable
DROP TABLE "Export";
