import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { RefreshTokensUseCase } from '../../application/use-cases/refresh-tokens.use-case';
import {
  InvalidCredentialsError,
  RefreshTokenInvalidError,
  UserInactiveError,
} from '../../domain/errors/auth.errors';
import { USER_READER, type UserReader } from '../../domain/ports/user-reader.port';
import { toPublic } from '../../domain/entities/auth-user.entity';
import type { AppEnv } from '../../../../config/env.validation';
import { CurrentUser, type CurrentUserPayload } from './current-user.decorator';
import { LoginRequestDto } from './dto/login.request-dto';
import { Public } from './public.decorator';

const REFRESH_COOKIE = 't1et_rt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUC: LoginUseCase,
    private readonly refreshUC: RefreshTokensUseCase,
    private readonly logoutUC: LogoutUseCase,
    @Inject(USER_READER) private readonly users: UserReader,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const session = await this.loginUC.execute({
        emailOrUsername: body.emailOrUsername,
        password: body.password,
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
      });
      this.setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
      return {
        user: session.user,
        accessToken: session.accessToken,
        accessTokenExpiresInSec: session.accessTokenExpiresInSec,
      };
    } catch (e) {
      if (e instanceof InvalidCredentialsError) throw new UnauthorizedException(e.message);
      if (e instanceof UserInactiveError) throw new ForbiddenException(e.message);
      throw e;
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('No refresh token');
    try {
      const session = await this.refreshUC.execute({
        refreshToken: token,
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
      });
      this.setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
      return {
        user: session.user,
        accessToken: session.accessToken,
        accessTokenExpiresInSec: session.accessTokenExpiresInSec,
      };
    } catch (e) {
      if (e instanceof RefreshTokenInvalidError) {
        this.clearRefreshCookie(res);
        throw new UnauthorizedException(e.message);
      }
      if (e instanceof UserInactiveError) {
        this.clearRefreshCookie(res);
        throw new ForbiddenException(e.message);
      }
      throw e;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    await this.logoutUC.execute({ refreshToken: token ?? null });
    this.clearRefreshCookie(res);
  }

  @Get('me')
  async me(@CurrentUser() current: CurrentUserPayload | undefined) {
    if (!current) throw new UnauthorizedException();
    const user = await this.users.findById(current.id);
    if (!user) throw new UnauthorizedException();
    return { user: toPublic(user) };
  }

  private setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: 'lax',
      domain: this.config.get('COOKIE_DOMAIN', { infer: true }),
      path: '/api/auth',
      expires: expiresAt,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: 'lax',
      domain: this.config.get('COOKIE_DOMAIN', { infer: true }),
      path: '/api/auth',
    });
  }
}
