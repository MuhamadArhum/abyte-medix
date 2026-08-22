import { Module } from '@nestjs/common'
import { MedicinesService } from './medicines.service'
import { MedicinesController } from './medicines.controller'
import { CategoriesController } from './categories.controller'
import { ManufacturersController } from './manufacturers.controller'

@Module({
  providers: [MedicinesService],
  controllers: [MedicinesController, CategoriesController, ManufacturersController],
  exports: [MedicinesService],
})
export class MedicinesModule {}
