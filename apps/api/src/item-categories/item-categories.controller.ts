import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateItemCategoryDto } from './dto/create-item-category.dto';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto';
import { ItemCategoriesService } from './item-categories.service';

@Controller('item-categories')
export class ItemCategoriesController {
  constructor(private readonly itemCategoriesService: ItemCategoriesService) {}

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.itemCategoriesService.findAll(includeInactive === 'true');
  }

  @Post()
  create(@Body() dto: CreateItemCategoryDto) {
    return this.itemCategoriesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateItemCategoryDto) {
    return this.itemCategoriesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.itemCategoriesService.update(id, { isActive: false });
  }
}
