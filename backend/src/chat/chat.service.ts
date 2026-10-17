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
    const messages = await this.chatRepository.find({
      where: { auction: { id: auctionId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      take: limit,
    });
    return messages.map((m) => ({
      ...m,
      sender: m.sender
        ? { id: m.sender.id, name: m.sender.name, avatarUrl: m.sender.avatarUrl }
        : null,
    }));
  }

  async saveMessage(auctionId: string, senderId: string, content: string): Promise<any> {
    const msg = this.chatRepository.create({
      auction: { id: auctionId } as any,
      sender: { id: senderId } as any,
      content: content.trim(),
    });
    const saved = await this.chatRepository.save(msg);
    const loaded = await this.chatRepository.findOne({
      where: { id: saved.id },
      relations: ['sender'],
    });
    const finalMsg = loaded || saved;
    return {
      ...finalMsg,
      sender: finalMsg.sender
        ? {
            id: finalMsg.sender.id,
            name: finalMsg.sender.name,
            avatarUrl: finalMsg.sender.avatarUrl,
          }
        : null,
    };
  }
}
