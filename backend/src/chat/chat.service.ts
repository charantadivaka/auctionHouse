import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './chat.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatRepository: Repository<ChatMessage>,
  ) {}

  async getMessages(auctionId: string, limit = 50) {
    return this.chatRepository.find({
      where: { auction: { id: auctionId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async saveMessage(auctionId: string, senderId: string, content: string): Promise<ChatMessage> {
    const msg = this.chatRepository.create({
      auction: { id: auctionId } as any,
      sender: { id: senderId } as any,
      // BUG FIX: Basic HTML escaping to sanitize chat inputs
      content: content.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    });
    return this.chatRepository.save(msg);
  }
}
