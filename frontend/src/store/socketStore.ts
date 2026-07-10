import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface NotificationItem {
  type: string;
  message: string;
  createdAt: Date;
}

interface SocketState {
  socket: Socket | null;
  notifications: NotificationItem[];
  connectSocket: (accessToken: string | null) => void;
  disconnectSocket: () => void;
  joinLot: (lotId: string) => void;
  leaveLot: (lotId: string) => void;
  addNotification: (notification: NotificationItem) => void;
  clearNotifications: () => void;
}

const SOCKET_URL = 
  import.meta.env.MODE === 'production'
    ? window.location.origin
    : import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  notifications: [],

  connectSocket: (accessToken) => {
    // Disconnect existing socket first
    if (get().socket) {
      get().socket?.disconnect();
    }

    const socketConnection = io(SOCKET_URL, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
    });

    socketConnection.on('connect', () => {
      console.log('Socket.io connected successfully.');
    });

    socketConnection.on('notification', (data: NotificationItem) => {
      console.log('Received real-time notification:', data);
      get().addNotification(data);
    });

    set({ socket: socketConnection });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  joinLot: (lotId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('join-lot', lotId);
    }
  },

  leaveLot: (lotId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('leave-lot', lotId);
    }
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },
}));
