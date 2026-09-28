import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':auctionId')
  async getMessages(@Param('auctionId') auctionId: string, @Query('limit') limit: string = '50') {
    return this.chatService.getMessages(auctionId, parseInt(limit, 10));
  }
}
