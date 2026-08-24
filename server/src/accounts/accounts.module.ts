import { Module } from '@nestjs/common'
import { AccountsService } from './accounts.service'
import { AccountsController } from './accounts.controller'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [AuditModule],
  providers: [AccountsService],
  controllers: [AccountsController],
  exports: [AccountsService],
})
export class AccountsModule {}
