import { IsBooleanString, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationSortQuery } from '../../../common/dto/pagination-sort.query';

export class ListUsersQuery extends PaginationSortQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: 'true' | 'false';

  @IsOptional()
  @IsUUID()
  roleId?: string;
}
