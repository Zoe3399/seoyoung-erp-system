import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { EstimatesService } from './estimates.service';

@Controller('estimates')
export class EstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Get()
  findAll() {
    return this.estimatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.estimatesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateEstimateDto) {
    return this.estimatesService.create(dto);
  }
}
