import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';

type WorkOrderRange = {
  from?: string;
  to?: string;
};

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(range: WorkOrderRange) {
    const hasRange = Boolean(range.from || range.to);
    const where = hasRange
      ? {
          scheduledStart: {
            ...(range.from ? { gte: new Date(range.from) } : {}),
            ...(range.to ? { lte: new Date(range.to) } : {}),
          },
        }
      : undefined;

    return this.prisma.workOrder.findMany({
      ...(where ? { where } : {}),
      orderBy: { scheduledStart: 'asc' },
      include: { estimate: true, partner: true, vehicle: true },
    });
  }

  async findOne(id: string) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: { estimate: true, partner: true, vehicle: true },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    return workOrder;
  }

  async create(dto: CreateWorkOrderDto) {
    const count = await this.prisma.workOrder.count();
    const workOrderNo = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.workOrder.create({
      data: {
        workOrderNo,
        scheduledStart: new Date(dto.scheduledStart),
        workType: dto.workType,
        description: dto.description,
        ...(dto.scheduledEnd ? { scheduledEnd: new Date(dto.scheduledEnd) } : {}),
        ...(dto.estimateId ? { estimateId: dto.estimateId } : {}),
        ...(dto.partnerId ? { partnerId: dto.partnerId } : {}),
        ...(dto.vehicleId ? { vehicleId: dto.vehicleId } : {}),
        ...(dto.customerPhone ? { customerPhone: dto.customerPhone } : {}),
        ...(dto.memo ? { memo: dto.memo } : {}),
      },
    });
  }
}
