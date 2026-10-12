import { Controller, Post, Body, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { VerifyEmailDto } from './dto/verify-email.dto';

class ForgotPasswordDto {
  @ApiProperty({ example: 'charan@example.com' })
  @IsEmail()
  email: string;
}

class ResetPasswordDto {
  @ApiProperty({ example: 'charan@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'abc123token' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewStr0ngP@ss', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  refreshToken: string;
}

class VerifyOtpDto {
  @ApiProperty({ example: 'charan@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '482910' })
  @IsString()
  @IsNotEmpty()
  otp: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/register */
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered. A verification email is sent.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** POST /auth/login — step 1: validate credentials, send OTP email */
  @ApiOperation({ summary: 'Login (step 1 of 2)', description: 'Validates credentials and sends a one-time OTP to the email. Use /auth/verify-otp to complete login.' })
  @ApiResponse({ status: 200, description: 'OTP sent to email.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** POST /auth/verify-otp — step 2: check OTP, receive JWT tokens */
  @ApiOperation({ summary: 'Verify OTP (step 2 of 2)', description: 'Submit the OTP from your email. Returns access + refresh JWT tokens on success.' })
  @ApiResponse({ status: 200, description: 'Returns { accessToken, refreshToken }.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP.' })
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  /** POST /auth/resend-otp — request a new OTP */
  @ApiOperation({ summary: 'Resend OTP email', description: 'Regenerates and resends the login OTP.' })
  @Post('resend-otp')
  resendOtp(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendOtp(dto.email);
  }

  /** POST /auth/refresh */
  @ApiOperation({ summary: 'Refresh access token', description: 'Exchange a valid refresh token for a new access token.' })
  @ApiResponse({ status: 200, description: 'Returns new { accessToken }.' })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  /** GET /auth/me — returns current authenticated user */
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current user profile', description: 'Returns the full profile of the authenticated user.' })
  @ApiResponse({ status: 200, description: 'User profile.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id);
  }

  /** POST /auth/forgot-password */
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists.' })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /** POST /auth/reset-password */
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, description: 'Password updated successfully.' })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.token, dto.newPassword);
  }

  /** POST /auth/verify-email */
  @ApiOperation({ summary: 'Verify email address using token from email' })
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.token);
  }

  @ApiOperation({ summary: 'Initiate Google OAuth login', description: 'Redirects to Google OAuth consent screen.' })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() _req) {}

  @ApiOperation({ summary: 'Google OAuth callback', description: 'Handled by Google. Sets cookies and redirects to frontend.' })
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const { token, refreshToken } = await this.authService.googleLogin(req);

    // BUG FIX: Set tokens as cookies instead of passing in URL params
    res.cookie('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback`);
  }
}
