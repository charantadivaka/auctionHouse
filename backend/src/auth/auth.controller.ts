import { Controller, Post, Body, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { VerifyEmailDto } from './dto/verify-email.dto';

class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/register */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** POST /auth/login — step 1: validate credentials, send OTP email */
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** POST /auth/verify-otp — step 2: check OTP, receive JWT tokens */
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  /** POST /auth/refresh */
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  /** GET /auth/me — returns current authenticated user */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id);
  }

  /** POST /auth/forgot-password */
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /** POST /auth/reset-password */
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.token, dto.newPassword);
  }

  /** POST /auth/verify-email */
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.token);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() _req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const { token, refreshToken } = await this.authService.googleLogin(req);

    // BUG FIX: Set tokens as cookies instead of passing in URL params
    res.cookie('token', token, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.cookie('refreshToken', refreshToken, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback`);
  }
}
