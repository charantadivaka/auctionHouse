import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

class SocketManager {
  private static instance: SocketManager;
  private auctionsSocket: Socket | null = null;
  private notificationsSocket: Socket | null = null;

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public getAuctionsSocket(): Socket {
    if (!this.auctionsSocket) {
      const token = Cookies.get('token');
      this.auctionsSocket = io(SOCKET_URL, {
        extraHeaders: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
    }
    return this.auctionsSocket;
  }

  public getNotificationsSocket(): Socket {
    if (!this.notificationsSocket) {
      const token = Cookies.get('token');
      this.notificationsSocket = io(`${SOCKET_URL}/notifications`, {
        extraHeaders: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
    }
    return this.notificationsSocket;
  }

  public disconnectAll() {
    if (this.auctionsSocket) {
      this.auctionsSocket.disconnect();
      this.auctionsSocket = null;
    }
    if (this.notificationsSocket) {
      this.notificationsSocket.disconnect();
      this.notificationsSocket = null;
    }
  }

  public reconnectAll() {
    this.disconnectAll();
    this.getAuctionsSocket();
    this.getNotificationsSocket();
  }
}

export const socketManager = SocketManager.getInstance();
