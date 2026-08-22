import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { MedicinesModule } from './medicines/medicines.module'
import { SalesModule } from './sales/sales.module'
import { CustomersModule } from './customers/customers.module'
import { SuppliersModule } from './suppliers/suppliers.module'
import { PurchasesModule } from './purchases/purchases.module'
import { InventoryModule } from './inventory/inventory.module'
import { AccountsModule } from './accounts/accounts.module'
import { ReportsModule } from './reports/reports.module'
import { AuditModule } from './audit/audit.module'
import { SettingsModule } from './settings/settings.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { BackupModule } from './backup/backup.module'
import { LicenseModule } from './license/license.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    MedicinesModule,
    SalesModule,
    CustomersModule,
    SuppliersModule,
    PurchasesModule,
    InventoryModule,
    AccountsModule,
    ReportsModule,
    AuditModule,
    SettingsModule,
    DashboardModule,
    BackupModule,
    LicenseModule,
  ],
})
export class AppModule {}
