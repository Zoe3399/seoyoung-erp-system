import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemCategoryDto } from './dto/create-item-category.dto';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto';

@Injectable()
export class ItemCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive: boolean) {
    return this.prisma.itemCategory.findMany({
      ...(includeInactive ? {} : { where: { isActive: true } }),
      include: {
        parent: true,
        _count: { select: { children: true, items: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  create(dto: CreateItemCategoryDto) {
    return this.prisma.itemCategory.create({
      data: {
        name: dto.name,
        ...(dto.parentId ? { parentId: dto.parentId } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.memo ? { memo: dto.memo } : {}),
      },
    });
  }

  async update(id: string, dto: UpdateItemCategoryDto) {
    const exists = await this.prisma.itemCategory.findUnique({ where: { id } });

    if (!exists) {
      throw new NotFoundException('Item category not found');
    }

    return this.prisma.itemCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.memo !== undefined ? { memo: dto.memo } : {}),
      },
    });
  }
}
