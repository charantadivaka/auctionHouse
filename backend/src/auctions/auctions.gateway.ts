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
import { AuctionsService } from './auctions.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000', // Should be dynamic in production
    credentials: true,
  },
})
export class AuctionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly auctionsService: AuctionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get('JWT_SECRET'),
        });
        client.data.user = payload;
      }
    } catch (e) {
      // Allow anonymous connections for just viewing
    }
  }

  handleDisconnect(client: Socket) {}

  @SubscribeMessage('joinAuction')
  handleJoinAuction(@ConnectedSocket() client: Socket, @MessageBody() auctionId: string) {
    client.join(`auction-${auctionId}`);
  }

  @SubscribeMessage('leaveAuction')
  handleLeaveAuction(@ConnectedSocket() client: Socket, @MessageBody() auctionId: string) {
    client.leave(`auction-${auctionId}`);
  }

  @SubscribeMessage('placeBid')
  async handlePlaceBid(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string; amount: number },
  ) {
    if (!client.data.user) {
      client.emit('bidError', { message: 'You must be logged in to bid' });
      return;
    }

    try {
      const updatedAuction = await this.auctionsService.placeBid(
        data.auctionId, 
        client.data.user.sub, // Using sub (userId) from JWT, not from client payload
        data.amount
      );
      this.server.to(`auction-${data.auctionId}`).emit('bidPlaced', updatedAuction);
    } catch (error: any) {
      client.emit('bidError', { message: error.message });
    }
  }
}
