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
import { ActiveBranch } from '../../../common/branch/active-branch.decorator';
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
    @ActiveBranch() branchId: string,
    @Query('docType') docType?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.list({
      docType,
      activeOnly: activeOnly === 'true',
      branchId,
    });
  }

  @Get(':id')
  @RequirePermissions('fiscal.sequences.read')
  findById(@Param('id', ParseUUIDPipe) id: string, @ActiveBranch() branchId: string) {
    return this.service.findById(id, branchId);
  }

  @Post()
  @RequirePermissions('fiscal.sequences.manage')
  create(@Body() dto: CreateFiscalSequenceRequestDto, @ActiveBranch() branchId: string) {
    return this.handle(() => this.service.create(dto, branchId));
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
    @ActiveBranch() branchId: string,
  ) {
    return this.handle(() => this.service.renew(docType, dto, branchId));
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
