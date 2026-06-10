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

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class AuctionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly auctionsService: AuctionsService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinAuction')
  handleJoinAuction(@ConnectedSocket() client: Socket, @MessageBody() auctionId: string) {
    client.join(`auction-${auctionId}`);
  }

  @SubscribeMessage('placeBid')
  async handlePlaceBid(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string; bidderId: string; amount: number },
  ) {
    try {
      const updatedAuction = await this.auctionsService.placeBid(data.auctionId, data.bidderId, data.amount);
      this.server.to(`auction-${data.auctionId}`).emit('bidPlaced', updatedAuction);
    } catch (error) {
      client.emit('bidError', { message: error.message });
    }
  }
}
