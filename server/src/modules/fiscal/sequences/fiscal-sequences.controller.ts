import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '../../auth/infrastructure/http/permissions.decorator';
import { CreateFiscalSequenceRequestDto } from './dto/create-sequence.request-dto';
import { RenewFiscalSequenceRequestDto } from './dto/renew-sequence.request-dto';
import {
  FiscalSequenceExhaustedError,
  FiscalSequenceExpiredError,
  FiscalSequencesService,
} from './fiscal-sequences.service';

@Controller('fiscal/sequences')
export class FiscalSequencesController {
  constructor(private readonly service: FiscalSequencesService) {}

  @Get()
  @RequirePermissions('fiscal.sequences.read')
  list(
    @Query('docType') docType?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.list({
      docType,
      activeOnly: activeOnly === 'true',
    });
  }

  @Get(':id')
  @RequirePermissions('fiscal.sequences.read')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermissions('fiscal.sequences.manage')
  create(@Body() dto: CreateFiscalSequenceRequestDto) {
    return this.handle(() => this.service.create(dto));
  }

  /**
   * Renovar = crear una nueva secuencia para el tipo, desactivando la previa.
   * Conceptualmente "Actualización de Secuencias" en la UI.
   */
  @Post(':docType/renew')
  @RequirePermissions('fiscal.sequences.manage')
  renew(
    @Param('docType') docType: string,
    @Body() dto: RenewFiscalSequenceRequestDto,
  ) {
    return this.handle(() => this.service.renew(docType, dto));
  }

  private async handle<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof FiscalSequenceExhaustedError) throw new ConflictException(e.message);
      if (e instanceof FiscalSequenceExpiredError) throw new ConflictException(e.message);
      if (e instanceof NotFoundException || e instanceof BadRequestException) throw e;
      throw e;
    }
  }
}
