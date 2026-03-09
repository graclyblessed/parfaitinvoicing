-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "companySIRET" TEXT NOT NULL,
    "companySIREN" TEXT NOT NULL,
    "companyTVA" TEXT,
    "vatRegime" TEXT NOT NULL DEFAULT 'franchise',
    "fiscalYearStart" INTEGER NOT NULL DEFAULT 1,
    "fiscalYearEnd" INTEGER NOT NULL DEFAULT 12,
    "email" TEXT NOT NULL,
    "googleCalendarId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "icon" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "taxDeductible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "categoryId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'unknown',
    "labeled" BOOLEAN NOT NULL DEFAULT false,
    "bankAccount" TEXT,
    "rawCsvData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientAddress" TEXT,
    "clientSIRET" TEXT,
    "clientTVA" TEXT,
    "items" TEXT NOT NULL,
    "subtotalHT" REAL NOT NULL,
    "tvaRate" REAL NOT NULL DEFAULT 20.0,
    "tvaAmount" REAL NOT NULL,
    "totalTTC" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "paidAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaxDeadline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "periodStart" DATETIME,
    "periodEnd" DATETIME,
    "amount" REAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" DATETIME,
    "calendarEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "receiptUrl" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "paymentMethod" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashFlowProjection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "projectedIncome" REAL NOT NULL DEFAULT 0,
    "projectedExpense" REAL NOT NULL DEFAULT 0,
    "taxPayment" REAL NOT NULL DEFAULT 0,
    "actualIncome" REAL NOT NULL DEFAULT 0,
    "actualExpense" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CashFlowProjection_month_year_key" ON "CashFlowProjection"("month", "year");
