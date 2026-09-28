import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private generateAccessToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' },
    );
  }

  private generateRefreshToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
        expiresIn: '30d',
      },
    );
  }

  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      password: _password,
      resetPasswordToken: _resetPasswordToken,
      resetPasswordExpires: _resetPasswordExpires,
      refreshToken: _refreshToken,
      emailVerificationToken: _emailVerificationToken,
      emailVerificationExpires: _emailVerificationExpires,
      ...rest
    } = user as any;
    return rest;
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findOneBy({ email: dto.email });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashed = await bcrypt.hash(dto.password, 12);

    // Generate email verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      isEmailVerified: false, // must verify
      emailVerificationToken: hashedToken,
      emailVerificationExpires: tokenExpires,
    });

    const savedUser = await this.usersRepository.save(user);

    // Send verification email
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const verifyLink = `${frontendUrl}/verify-email?token=${rawToken}&email=${encodeURIComponent(dto.email)}`;
    await this.mailService.sendVerificationEmail(dto.email, verifyLink);

    // Don't return tokens yet — user must verify first
    return {
      message: 'Registration successful. Please check your email to verify your account.',
      email: savedUser.email,
    };
  }

  async verifyEmail(email: string, token: string) {
    const user = await this.usersRepository.findOneBy({ email });
    if (!user || !user.emailVerificationToken || !user.emailVerificationExpires) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    if (new Date() > user.emailVerificationExpires) {
      throw new BadRequestException(
        'Verification link has expired. Please register again or request a new link.',
      );
    }

    const isMatch = await bcrypt.compare(token, user.emailVerificationToken);
    if (!isMatch) {
      throw new BadRequestException('Invalid verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await this.usersRepository.save(user);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOneBy({ email: dto.email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    // Gate: existing accounts all have isEmailVerified=true so they pass through.
    // Only newly registered accounts (isEmailVerified=false) are blocked.
    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in. Check your inbox.',
      );
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate a 6-digit OTP and store it in Redis for 5 minutes
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${user.email}`;
    const attemptsKey = `otp_attempts:${user.email}`;

    await this.redis.set(otpKey, otp, 'EX', 300); // 5 min TTL
    await this.redis.set(attemptsKey, '0', 'EX', 300);

    await this.mailService.sendOtp(user.email, otp);

    return {
      requiresOtp: true,
      message: 'A 6-digit verification code has been sent to your email.',
      email: user.email,
    };
  }

  async verifyOtp(email: string, otp: string) {
    const otpKey = `otp:${email}`;
    const attemptsKey = `otp_attempts:${email}`;

    const storedOtp = await this.redis.get(otpKey);
    if (!storedOtp) {
      throw new BadRequestException('OTP has expired. Please log in again to get a new code.');
    }

    // Track failed attempts (max 5 before invalidating)
    const attempts = parseInt((await this.redis.get(attemptsKey)) ?? '0', 10);
    if (attempts >= 5) {
      await this.redis.del(otpKey, attemptsKey);
      throw new BadRequestException('Too many failed attempts. Please log in again.');
    }

    if (storedOtp !== otp) {
      await this.redis.incr(attemptsKey);
      throw new UnauthorizedException('Incorrect verification code. Please try again.');
    }

    // OTP is valid — clean up Redis keys
    await this.redis.del(otpKey, attemptsKey);

    const user = await this.usersRepository.findOneBy({ email });
    if (!user) throw new NotFoundException('User not found');

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.save(user);

    return {
      token: accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async googleLogin(req: any) {
    if (!req.user) {
      throw new UnauthorizedException('No user from google');
    }

    let user = await this.usersRepository.findOneBy({ email: req.user.email });

    if (!user) {
      // Create a new user since they don't exist
      user = this.usersRepository.create({
        name: `${req.user.firstName} ${req.user.lastName}`.trim(),
        email: req.user.email,
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
        isEmailVerified: true, // Google OAuth implies verified email
        avatarUrl: req.user.picture,
      });
      await this.usersRepository.save(user);
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.save(user);

    return {
      token: accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
      });
      const user = await this.usersRepository.findOneBy({ id: payload.sub });
      if (!user || !user.refreshToken) throw new UnauthorizedException();

      const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isMatch) throw new UnauthorizedException('Invalid refresh token');

      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);
      user.refreshToken = await bcrypt.hash(newRefreshToken, 10);
      await this.usersRepository.save(user);

      return { token: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitizeUser(user);
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepository.findOneBy({ email });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If this email exists, a reset link has been sent.' };

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = await bcrypt.hash(token, 10);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.usersRepository.save(user);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetLink = `${frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    await this.mailService.sendPasswordReset(email, resetLink);

    return { message: 'If this email exists, a reset link has been sent.' };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const user = await this.usersRepository.findOneBy({ email });
    if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (new Date() > user.resetPasswordExpires) {
      throw new BadRequestException('Reset token has expired');
    }

    const isMatch = await bcrypt.compare(token, user.resetPasswordToken);
    if (!isMatch) throw new BadRequestException('Invalid reset token');

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.refreshToken = null; // invalidate all sessions
    await this.usersRepository.save(user);

    return { message: 'Password reset successfully. Please log in.' };
  }
}
