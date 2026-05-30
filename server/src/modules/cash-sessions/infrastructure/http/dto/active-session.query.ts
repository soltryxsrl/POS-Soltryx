import { IsOptional, IsUUID } from 'class-validator';

export class ActiveSessionQuery {
  @IsOptional()
  @IsUUID()
  cashRegisterId?: string;

  /** Si es 'true', busca la sesión activa del usuario actual (ignora cashRegisterId). */
  @IsOptional()
  mine?: string;
}
