import { Body, Controller, Get, Put } from '@nestjs/common';
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

  @Get('business')
  getBusiness(): Promise<BusinessInfo> {
    return this.settings.get();
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
