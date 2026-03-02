-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DH', 'PE', 'FM', 'OM', 'CEO', 'HR');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVALS', 'REJECTED_REVISION_REQUIRED', 'APPROVED', 'PURCHASED', 'FINANCE_RECHECK_REQUIRED', 'HANDED_OVER', 'DONE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('GOOD', 'DAMAGED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestHeader" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "justification" TEXT,
    "attachmentUrl" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "totalEstValue" DECIMAL(65,30),
    "totalActualValue" DECIMAL(65,30),
    "invoiceNumber" TEXT,
    "requesterId" INTEGER NOT NULL,
    "parentRequestId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestHeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestItem" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "estPrice" DECIMAL(65,30) NOT NULL,
    "actualPrice" DECIMAL(65,30),
    "variance" DECIMAL(65,30),
    "vendorId" INTEGER,
    "quoteUrl" TEXT,
    "assetId" TEXT,
    "condition" "ItemCondition",
    "requestId" INTEGER NOT NULL,

    CONSTRAINT "RequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "approverId" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestSnapshot" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "RequestHeader" ADD CONSTRAINT "RequestHeader_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestHeader" ADD CONSTRAINT "RequestHeader_parentRequestId_fkey" FOREIGN KEY ("parentRequestId") REFERENCES "RequestHeader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestItem" ADD CONSTRAINT "RequestItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestItem" ADD CONSTRAINT "RequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RequestHeader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RequestHeader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestSnapshot" ADD CONSTRAINT "RequestSnapshot_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RequestHeader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RequestHeader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
