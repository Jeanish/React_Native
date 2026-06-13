import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = (): void => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.emit('admin:join');
  }
};

export const disconnectSocket = (): void => {
  if (socket?.connected) socket.disconnect();
};

export type SalonRegisteredPayload = {
  type: 'salon:registered';
  message: string;
  salon: {
    _id: string;
    name: string;
    phone: string;
    address: { city: string; state: string };
    createdAt: string;
  };
  timestamp: string;
};
