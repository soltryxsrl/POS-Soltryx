import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokensUseCase } from './application/use-cases/refresh-tokens.use-case';

import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { REFRESH_TOKEN_REPOSITORY } from './domain/ports/refresh-token.repository.port';
import { TOKEN_ISSUER } from './domain/ports/token-issuer.port';
import { USER_READER } from './domain/ports/user-reader.port';

import { BcryptPasswordHasher } from './infrastructure/crypto/bcrypt-password-hasher';
import { JwtTokenIssuer } from './infrastructure/crypto/jwt-token-issuer';
import { PermissionOrmEntity } from './infrastructure/persistence/typeorm/permission.orm-entity';
import { RefreshTokenOrmEntity } from './infrastructure/persistence/typeorm/refresh-token.orm-entity';
import { RefreshTokenRepositoryTypeOrm } from './infrastructure/persistence/typeorm/refresh-token.repository.typeorm';
import { RoleOrmEntity } from './infrastructure/persistence/typeorm/role.orm-entity';
import { UserOrmEntity } from './infrastructure/persistence/typeorm/user.orm-entity';
import { UserReaderTypeOrm } from './infrastructure/persistence/typeorm/user.reader.typeorm';

import { AuthController } from './infrastructure/http/auth.controller';
import { JwtAuthGuard } from './infrastructure/http/jwt-auth.guard';
import { JwtStrategy } from './infrastructure/http/jwt.strategy';
import { PermissionsGuard } from './infrastructure/http/permissions.guard';
import { RolesGuard } from './infrastructure/http/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserOrmEntity,
      RoleOrmEntity,
      PermissionOrmEntity,
      RefreshTokenOrmEntity,
    ]),
    PassportModule,
    // El secret y expiry se setean en cada sign — esta config registra el JwtService.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    // Use cases
    LoginUseCase,
    RefreshTokensUseCase,
    LogoutUseCase,

    // Ports → adapters
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
    { provide: USER_READER, useClass: UserReaderTypeOrm },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepositoryTypeOrm },

    // Passport strategy
    JwtStrategy,

    // Guards globales: todos los handlers requieren JWT salvo @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [USER_READER, PASSWORD_HASHER, TOKEN_ISSUER, REFRESH_TOKEN_REPOSITORY],
})
export class AuthModule {}
