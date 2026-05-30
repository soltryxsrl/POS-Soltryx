import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrencyOrmEntity } from './currency.orm-entity';
import { ExchangeRateOrmEntity } from './exchange-rate.orm-entity';

export interface CurrencyResponse {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  isActive: boolean;
  isBase: boolean;
  /** Tasa a la base. Null si esta moneda ES la base. */
  rateToBase: string | null;
  rateUpdatedAt: string | null;
}

@Injectable()
export class CurrenciesService {
  constructor(
    @InjectRepository(CurrencyOrmEntity)
    private readonly currencies: Repository<CurrencyOrmEntity>,
    @InjectRepository(ExchangeRateOrmEntity)
    private readonly rates: Repository<ExchangeRateOrmEntity>,
  ) {}

  async list(activeOnly?: boolean): Promise<CurrencyResponse[]> {
    const qb = this.currencies
      .createQueryBuilder('c')
      .orderBy('c.isBase', 'DESC')
      .addOrderBy('c.code', 'ASC');
    if (activeOnly) qb.andWhere('c.isActive = true');
    const rows = await qb.getMany();
    const rates = await this.rates.find();
    const rateMap = new Map(rates.map((r) => [r.currencyCode, r]));
    return rows.map((c) => {
      const r = rateMap.get(c.code);
      return {
        code: c.code,
        name: c.name,
        symbol: c.symbol,
        decimals: c.decimals,
        isActive: c.isActive,
        isBase: c.isBase,
        rateToBase: c.isBase ? '1.000000' : (r?.rateToBase ?? null),
        rateUpdatedAt: r?.updatedAt.toISOString() ?? null,
      };
    });
  }

  async getBase(): Promise<CurrencyOrmEntity> {
    const base = await this.currencies.findOne({ where: { isBase: true } });
    if (!base) {
      throw new ConflictException('No hay moneda base configurada');
    }
    return base;
  }

  async setActive(code: string, isActive: boolean): Promise<CurrencyResponse> {
    const cur = await this.currencies.findOne({ where: { code } });
    if (!cur) throw new NotFoundException(`Moneda ${code} no existe`);
    if (cur.isBase && !isActive) {
      throw new ConflictException('No se puede desactivar la moneda base');
    }
    if (!isActive) {
      // Validar que no haya tasa para una moneda que se está apagando — está bien.
    } else if (!cur.isBase) {
      const rate = await this.rates.findOne({ where: { currencyCode: code } });
      if (!rate) {
        throw new ConflictException(
          `Antes de activar ${code} configura su tasa de cambio.`,
        );
      }
    }
    cur.isActive = isActive;
    const saved = await this.currencies.save(cur);
    return (await this.list()).find((c) => c.code === saved.code)!;
  }

  async setRate(
    code: string,
    rate: string,
    userId: string | null,
  ): Promise<CurrencyResponse> {
    const cur = await this.currencies.findOne({ where: { code } });
    if (!cur) throw new NotFoundException(`Moneda ${code} no existe`);
    if (cur.isBase) {
      throw new ConflictException('No se puede setear tasa de la moneda base (siempre 1)');
    }
    if (!/^\d+(\.\d{1,6})?$/.test(rate) || parseFloat(rate) <= 0) {
      throw new ConflictException(`Tasa inválida: ${rate}`);
    }
    await this.rates.upsert(
      { currencyCode: code, rateToBase: rate, updatedById: userId },
      ['currencyCode'],
    );
    return (await this.list()).find((c) => c.code === code)!;
  }

  /**
   * Convierte un monto en `fromCode` a la moneda base usando la tasa actual.
   * Retorna { baseAmount, rateUsed }. Throws si la moneda no existe o no tiene tasa.
   */
  async convertToBase(fromCode: string, amount: string): Promise<{
    baseAmount: string;
    rateUsed: string;
  }> {
    if (fromCode === (await this.getBase()).code) {
      return { baseAmount: amount, rateUsed: '1.000000' };
    }
    const rate = await this.rates.findOne({ where: { currencyCode: fromCode } });
    if (!rate) {
      throw new ConflictException(`Moneda ${fromCode} no tiene tasa configurada`);
    }
    const cents = Math.round(parseFloat(amount) * parseFloat(rate.rateToBase) * 100);
    const baseAmount = `${Math.trunc(cents / 100)}.${(cents % 100).toString().padStart(2, '0')}`;
    return { baseAmount, rateUsed: rate.rateToBase };
  }
}
