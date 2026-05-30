import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashSessionStatus } from '../cash-sessions/domain/value-objects/cash-session-status';
import { CashSessionOrmEntity } from '../cash-sessions/infrastructure/persistence/typeorm/cash-session.orm-entity';
import {
  ParkedCartOrmEntity,
  type ParkedCartPayload,
} from './parked-cart.orm-entity';

export interface CreateParkedCartInput {
  userId: string;
  cashSessionId: string;
  customerId?: string | null;
  label?: string | null;
  notes?: string | null;
  payload: ParkedCartPayload;
}

export interface ParkedCartResponse {
  id: string;
  userId: string;
  cashSessionId: string;
  customerId: string | null;
  label: string | null;
  notes: string | null;
  payload: ParkedCartPayload;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ParkedCartsService {
  constructor(
    @InjectRepository(ParkedCartOrmEntity)
    private readonly repo: Repository<ParkedCartOrmEntity>,
    @InjectRepository(CashSessionOrmEntity)
    private readonly sessions: Repository<CashSessionOrmEntity>,
  ) {}

  async create(input: CreateParkedCartInput): Promise<ParkedCartResponse> {
    const session = await this.sessions.findOne({ where: { id: input.cashSessionId } });
    if (!session) throw new NotFoundException(`Sesión de caja ${input.cashSessionId} no encontrada`);
    if (session.status !== CashSessionStatus.OPEN) {
      throw new ConflictException(`La sesión ${session.id} no está abierta`);
    }
    if (!input.payload.items || input.payload.items.length === 0) {
      throw new ConflictException('El carrito está vacío');
    }

    const entity = this.repo.create({
      userId: input.userId,
      cashSessionId: session.id,
      customerId: input.customerId ?? null,
      label: input.label?.trim() || null,
      notes: input.notes?.trim() || null,
      payload: input.payload,
    });
    const saved = await this.repo.save(entity);
    return toResponse(saved);
  }

  /** Lista los carritos en espera del cajero actual para la sesión activa. */
  async listForUserSession(
    userId: string,
    cashSessionId: string,
  ): Promise<ParkedCartResponse[]> {
    const rows = await this.repo.find({
      where: { userId, cashSessionId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(toResponse);
  }

  async findById(id: string): Promise<ParkedCartResponse> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Carrito ${id} no encontrado`);
    return toResponse(row);
  }

  async delete(id: string, requestingUserId: string, isPriv: boolean): Promise<void> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Carrito ${id} no encontrado`);
    if (!isPriv && row.userId !== requestingUserId) {
      throw new ConflictException('No puedes eliminar un carrito de otro usuario');
    }
    await this.repo.delete({ id });
  }
}

function toResponse(e: ParkedCartOrmEntity): ParkedCartResponse {
  return {
    id: e.id,
    userId: e.userId,
    cashSessionId: e.cashSessionId,
    customerId: e.customerId,
    label: e.label,
    notes: e.notes,
    payload: e.payload,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
