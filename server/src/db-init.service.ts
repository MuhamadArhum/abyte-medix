import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import * as mariadb from 'mariadb'

const TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS \`User\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`username\` VARCHAR(50) NOT NULL,
    \`passwordHash\` VARCHAR(255) NOT NULL,
    \`fullName\` VARCHAR(100) NOT NULL,
    \`role\` ENUM('ADMIN','MANAGER','CASHIER','INVENTORY_STAFF') NOT NULL,
    \`isActive\` BOOLEAN NOT NULL DEFAULT true,
    \`allowedTerminals\` TEXT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY \`User_username_key\` (\`username\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`UserPermission\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`userId\` INT NOT NULL,
    \`module\` VARCHAR(50) NOT NULL,
    \`action\` VARCHAR(50) NOT NULL,
    \`granted\` BOOLEAN NOT NULL DEFAULT true,
    UNIQUE KEY \`up_ukey\` (\`userId\`,\`module\`,\`action\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`RefreshToken\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`token\` VARCHAR(512) NOT NULL,
    \`userId\` INT NOT NULL,
    \`expiresAt\` DATETIME(3) NOT NULL,
    \`revoked\` BOOLEAN NOT NULL DEFAULT false,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY \`rt_token_key\` (\`token\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Category\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(100) NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY \`cat_name_key\` (\`name\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Manufacturer\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(150) NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY \`mfr_name_key\` (\`name\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Medicine\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`productCode\` VARCHAR(50) NULL,
    \`barcode\` VARCHAR(100) NULL,
    \`brandName\` VARCHAR(150) NOT NULL,
    \`genericName\` VARCHAR(150) NULL,
    \`strength\` VARCHAR(50) NULL,
    \`dosageForm\` VARCHAR(50) NULL,
    \`packSize\` VARCHAR(50) NULL,
    \`unit\` VARCHAR(30) NULL,
    \`taxRate\` DECIMAL(5,2) NOT NULL DEFAULT 0,
    \`reorderLevel\` INT NOT NULL DEFAULT 0,
    \`prescriptionRequired\` BOOLEAN NOT NULL DEFAULT false,
    \`isActive\` BOOLEAN NOT NULL DEFAULT true,
    \`categoryId\` INT NULL,
    \`manufacturerId\` INT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY \`med_pc_key\` (\`productCode\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Supplier\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(150) NOT NULL,
    \`contactPerson\` VARCHAR(100) NULL,
    \`phone\` VARCHAR(20) NULL,
    \`address\` TEXT NULL,
    \`payableBalance\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`isActive\` BOOLEAN NOT NULL DEFAULT true,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Batch\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`medicineId\` INT NOT NULL,
    \`batchNumber\` VARCHAR(100) NOT NULL,
    \`mfgDate\` DATETIME(3) NULL,
    \`expiryDate\` DATETIME(3) NOT NULL,
    \`purchaseRate\` DECIMAL(10,2) NOT NULL,
    \`saleRate\` DECIMAL(10,2) NOT NULL,
    \`quantity\` INT NOT NULL DEFAULT 0,
    \`freeQuantity\` INT NOT NULL DEFAULT 0,
    \`supplierId\` INT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Customer\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(150) NOT NULL,
    \`phone\` VARCHAR(20) NULL,
    \`address\` TEXT NULL,
    \`creditLimit\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`outstandingBalance\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`isActive\` BOOLEAN NOT NULL DEFAULT true,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Shift\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`openedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`closedAt\` DATETIME(3) NULL,
    \`openingBalance\` DECIMAL(12,2) NOT NULL DEFAULT 0,
    \`closingBalance\` DECIMAL(12,2) NULL,
    \`status\` ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
    \`notes\` TEXT NULL,
    \`openedById\` INT NOT NULL,
    \`closedById\` INT NULL,
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Sale\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`invoiceNumber\` VARCHAR(50) NOT NULL,
    \`customerId\` INT NULL,
    \`userId\` INT NOT NULL,
    \`shiftId\` INT NULL,
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
    UNIQUE KEY \`sale_inv_key\` (\`invoiceNumber\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`SaleItem\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`saleId\` INT NOT NULL,
    \`batchId\` INT NOT NULL,
    \`quantity\` INT NOT NULL,
    \`saleRate\` DECIMAL(10,2) NOT NULL,
    \`discount\` DECIMAL(5,2) NOT NULL DEFAULT 0,
    \`taxRate\` DECIMAL(5,2) NOT NULL DEFAULT 0,
    \`total\` DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`SaleReturn\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`saleId\` INT NOT NULL,
    \`customerId\` INT NULL,
    \`reason\` TEXT NOT NULL,
    \`refundAmount\` DECIMAL(12,2) NOT NULL,
    \`refundMethod\` VARCHAR(50) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`SaleReturnItem\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`saleReturnId\` INT NOT NULL,
    \`batchId\` INT NOT NULL,
    \`quantity\` INT NOT NULL,
    \`isDamaged\` BOOLEAN NOT NULL DEFAULT false,
    \`refundAmount\` DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Purchase\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`invoiceNumber\` VARCHAR(50) NOT NULL,
    \`supplierId\` INT NOT NULL,
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
    UNIQUE KEY \`pur_inv_key\` (\`invoiceNumber\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`PurchaseItem\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`purchaseId\` INT NOT NULL,
    \`batchId\` INT NOT NULL,
    \`quantity\` INT NOT NULL,
    \`freeQuantity\` INT NOT NULL DEFAULT 0,
    \`purchaseRate\` DECIMAL(10,2) NOT NULL,
    \`saleRate\` DECIMAL(10,2) NOT NULL,
    \`discount\` DECIMAL(5,2) NOT NULL DEFAULT 0,
    \`taxRate\` DECIMAL(5,2) NOT NULL DEFAULT 0,
    \`total\` DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`PurchaseReturn\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`purchaseId\` INT NOT NULL,
    \`supplierId\` INT NOT NULL,
    \`reason\` TEXT NOT NULL,
    \`totalAmount\` DECIMAL(12,2) NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`PurchaseReturnItem\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`purchaseReturnId\` INT NOT NULL,
    \`batchId\` INT NOT NULL,
    \`quantity\` INT NOT NULL,
    \`amount\` DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Payment\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`type\` ENUM('CUSTOMER_RECEIPT','SUPPLIER_PAYMENT','EXPENSE','INCOME') NOT NULL,
    \`amount\` DECIMAL(12,2) NOT NULL,
    \`method\` VARCHAR(50) NULL,
    \`reference\` VARCHAR(100) NULL,
    \`notes\` TEXT NULL,
    \`customerId\` INT NULL,
    \`supplierId\` INT NULL,
    \`saleId\` INT NULL,
    \`purchaseId\` INT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Expense\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`category\` VARCHAR(100) NOT NULL,
    \`description\` TEXT NULL,
    \`amount\` DECIMAL(12,2) NOT NULL,
    \`date\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Income\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`category\` VARCHAR(100) NOT NULL,
    \`description\` TEXT NULL,
    \`amount\` DECIMAL(12,2) NOT NULL,
    \`date\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`StockMovement\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`batchId\` INT NOT NULL,
    \`type\` ENUM('SALE','SALE_RETURN','PURCHASE','PURCHASE_RETURN','ADJUSTMENT_IN','ADJUSTMENT_OUT','DAMAGE','EXPIRY_WRITEOFF') NOT NULL,
    \`quantity\` INT NOT NULL,
    \`reason\` VARCHAR(255) NULL,
    \`referenceId\` INT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`AuditLog\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`userId\` INT NULL,
    \`module\` VARCHAR(50) NOT NULL,
    \`action\` VARCHAR(100) NOT NULL,
    \`recordId\` INT NULL,
    \`oldValue\` JSON NULL,
    \`newValue\` JSON NULL,
    \`terminalId\` VARCHAR(50) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Setting\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`key\` VARCHAR(100) NOT NULL,
    \`value\` TEXT NOT NULL,
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY \`set_key_key\` (\`key\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Backup\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`filename\` VARCHAR(255) NOT NULL,
    \`size\` BIGINT NULL,
    \`status\` VARCHAR(20) NOT NULL,
    \`location\` VARCHAR(500) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`License\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`licenseKey\` VARCHAR(500) NOT NULL,
    \`customerId\` VARCHAR(100) NULL,
    \`storeName\` VARCHAR(150) NOT NULL,
    \`plan\` VARCHAR(50) NOT NULL,
    \`maxPos\` INT NOT NULL DEFAULT 1,
    \`activationDate\` DATETIME(3) NULL,
    \`expiryDate\` DATETIME(3) NULL,
    \`features\` JSON NULL,
    \`status\` VARCHAR(20) NOT NULL,
    \`lastValidatedAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY \`lic_key_key\` (\`licenseKey\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
]

@Injectable()
export class DbInitService {
  async initDb(dbUrl: string) {
    const parsed = new URL(dbUrl)
    const host = parsed.hostname
    const port = parseInt(parsed.port || '3306')
    const user = parsed.username
    const password = parsed.password
    const database = parsed.pathname.replace('/', '')

    let conn: mariadb.Connection | null = null
    try {
      // Connect without a database first so we can create it if it doesn't exist
      conn = await mariadb.createConnection({ host, port, user, password, connectTimeout: 10000 })
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
      await conn.query(`USE \`${database}\``)

      for (const sql of TABLES) {
        try {
          await conn.query(sql)
        } catch (e: any) {
          console.warn('Table init warn:', e.message)
        }
      }

      // Create default admin if no users exist
      const rows = await conn.query('SELECT COUNT(*) as cnt FROM `User`')
      const count = Number(rows[0]?.cnt ?? 0)
      if (count === 0) {
        const hash = await bcrypt.hash('admin123', 12)
        await conn.query(
          'INSERT INTO `User` (username, fullName, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?,?,?,?,?,NOW(),NOW())',
          ['admin', 'Administrator', hash, 'ADMIN', 1],
        )
        console.log('✓ Default admin created — login: admin / admin123')
      }
    } catch (e: any) {
      console.error('DB init error:', e.message)
    } finally {
      if (conn) await conn.end()
    }
  }
}
