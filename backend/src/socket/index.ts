import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { USER_ROLES } from '../utils/constants';
import { logger } from '../utils/logger';

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer, corsOrigin: string[]): Server => {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('admin:join', (token?: string) => {
      if (!token || typeof token !== 'string') {
        socket.emit('error', { message: 'Authentication token required' });
        return;
      }

      try {
        const decoded = verifyAccessToken(token);
        if (decoded.role !== USER_ROLES.SUPER_ADMIN) {
          socket.emit('error', { message: 'Super admin access required' });
          return;
        }
        socket.join('admins');
        logger.info(`Super admin joined room: ${socket.id}`);
      } catch {
        socket.emit('error', { message: 'Invalid or expired token' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.io initialized');
  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// ─── Emitters ────────────────────────────────────────────────────────────────

export const emitSalonRegistered = (salon: {
  _id: string;
  name: string;
  phone: string;
  address: { city: string; state: string };
  createdAt: Date;
}): void => {
  if (!io) return;
  io.to('admins').emit('salon:registered', {
    type: 'salon:registered',
    message: `New salon registered: ${salon.name}`,
    salon,
    timestamp: new Date(),
  });
};

export const emitSalonApproved = (salonId: string, salonName: string): void => {
  if (!io) return;
  io.emit(`salon:${salonId}:approved`, { salonName, timestamp: new Date() });
};

export const emitSalonRejected = (salonId: string, salonName: string, reason: string): void => {
  if (!io) return;
  io.emit(`salon:${salonId}:rejected`, { salonName, reason, timestamp: new Date() });
};
