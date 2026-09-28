import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

@WebSocketGateway({
  cors: { origin: frontendUrl, credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track online users: userId -> Set<socketId>
  private onlineUsers: Map<string, Set<string>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get('JWT_SECRET'),
        });
        client.data.user = payload;

        // Track online status
        if (!this.onlineUsers.has(payload.sub)) {
          this.onlineUsers.set(payload.sub, new Set());
        }
        this.onlineUsers.get(payload.sub)?.add(client.id);
        this.server.emit('userOnline', { userId: payload.sub });
      }
    } catch {}
  }

  handleDisconnect(client: Socket) {
    if (client.data.user) {
      const userId = client.data.user.sub;
      const sockets = this.onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(userId);
          this.server.emit('userOffline', { userId });
        }
      }
    }
  }

  isUserOnline(userId: string): boolean {
    return (this.onlineUsers.get(userId)?.size ?? 0) > 0;
  }

  @SubscribeMessage('joinChatRoom')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() auctionId: string) {
    client.join(`chat-${auctionId}`);
    // Send last 50 messages on join
    const messages = await this.chatService.getMessages(auctionId);
    client.emit('chatHistory', messages);
  }

  @SubscribeMessage('leaveChatRoom')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() auctionId: string) {
    client.leave(`chat-${auctionId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string; content: string },
  ) {
    if (!client.data.user) {
      client.emit('chatError', { message: 'Must be logged in to chat' });
      return;
    }
    if (!data.content?.trim()) return;

    try {
      const msg = await this.chatService.saveMessage(
        data.auctionId,
        client.data.user.sub,
        data.content.trim(),
      );
      this.server.to(`chat-${data.auctionId}`).emit('newMessage', msg);
    } catch (error) {
      client.emit('chatError', { message: 'Failed to send message. Auction might not exist.' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string; isTyping: boolean },
  ) {
    if (!client.data.user) return;
    client.to(`chat-${data.auctionId}`).emit('userTyping', {
      userId: client.data.user.sub,
      userName: client.data.user.email,
      isTyping: data.isTyping,
    });
  }
}
