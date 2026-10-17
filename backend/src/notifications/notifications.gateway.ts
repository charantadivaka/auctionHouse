import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Read FRONTEND_URL at module-load time so the decorator gets the correct value
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

@WebSocketGateway({
  cors: {
    origin: frontendUrl,
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const rawToken =
        client.handshake.auth?.token ||
        (client.handshake.headers.authorization?.startsWith('Bearer ')
          ? client.handshake.headers.authorization.split(' ')[1]
          : client.handshake.headers.authorization);

      if (rawToken) {
        const token = rawToken.startsWith('Bearer ') ? rawToken.split(' ')[1] : rawToken;
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get('JWT_SECRET'),
        });
        client.data.user = payload;
        // Join a private room for this user to receive personal notifications
        client.join(`user-${payload.sub}`);
      } else {
        client.disconnect();
      }
    } catch (e) {
      client.disconnect();
    }
  }

  // Method to be called by other services to emit notifications
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user-${userId}`).emit('newNotification', notification);
  }
}
