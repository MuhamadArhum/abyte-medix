import { Module } from '@nestjs/common'
import { PurchasesService } from './purchases.service'
import { PurchasesController } from './purchases.controller'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [AuditModule],
  providers: [PurchasesService],
  controllers: [PurchasesController],
  exports: [PurchasesService],
})
export class PurchasesModule {}
