import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';

type ItemSearch = {
  categoryId?: string;
  includeInactive: boolean;
};

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search: ItemSearch) {
    return this.prisma.item.findMany({
      where: {
        ...(search.categoryId ? { categoryId: search.categoryId } : {}),
        ...(search.includeInactive ? {} : { isActive: true }),
      },
      include: { category: true },
      orderBy: [{ name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        inventoryLogs: { orderBy: { occurredAt: 'desc' }, take: 20 },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return item;
  }

  async create(dto: CreateItemDto) {
    const count = await this.prisma.item.count();
    const itemCode = dto.itemCode ?? `ITEM-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.item.create({
      data: {
        itemCode,
        name: dto.name,
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.itemType ? { itemType: dto.itemType } : {}),
        ...(dto.unit ? { unit: dto.unit } : {}),
        ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
        ...(dto.currentStock !== undefined ? { currentStock: dto.currentStock } : {}),
        ...(dto.minimumStock !== undefined ? { minimumStock: dto.minimumStock } : {}),
        ...(dto.memo ? { memo: dto.memo } : {}),
      },
    });
  }
}
