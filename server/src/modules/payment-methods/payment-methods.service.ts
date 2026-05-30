import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodOrmEntity } from './payment-method.orm-entity';

export interface PaymentMethodResponse {
  code: string;
  name: string;
  requiresReference: boolean;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePaymentMethodInput {
  name?: string;
  requiresReference?: boolean;
  isActive?: boolean;
}

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethodOrmEntity)
    private readonly repo: Repository<PaymentMethodOrmEntity>,
  ) {}

  async list(activeOnly?: boolean): Promise<PaymentMethodResponse[]> {
    const qb = this.repo
      .createQueryBuilder('m')
      .orderBy('m.sortOrder', 'ASC')
      .addOrderBy('m.code', 'ASC');
    if (activeOnly) qb.andWhere('m.isActive = true');
    const rows = await qb.getMany();
    return rows.map(toResponse);
  }

  async update(
    code: string,
    input: UpdatePaymentMethodInput,
  ): Promise<PaymentMethodResponse> {
    const row = await this.repo.findOne({ where: { code } });
    if (!row) throw new NotFoundException(`Forma de pago ${code} no existe`);
    if (input.isActive === false && row.isDefault) {
      throw new ConflictException(
        'No se puede desactivar la forma de pago por defecto. Marca otra como default primero.',
      );
    }
    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (!trimmed) throw new ConflictException('El nombre no puede estar vacío');
      row.name = trimmed;
    }
    if (input.requiresReference !== undefined) {
      row.requiresReference = input.requiresReference;
    }
    if (input.isActive !== undefined) row.isActive = input.isActive;
    const saved = await this.repo.save(row);
    return toResponse(saved);
  }

  /** Marca una forma como default (y limpia la anterior). Queda activa. */
  async setDefault(code: string): Promise<PaymentMethodResponse> {
    return this.repo.manager.transaction(async (m) => {
      const row = await m.findOne(PaymentMethodOrmEntity, { where: { code } });
      if (!row) throw new NotFoundException(`Forma de pago ${code} no existe`);
      await m.update(
        PaymentMethodOrmEntity,
        { isDefault: true },
        { isDefault: false },
      );
      row.isDefault = true;
      row.isActive = true;
      const saved = await m.save(row);
      return toResponse(saved);
    });
  }
}

function toResponse(e: PaymentMethodOrmEntity): PaymentMethodResponse {
  return {
    code: e.code,
    name: e.name,
    requiresReference: e.requiresReference,
    isActive: e.isActive,
    isDefault: e.isDefault,
    sortOrder: e.sortOrder,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
