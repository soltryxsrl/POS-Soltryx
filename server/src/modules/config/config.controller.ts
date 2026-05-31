import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ActiveBranch } from '../../common/branch/active-branch.decorator';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/infrastructure/http/current-user.decorator';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import {
  BusinessSettingsService,
  type BusinessInfo,
} from './business-settings.service';
import { UpdateBusinessRequestDto } from './dto/update-business.request-dto';

@Controller('config')
export class ConfigController {
  constructor(private readonly settings: BusinessSettingsService) {}

  /** Configuración GLOBAL del negocio (la que edita la página de ajustes). */
  @Get('business')
  getBusiness(): Promise<BusinessInfo> {
    return this.settings.get();
  }

  /**
   * Datos del negocio para el ENCABEZADO del recibo. Por defecto la sucursal
   * activa, pero acepta `?branchId=<id>` para imprimir el recibo de la sucursal
   * DE LA VENTA (reimpresiones de admin de otra sucursal). Solo se honra el
   * `branchId` pedido si es la sucursal activa o si el usuario puede cambiar de
   * sucursal (`branches.switch`); si no, cae a la activa (sin fuga de datos).
   */
  @Get('business/receipt')
  getReceiptBusiness(
    @Query('branchId') requested: string | undefined,
    @ActiveBranch() active: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<BusinessInfo> {
    const canSwitch = (user.permissions ?? []).includes('branches.switch');
    const target = requested && (canSwitch || requested === active) ? requested : active;
    return this.settings.getForBranch(target);
  }

  @Put('business')
  @RequirePermissions('settings.update')
  updateBusiness(
    @Body() body: UpdateBusinessRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<BusinessInfo> {
    return this.settings.update({
      name: body.name,
      legalName: body.legalName,
      rnc: body.rnc,
      address: body.address,
      phone: body.phone,
      footerNote: body.footerNote,
      allowNegativeStock: body.allowNegativeStock,
      priceIncludesTax: body.priceIncludesTax,
      tipEnabled: body.tipEnabled,
      tipDefaultPct: body.tipDefaultPct,
      taxRegime: body.taxRegime,
      discountOverrideThresholdPct: body.discountOverrideThresholdPct,
      logoUrl: body.logoUrl,
      tagline: body.tagline,
      updatedById: user.id,
    });
  }
}
