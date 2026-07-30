import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
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
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
        expiresIn: '30d',
      },
    );
  }

  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, resetPasswordToken, resetPasswordExpires, refreshToken, ...rest } = user as any;
    return rest;
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findOneBy({ email: dto.email });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepository.create({
      name:            dto.name,
      email:           dto.email,
      password:        hashed,
      isEmailVerified: true, // Auto-verified (no email provider configured)
    });

    const refreshTok = this.generateRefreshToken({ id: 'temp' } as User);
    const savedUser = await this.usersRepository.save(user);
    const accessToken = this.generateAccessToken(savedUser);
    const refreshToken = this.generateRefreshToken(savedUser);
    savedUser.refreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.save(savedUser);

    return {
      token: accessToken,
      refreshToken,
      user: this.sanitizeUser(savedUser),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOneBy({ email: dto.email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
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
        isEmailVerified: true,
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
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
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

    // Log reset link (replace with actual email sending in production)
    console.log(`\n[Password Reset] Link for ${email}:\n${resetLink}\n`);

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
