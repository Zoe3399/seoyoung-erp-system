import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEstimateDto } from './dto/create-estimate.dto';

@Injectable()
export class EstimatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.estimate.findMany({
      orderBy: { requestedDate: 'desc' },
      include: { partner: true, vehicle: true, workOrder: true },
    });
  }

  async findOne(id: string) {
    const estimate = await this.prisma.estimate.findUnique({
      where: { id },
      include: { partner: true, vehicle: true, workOrder: true },
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found');
    }

    return estimate;
  }

  async create(dto: CreateEstimateDto) {
    const count = await this.prisma.estimate.count();
    const estimateNo = `EST-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.estimate.create({
      data: {
        estimateNo,
        requestedDate: new Date(dto.requestedDate),
        workType: dto.workType,
        description: dto.description,
        ...(dto.estimatorName ? { estimatorName: dto.estimatorName } : {}),
        ...(dto.partnerId ? { partnerId: dto.partnerId } : {}),
        ...(dto.vehicleId ? { vehicleId: dto.vehicleId } : {}),
        ...(dto.customerPhone ? { customerPhone: dto.customerPhone } : {}),
        ...(dto.memo ? { memo: dto.memo } : {}),
      },
    });
  }
}
