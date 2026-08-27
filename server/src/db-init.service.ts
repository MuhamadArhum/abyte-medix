import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from './prisma/prisma.service'

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS \`User\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`username\` VARCHAR(50) NOT NULL,
    \`passwordHash\` VARCHAR(255) NOT NULL,
    \`fullName\` VARCHAR(100) NOT NULL,
    \`role\` ENUM('ADMIN','MANAGER','CASHIER','INVENTORY_STAFF') NOT NULL,
    \`isActive\` BOOLEAN NOT NULL DEFAULT true,
    \`allowedTerminals\` TEXT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX \`User_username_key\`(\`username\`),
    INDEX \`User_username_idx\`(\`username\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`UserPermission\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`userId\` INTEGER NOT NULL,
    \`module\` VARCHAR(50) NOT NULL,
    \`action\` VARCHAR(50) NOT NULL,
    \`granted\` BOOLEAN NOT NULL DEFAULT true,
    INDEX \`UserPermission_userId_idx\`(\`userId\`),
    UNIQUE INDEX \`UserPermission_userId_module_action_key\`(\`userId\`, \`module\`, \`action\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`RefreshToken\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`token\` VARCHAR(512) NOT NULL,
    \`userId\` INTEGER NOT NULL,
    \`expiresAt\` DATETIME(3) NOT NULL,
    \`revoked\` BOOLEAN NOT NULL DEFAULT false,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX \`RefreshToken_token_key\`(\`token\`),
    INDEX \`RefreshToken_userId_idx\`(\`userId\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Category\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(100) NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX \`Category_name_key\`(\`name\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Manufacturer\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(150) NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX \`Manufacturer_name_key\`(\`name\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Medicine\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`productCode\` VARCHAR(50) NULL,
    \`barcode\` VARCHAR(100) NULL,
    \`brandName\` VARCHAR(150) NOT NULL,
    \`genericName\` VARCHAR(150) NULL,
    \`strength\` VARCHAR(50) NULL,
    \`dosageForm\` VARCHAR(50) NULL,
    \`packSize\` VARCHAR(50) NULL,
    \`unit\` VARCHAR(30) NULL,
    \`taxRate\` DECIMAL(5,2) NOT NULL DEFAULT 0,
    \`reorderLevel\` INTEGER NOT NULL DEFAULT 0,
    \`prescriptionRequired\` BOOLEAN NOT NULL DEFAULT false,
    \`isActive\` BOOLEAN NOT NULL DEFAULT true,
    \`categoryId\` INTEGER NULL,
    \`manufacturerId\` INTEGER NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX \`Medicine_productCode_key\`(\`productCode\`),
    INDEX \`Medicine_barcode_idx\`(\`barcode\`),
    INDEX \`Medicine_brandName_idx\`(\`brandName\`),
    INDEX \`Medicine_genericName_idx\`(\`genericName\`),
    INDEX \`Medicine_productCode_idx\`(\`productCode\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Supplier\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(150) NOT NULL,
    \`contactPerson\` VARCHAR(100) NULL,
    \`phone\` VARCHAR(20) NULL,
    \`address\` TEXT NULL,
    \`payableBalance\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`isActive\` BOOLEAN NOT NULL DEFAULT true,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX \`Supplier_name_idx\`(\`name\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Batch\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`medicineId\` INTEGER NOT NULL,
    \`batchNumber\` VARCHAR(100) NOT NULL,
    \`mfgDate\` DATETIME(3) NULL,
    \`expiryDate\` DATETIME(3) NOT NULL,
    \`purchaseRate\` DECIMAL(10,2) NOT NULL,
    \`saleRate\` DECIMAL(10,2) NOT NULL,
    \`quantity\` INTEGER NOT NULL DEFAULT 0,
    \`freeQuantity\` INTEGER NOT NULL DEFAULT 0,
    \`supplierId\` INTEGER NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX \`Batch_medicineId_idx\`(\`medicineId\`),
    INDEX \`Batch_expiryDate_idx\`(\`expiryDate\`),
    INDEX \`Batch_batchNumber_idx\`(\`batchNumber\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Customer\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(150) NOT NULL,
    \`phone\` VARCHAR(20) NULL,
    \`address\` TEXT NULL,
    \`creditLimit\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`outstandingBalance\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`isActive\` BOOLEAN NOT NULL DEFAULT true,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX \`Customer_name_idx\`(\`name\`),
    INDEX \`Customer_phone_idx\`(\`phone\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Shift\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`openedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`closedAt\` DATETIME(3) NULL,
    \`openingBalance\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`closingBalance\` DECIMAL(12,2) NULL,
    \`status\` VARCHAR(10) NOT NULL DEFAULT 'OPEN',
    \`notes\` TEXT NULL,
    \`openedById\` INTEGER NOT NULL,
    \`closedById\` INTEGER NULL,
    INDEX \`Shift_status_idx\`(\`status\`),
    INDEX \`Shift_openedAt_idx\`(\`openedAt\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Sale\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`invoiceNumber\` VARCHAR(50) NOT NULL,
    \`customerId\` INTEGER NULL,
    \`userId\` INTEGER NOT NULL,
    \`shiftId\` INTEGER NULL,
    \`terminalId\` VARCHAR(50) NULL,
    \`status\` ENUM('DRAFT','COMPLETED','CANCELLED') NOT NULL DEFAULT 'COMPLETED',
    \`subtotal\` DECIMAL(12,2) NOT NULL,
    \`discountAmount\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`taxAmount\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`total\` DECIMAL(12,2) NOT NULL,
    \`amountPaid\` DECIMAL(12,2) NOT NULL,
    \`changeAmount\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`paymentMethod\` ENUM('CASH','CARD','CREDIT','SPLIT') NOT NULL DEFAULT 'CASH',
    \`notes\` TEXT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX \`Sale_invoiceNumber_key\`(\`invoiceNumber\`),
    INDEX \`Sale_invoiceNumber_idx\`(\`invoiceNumber\`),
    INDEX \`Sale_customerId_idx\`(\`customerId\`),
    INDEX \`Sale_createdAt_idx\`(\`createdAt\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`SaleItem\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`saleId\` INTEGER NOT NULL,
    \`batchId\` INTEGER NOT NULL,
    \`quantity\` INTEGER NOT NULL,
    \`saleRate\` DECIMAL(10,2) NOT NULL,
    \`discount\` DECIMAL(5,2) NOT NULL DEFAULT 0,
    \`taxRate\` DECIMAL(5,2) NOT NULL DEFAULT 0,
    \`total\` DECIMAL(12,2) NOT NULL,
    INDEX \`SaleItem_saleId_idx\`(\`saleId\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`SaleReturn\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`saleId\` INTEGER NOT NULL,
    \`customerId\` INTEGER NULL,
    \`reason\` TEXT NOT NULL,
    \`refundAmount\` DECIMAL(12,2) NOT NULL,
    \`refundMethod\` VARCHAR(50) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`SaleReturn_saleId_idx\`(\`saleId\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`SaleReturnItem\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`saleReturnId\` INTEGER NOT NULL,
    \`batchId\` INTEGER NOT NULL,
    \`quantity\` INTEGER NOT NULL,
    \`isDamaged\` BOOLEAN NOT NULL DEFAULT false,
    \`refundAmount\` DECIMAL(12,2) NOT NULL,
    INDEX \`SaleReturnItem_saleReturnId_idx\`(\`saleReturnId\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Purchase\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`invoiceNumber\` VARCHAR(50) NOT NULL,
    \`supplierId\` INTEGER NOT NULL,
    \`status\` ENUM('DRAFT','RECEIVED','PARTIAL') NOT NULL DEFAULT 'RECEIVED',
    \`subtotal\` DECIMAL(12,2) NOT NULL,
    \`discountAmount\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`taxAmount\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`total\` DECIMAL(12,2) NOT NULL,
    \`amountPaid\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`notes\` TEXT NULL,
    \`purchaseDate\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX \`Purchase_invoiceNumber_key\`(\`invoiceNumber\`),
    INDEX \`Purchase_supplierId_idx\`(\`supplierId\`),
    INDEX \`Purchase_purchaseDate_idx\`(\`purchaseDate\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`PurchaseItem\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`purchaseId\` INTEGER NOT NULL,
    \`batchId\` INTEGER NOT NULL,
    \`quantity\` INTEGER NOT NULL,
    \`freeQuantity\` INTEGER NOT NULL DEFAULT 0,
    \`purchaseRate\` DECIMAL(10,2) NOT NULL,
    \`saleRate\` DECIMAL(10,2) NOT NULL,
    \`discount\` DECIMAL(5,2) NOT NULL DEFAULT 0,
    \`taxRate\` DECIMAL(5,2) NOT NULL DEFAULT 0,
    \`total\` DECIMAL(12,2) NOT NULL,
    INDEX \`PurchaseItem_purchaseId_idx\`(\`purchaseId\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`PurchaseReturn\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`purchaseId\` INTEGER NOT NULL,
    \`supplierId\` INTEGER NOT NULL,
    \`reason\` TEXT NOT NULL,
    \`totalAmount\` DECIMAL(12,2) NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`PurchaseReturn_purchaseId_idx\`(\`purchaseId\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`PurchaseReturnItem\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`purchaseReturnId\` INTEGER NOT NULL,
    \`batchId\` INTEGER NOT NULL,
    \`quantity\` INTEGER NOT NULL,
    \`amount\` DECIMAL(12,2) NOT NULL,
    INDEX \`PurchaseReturnItem_purchaseReturnId_idx\`(\`purchaseReturnId\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Payment\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`type\` ENUM('CUSTOMER_RECEIPT','SUPPLIER_PAYMENT','EXPENSE','INCOME') NOT NULL,
    \`amount\` DECIMAL(12,2) NOT NULL,
    \`method\` VARCHAR(50) NULL,
    \`reference\` VARCHAR(100) NULL,
    \`notes\` TEXT NULL,
    \`customerId\` INTEGER NULL,
    \`supplierId\` INTEGER NULL,
    \`saleId\` INTEGER NULL,
    \`purchaseId\` INTEGER NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`Payment_customerId_idx\`(\`customerId\`),
    INDEX \`Payment_supplierId_idx\`(\`supplierId\`),
    INDEX \`Payment_createdAt_idx\`(\`createdAt\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Expense\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`category\` VARCHAR(100) NOT NULL,
    \`description\` TEXT NULL,
    \`amount\` DECIMAL(12,2) NOT NULL,
    \`date\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`Expense_date_idx\`(\`date\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Income\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`category\` VARCHAR(100) NOT NULL,
    \`description\` TEXT NULL,
    \`amount\` DECIMAL(12,2) NOT NULL,
    \`date\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`Income_date_idx\`(\`date\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`StockMovement\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`batchId\` INTEGER NOT NULL,
    \`type\` ENUM('SALE','SALE_RETURN','PURCHASE','PURCHASE_RETURN','ADJUSTMENT_IN','ADJUSTMENT_OUT','DAMAGE','EXPIRY_WRITEOFF') NOT NULL,
    \`quantity\` INTEGER NOT NULL,
    \`reason\` VARCHAR(255) NULL,
    \`referenceId\` INTEGER NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`StockMovement_batchId_idx\`(\`batchId\`),
    INDEX \`StockMovement_createdAt_idx\`(\`createdAt\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`AuditLog\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`userId\` INTEGER NULL,
    \`module\` VARCHAR(50) NOT NULL,
    \`action\` VARCHAR(100) NOT NULL,
    \`recordId\` INTEGER NULL,
    \`oldValue\` JSON NULL,
    \`newValue\` JSON NULL,
    \`terminalId\` VARCHAR(50) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`AuditLog_userId_idx\`(\`userId\`),
    INDEX \`AuditLog_module_idx\`(\`module\`),
    INDEX \`AuditLog_createdAt_idx\`(\`createdAt\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Setting\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`key\` VARCHAR(100) NOT NULL,
    \`value\` TEXT NOT NULL,
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX \`Setting_key_key\`(\`key\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Backup\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`filename\` VARCHAR(255) NOT NULL,
    \`size\` BIGINT NULL,
    \`status\` VARCHAR(20) NOT NULL,
    \`location\` VARCHAR(500) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`License\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`licenseKey\` VARCHAR(500) NOT NULL,
    \`customerId\` VARCHAR(100) NULL,
    \`storeName\` VARCHAR(150) NOT NULL,
    \`plan\` VARCHAR(50) NOT NULL,
    \`maxPos\` INTEGER NOT NULL DEFAULT 1,
    \`activationDate\` DATETIME(3) NULL,
    \`expiryDate\` DATETIME(3) NULL,
    \`features\` JSON NULL,
    \`status\` VARCHAR(20) NOT NULL,
    \`lastValidatedAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX \`License_licenseKey_key\`(\`licenseKey\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`

