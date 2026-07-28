import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

// BUG-10: Only instantiate in browser to avoid SSR crash
// BUG-27: Use NEXT_PUBLIC_API_URL as fallback for NEXT_PUBLIC_SOCKET_URL (same server)
let _socketManager: SocketManager | null = null;

export const socketManager = {
  get instance(): SocketManager {
    if (typeof window === 'undefined') {
      throw new Error('SocketManager cannot be used on the server side');
    }
    if (!_socketManager) {
      _socketManager = SocketManager.getInstance();
    }
    return _socketManager;
  },
  getAuctionsSocket: () => socketManager.instance.getAuctionsSocket(),
  getNotificationsSocket: () => socketManager.instance.getNotificationsSocket(),
  disconnectAll: () => {
    if (typeof window !== 'undefined' && _socketManager) {
      _socketManager.disconnectAll();
    }
  },
  reconnectAll: () => {
    if (typeof window !== 'undefined') {
      socketManager.instance.reconnectAll();
    }
  },
};

