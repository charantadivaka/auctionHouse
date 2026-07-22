import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService, UpdateProfileDto } from './users.service';
import { User } from './user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<User[]> {
    // Note: In a real app, we should omit sensitive info like password
    const users = await this.usersService.findAll();
    return users.map(u => {
      const { password, ...rest } = u;
      return rest as User;
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/dashboard')
  async getMyDashboard(@CurrentUser() user: User) {
    return this.usersService.getDashboardStats(user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    const user = await this.usersService.findOne(id);
    const { password, ...rest } = user;
    return rest as User;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateProfile(user.id, dto);
    const { password, ...rest } = updated;
    return rest;
  }
}
