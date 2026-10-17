import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
  Query,
  Post,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UsersService, UpdateProfileDto } from './users.service';
import { User } from './user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from './user.entity';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[Admin] List all users', description: 'Paginated list of all registered users. Admin role required.' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '20') {
    return this.usersService.findAll(parseInt(page, 10), parseInt(limit, 10));
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get dashboard stats for the current user', description: 'Returns summary stats: active auctions, won auctions, total bids, etc.' })
  @UseGuards(JwtAuthGuard)
  @Get('me/dashboard')
  async getMyDashboard(@CurrentUser() user: User) {
    return this.usersService.getDashboardStats(user.id);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update current user profile' })
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(user.id, dto);
    const { password: _pw, refreshToken: _rt, resetPasswordToken: _rpt, ...rest } = updated as any;
    return rest;
  }

  @ApiOperation({ summary: 'Get a user public profile by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Public user profile (no sensitive fields).' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findOne(id);
    const {
      password: _pw,
      refreshToken: _rt,
      resetPasswordToken: _rpt,
      resetPasswordExpires: _rpe,
      emailVerificationToken: _evt,
      emailVerificationExpires: _eve,
      phone: _phone,
      ...rest
    } = user as any;
    return rest;
  }

  @ApiOperation({ summary: "Get a user's auction history" })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @Get(':id/auctions')
  async getAuctionHistory(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.usersService.getAuctionHistory(id, parseInt(page, 10), parseInt(limit, 10));
  }

  @ApiOperation({ summary: "Get a user's followers" })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Get(':id/followers')
  async getFollowers(@Param('id') id: string) {
    return this.usersService.getFollowers(id);
  }

  @ApiOperation({ summary: 'Get users that a user is following' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @Get(':id/following')
  async getFollowing(@Param('id') id: string) {
    return this.usersService.getFollowing(id);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Check if you are following a user' })
  @ApiParam({ name: 'id', description: 'Target user UUID' })
  @UseGuards(JwtAuthGuard)
  @Get(':id/is-following')
  async isFollowing(@Param('id') id: string, @CurrentUser() user: User) {
    return { isFollowing: await this.usersService.isFollowing(user.id, id) };
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({ name: 'id', description: 'User UUID to follow' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  async follow(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.followUser(user.id, id);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({ name: 'id', description: 'User UUID to unfollow' })
  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  async unfollow(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.unfollowUser(user.id, id);
  }
}
