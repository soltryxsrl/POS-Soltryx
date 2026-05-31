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
import { ActiveBranch } from '../../common/branch/active-branch.decorator';
import { Roles } from '../auth/infrastructure/http/roles.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesQuery } from './dto/list-categories.query';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  list(@Query() q: ListCategoriesQuery, @ActiveBranch() branchId: string) {
    return this.service.list(q, branchId);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string, @ActiveBranch() branchId: string) {
    return this.service.findById(id, branchId);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Body() dto: CreateCategoryDto, @ActiveBranch() branchId: string) {
    return this.service.create(dto, branchId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.update(id, dto, branchId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveBranch() branchId: string,
  ): Promise<void> {
    await this.service.softDelete(id, branchId);
  }
}
