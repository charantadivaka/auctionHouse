import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import { MailService } from '../mail/mail.service';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  password: bcrypt.hashSync('Password1!', 10),
  isEmailVerified: true,
  isActive: true,
  role: 'user' as any,
  refreshToken: null,
  resetPasswordToken: null,
  resetPasswordExpires: null,
  emailVerificationToken: null,
  emailVerificationExpires: null,
  auctions: [],
  bids: [],
  notifications: [],
  watchlistItems: [],
  followersRelations: [],
  followingRelations: [],
  sellerRating: 0,
  totalRatings: 0,
  avatarUrl: null,
  bio: null,
  location: null,
  totalBids: 0,
  wonAuctions: 0,
  listedAuctions: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as any);

const mockRepo = () => ({
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((x) => x),
  save: jest.fn((x) => Promise.resolve({ ...x, id: 'user-1' })),
});

const mockJwtService = () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(() => ({ sub: 'user-1', type: 'refresh' })),
});

const mockConfigService = () => ({
  get: jest.fn((key: string, fallback?: any) => {
    const config: Record<string, any> = {
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      FRONTEND_URL: 'http://localhost:3000',
      JWT_EXPIRES_IN: '7d',
    };
    return config[key] ?? fallback;
  }),
});

const mockMailService = () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let repo: ReturnType<typeof mockRepo>;
  let mailService: ReturnType<typeof mockMailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useFactory: mockRepo },
        { provide: JwtService, useFactory: mockJwtService },
        { provide: ConfigService, useFactory: mockConfigService },
        { provide: MailService, useFactory: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repo = module.get(getRepositoryToken(User));
    mailService = module.get(MailService);
  });

  // ── register() ────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('should throw ConflictException if email already exists', async () => {
      repo.findOneBy.mockResolvedValue(makeUser());
      await expect(
        service.register({ name: 'A', email: 'test@example.com', password: 'P@ss1234' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and send verification email on success', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const result = await service.register({
        name: 'New User',
        email: 'new@example.com',
        password: 'SecureP@ss1',
      } as any);

      expect(repo.save).toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        'new@example.com',
        expect.stringContaining('/verify-email'),
      );
      expect(result.message).toContain('verify');
    });

    it('should hash the password before saving', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await service.register({
        name: 'Hash Test',
        email: 'hash@test.com',
        password: 'PlainPass1!',
      } as any);

      const savedUser = repo.save.mock.calls[0][0];
      expect(savedUser.password).not.toBe('PlainPass1!');
      expect(await bcrypt.compare('PlainPass1!', savedUser.password)).toBe(true);
    });
  });

  // ── login() ───────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('should throw UnauthorizedException for unknown email', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pass' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      repo.findOneBy.mockResolvedValue(makeUser());
      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for suspended account', async () => {
      repo.findOneBy.mockResolvedValue(makeUser({ isActive: false }));
      await expect(
        service.login({ email: 'test@example.com', password: 'Password1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if email not verified (new accounts)', async () => {
      repo.findOneBy.mockResolvedValue(makeUser({ isEmailVerified: false }));
      await expect(
        service.login({ email: 'test@example.com', password: 'Password1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on successful login', async () => {
      const user = makeUser();
      repo.findOneBy.mockResolvedValue(user);
      repo.save.mockResolvedValue(user);

      const result = await service.login({ email: 'test@example.com', password: 'Password1!' });
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });
  });

  // ── forgotPassword() ──────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('should return success message even for non-existent email (enumeration guard)', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const result = await service.forgotPassword('nobody@example.com');
      expect(result.message).toContain('reset link has been sent');
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should send reset email for existing user', async () => {
      const user = makeUser();
      repo.findOneBy.mockResolvedValue(user);
      repo.save.mockResolvedValue(user);
      await service.forgotPassword('test@example.com');
      expect(mailService.sendPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('/reset-password'),
      );
    });
  });

  // ── resetPassword() ───────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('should throw if user has no reset token', async () => {
      repo.findOneBy.mockResolvedValue(makeUser({ resetPasswordToken: null }));
      await expect(
        service.resetPassword('test@example.com', 'anytoken', 'newpass'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if reset token has expired', async () => {
      repo.findOneBy.mockResolvedValue(
        makeUser({
          resetPasswordToken: 'hashed',
          resetPasswordExpires: new Date(Date.now() - 1000),
        }),
      );
      await expect(
        service.resetPassword('test@example.com', 'anytoken', 'newpass'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
