import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { EstimatesModule } from './estimates/estimates.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { ItemCategoriesModule } from './item-categories/item-categories.module';
import { ItemsModule } from './items/items.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EstimatesModule,
    WorkOrdersModule,
    ItemCategoriesModule,
    ItemsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