@Injectable()
export class DbInitService {
  constructor(private readonly prisma: PrismaService) {}

  async initDb() {
    // Run each CREATE TABLE IF NOT EXISTS statement
    const statements = MIGRATION_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 10)

    for (const sql of statements) {
      try {
        await this.prisma.$executeRawUnsafe(sql)
      } catch (e: any) {
        // Ignore duplicate index errors, log others
        if (!e.message?.includes('Duplicate key name') && !e.message?.includes('already exists')) {
          console.warn('DB init warning:', e.message)
        }
      }
    }

    // Add foreign keys separately — ignore errors if already exist
    const fkeys = [
      `ALTER TABLE \`UserPermission\` ADD CONSTRAINT \`UserPermission_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE \`RefreshToken\` ADD CONSTRAINT \`RefreshToken_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE \`Medicine\` ADD CONSTRAINT \`Medicine_categoryId_fkey\` FOREIGN KEY (\`categoryId\`) REFERENCES \`Category\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE \`Medicine\` ADD CONSTRAINT \`Medicine_manufacturerId_fkey\` FOREIGN KEY (\`manufacturerId\`) REFERENCES \`Manufacturer\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE \`Batch\` ADD CONSTRAINT \`Batch_medicineId_fkey\` FOREIGN KEY (\`medicineId\`) REFERENCES \`Medicine\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE \`Batch\` ADD CONSTRAINT \`Batch_supplierId_fkey\` FOREIGN KEY (\`supplierId\`) REFERENCES \`Supplier\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE \`Sale\` ADD CONSTRAINT \`Sale_customerId_fkey\` FOREIGN KEY (\`customerId\`) REFERENCES \`Customer\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE \`Sale\` ADD CONSTRAINT \`Sale_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE \`Sale\` ADD CONSTRAINT \`Sale_shiftId_fkey\` FOREIGN KEY (\`shiftId\`) REFERENCES \`Shift\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE \`Shift\` ADD CONSTRAINT \`Shift_openedById_fkey\` FOREIGN KEY (\`openedById\`) REFERENCES \`User\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE \`Shift\` ADD CONSTRAINT \`Shift_closedById_fkey\` FOREIGN KEY (\`closedById\`) REFERENCES \`User\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE \`SaleItem\` ADD CONSTRAINT \`SaleItem_saleId_fkey\` FOREIGN KEY (\`saleId\`) REFERENCES \`Sale\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE \`SaleItem\` ADD CONSTRAINT \`SaleItem_batchId_fkey\` FOREIGN KEY (\`batchId\`) REFERENCES \`Batch\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE \`StockMovement\` ADD CONSTRAINT \`StockMovement_batchId_fkey\` FOREIGN KEY (\`batchId\`) REFERENCES \`Batch\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE \`AuditLog\` ADD CONSTRAINT \`AuditLog_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
    ]

    for (const fk of fkeys) {
      try {
        await this.prisma.$executeRawUnsafe(fk)
      } catch { /* already exists — ignore */ }
    }

    // Create default admin if no users exist
    try {
      const count = await this.prisma.user.count()
      if (count === 0) {
        const hash = await bcrypt.hash('admin123', 12)
        await this.prisma.user.create({
          data: {
            username: 'admin',
            fullName: 'Administrator',
            passwordHash: hash,
            role: 'ADMIN',
            isActive: true,
          },
        })
        console.log('✓ Default admin created — username: admin, password: admin123')
      }
    } catch (e) {
      console.error('Admin seed failed:', e)
    }
  }
}
