-- CreateTable
CREATE TABLE "AccessKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "rateLimit" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestLog" (
    "id" TEXT NOT NULL,
    "accessKeyId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symbol" TEXT NOT NULL,
    "successful" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessKey_key_key" ON "AccessKey"("key");

-- AddForeignKey
ALTER TABLE "RequestLog" ADD CONSTRAINT "RequestLog_accessKeyId_fkey" FOREIGN KEY ("accessKeyId") REFERENCES "AccessKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
