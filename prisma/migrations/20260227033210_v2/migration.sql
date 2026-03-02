/*
  Warnings:

  - You are about to drop the column `totalActualValue` on the `RequestHeader` table. All the data in the column will be lost.
  - You are about to drop the column `totalEstValue` on the `RequestHeader` table. All the data in the column will be lost.
  - You are about to drop the column `estPrice` on the `RequestItem` table. All the data in the column will be lost.
  - You are about to drop the column `variance` on the `RequestItem` table. All the data in the column will be lost.
  - You are about to drop the column `vendorId` on the `RequestItem` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Vendor` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RequestItem" DROP CONSTRAINT "RequestItem_vendorId_fkey";

-- AlterTable
ALTER TABLE "RequestHeader" DROP COLUMN "totalActualValue",
DROP COLUMN "totalEstValue",
ADD COLUMN     "totalValue" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "RequestItem" DROP COLUMN "estPrice",
DROP COLUMN "variance",
DROP COLUMN "vendorId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "password" TEXT NOT NULL;

-- DropTable
DROP TABLE "Vendor";
