-- CreateTable
CREATE TABLE "connection_checks" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_checks_pkey" PRIMARY KEY ("id")
);
