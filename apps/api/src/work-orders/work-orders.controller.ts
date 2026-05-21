import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { WorkOrdersService } from './work-orders.service';

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get()
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.workOrdersService.findAll({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workOrdersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateWorkOrderDto) {
    return this.workOrdersService.create(dto);
  }
}
