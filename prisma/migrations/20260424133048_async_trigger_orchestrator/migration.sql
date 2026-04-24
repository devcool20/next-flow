-- AlterTable
ALTER TABLE "NodeExecution" ADD COLUMN     "attempt" INTEGER,
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "triggerRunId" TEXT;

-- AlterTable
ALTER TABLE "WorkflowRun" ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "reconciledAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "triggerRunId" TEXT,
ADD COLUMN     "triggerStatus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowRun_triggerRunId_key" ON "WorkflowRun"("triggerRunId");
