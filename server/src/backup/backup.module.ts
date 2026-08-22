import { Module } from '@nestjs/common'
import { BackupService } from './backup.service'
import { BackupController } from './backup.controller'
import { SettingsModule } from '../settings/settings.module'

@Module({
  imports: [SettingsModule],
  providers: [BackupService],
  controllers: [BackupController],
})
export class BackupModule {}
