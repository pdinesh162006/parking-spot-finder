import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { publicKey } from './config/jwt';

let io: SocketIOServer;

/**
 * Initializes the Socket.io instance on top of the HTTP Server
 */
export function initSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Optional handshake auth
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    let userId: string | null = null;

    if (token && typeof token === 'string') {
      try {
        const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as any;
        userId = decoded.id;
        if (userId) {
          socket.join(`user:${userId}`);
          console.log(`Socket ${socket.id} authenticated for User Room: user:${userId}`);
        }
      } catch (err) {
        console.log(`Socket authentication failed: ${socket.id}`);
      }
    }

    // Join a parking lot room to monitor live spot changes
    socket.on('join-lot', (lotId: string) => {
      socket.join(`lot:${lotId}`);
      console.log(`Socket ${socket.id} joined room lot:${lotId}`);
    });

    // Leave a parking lot room
    socket.on('leave-lot', (lotId: string) => {
      socket.leave(`lot:${lotId}`);
      console.log(`Socket ${socket.id} left room lot:${lotId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Retrieves the active Socket.io instance
 */
export const getIO = () => {
  return io;
};

/**
 * Broadcasts spot availability updates to clients in a lot room
 */
export const broadcastSpotUpdate = (lotId: string, spotsData: any) => {
  if (io) {
    io.to(`lot:${lotId}`).emit('spots-updated', spotsData);
  }
};

/**
 * Sends a real-time notification to a specific authenticated user
 */
export const sendRealTimeNotification = (userId: string, type: string, message: string) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification', {
      type,
      message,
      createdAt: new Date(),
    });
  }
};
