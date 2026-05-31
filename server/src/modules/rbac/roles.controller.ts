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
} from '@nestjs/common';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/infrastructure/http/current-user.decorator';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @RequirePermissions('roles.read')
  list() {
    return this.service.list();
  }

  @Get(':id')
  @RequirePermissions('roles.read')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermissions('roles.create')
  create(@Body() dto: CreateRoleDto, @CurrentUser() current: CurrentUserPayload | undefined) {
    return this.service.create(dto, current);
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() current: CurrentUserPayload | undefined,
  ) {
    return this.service.update(id, dto, current);
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() current: CurrentUserPayload | undefined,
  ): Promise<void> {
    await this.service.softDelete(id, current);
  }
}
