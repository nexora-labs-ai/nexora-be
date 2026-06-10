import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { AuthRepository } from '../auth.repository';
import { UsersService } from '../../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictError } from '../../../shared/common/domain-errors';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let authRepository: jest.Mocked<AuthRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            createRefreshToken: jest.fn(),
            revokeAllUserTokens: jest.fn(),
            findRefreshToken: jest.fn(),
            revokeRefreshToken: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findByUsername: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock-value') },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    authRepository = module.get(AuthRepository);
  });

  describe('register', () => {
    it('should throw ConflictError if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'user-1' } as any);

      await expect(
        service.register({
          email: 'existing@example.com',
          username: 'test',
          displayName: 'Test',
          password: 'Test1234!',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should register a new user and return tokens', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@example.com',
        role: 'USER',
      } as any);
      authRepository.createRefreshToken.mockResolvedValue({} as any);

      const result = await service.register({
        email: 'new@example.com',
        username: 'newuser',
        displayName: 'New User',
        password: 'Test1234!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });
});
