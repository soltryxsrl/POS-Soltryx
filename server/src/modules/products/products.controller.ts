import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/infrastructure/http/current-user.decorator';
import { Roles } from '../auth/infrastructure/http/roles.decorator';
import { AddBarcodeRequestDto } from './dto/add-barcode.request-dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { ListProductsQuery } from './dto/list-products.query';
import { SetKitComponentsDto } from './dto/set-kit-components.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  list(@Query() q: ListProductsQuery) {
    return this.service.list(q);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Body() dto: CreateProductDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.softDelete(id);
  }

  // --- Barcodes (múltiples por producto) ---

  @Get(':id/barcodes')
  listBarcodes(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listBarcodes(id);
  }

  @Post(':id/barcodes')
  @Roles('ADMIN', 'MANAGER')
  addBarcode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddBarcodeRequestDto,
  ) {
    return this.service.addBarcode(id, dto.barcode, dto.isPrimary ?? false);
  }

  @Patch(':id/barcodes/:barcodeId/primary')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setPrimary(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('barcodeId', ParseUUIDPipe) barcodeId: string,
  ): Promise<void> {
    await this.service.setPrimaryBarcode(id, barcodeId);
  }

  @Delete(':id/barcodes/:barcodeId')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeBarcode(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('barcodeId', ParseUUIDPipe) barcodeId: string,
  ): Promise<void> {
    await this.service.removeBarcode(id, barcodeId);
  }

  // --- Kits / Combos ---

  @Get(':id/kit-components')
  listKitComponents(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listKitComponents(id);
  }

  @Post(':id/kit-components')
  @Roles('ADMIN', 'MANAGER')
  setKitComponents(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetKitComponentsDto,
  ) {
    return this.service.setKitComponents(id, dto);
  }

  // --- Variants ---

  @Get(':id/variants')
  listVariants(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listVariants(id);
  }

  @Post(':id/variants')
  @Roles('ADMIN', 'MANAGER')
  createVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.createVariant(id, dto, user.id);
  }

  @Patch(':id/variants/:variantId')
  @Roles('ADMIN', 'MANAGER')
  updateVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.service.updateVariant(id, variantId, dto);
  }

  @Delete(':id/variants/:variantId')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ): Promise<void> {
    await this.service.deleteVariant(id, variantId);
  }
}
