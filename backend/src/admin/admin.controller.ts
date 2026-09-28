import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  async getAllUsers(@Query('page') page: string = '1', @Query('limit') limit: string = '20') {
    return this.adminService.getAllUsers(parseInt(page, 10), parseInt(limit, 10));
  }

  @Patch('users/:id/toggle-status')
  async toggleUserStatus(@Param('id') id: string) {
    return this.adminService.toggleUserStatus(id);
  }

  @Patch('auctions/:id/cancel')
  async cancelAuction(@Param('id') id: string) {
    await this.adminService.cancelAuction(id);
    return { success: true };
  }
}
