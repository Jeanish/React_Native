import http from 'http';
import app from './app';
import { env } from './config/environment';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initializeFirebase } from './config/firebase';
import { logger } from './utils/logger';
import { initSocket } from './socket';

const server = http.createServer(app);

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    initializeFirebase();

    initSocket(server, env.CORS_ORIGIN.split(','));

    server.listen(env.PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 TrimCity API Server                                 ║
║                                                           ║
║   Environment: ${env.NODE_ENV.padEnd(43)}║
║   Port:        ${env.PORT.toString().padEnd(43)}║
║   API Version: ${env.API_VERSION.padEnd(43)}║
║                                                           ║
║   Health: http://localhost:${env.PORT}/health            ║
║   API:    http://localhost:${env.PORT}/api/${env.API_VERSION}            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  server.close(async () => {
    logger.info('HTTP server closed');
    await disconnectDatabase();
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => { void gracefulShutdown('SIGTERM'); });
process.on('SIGINT', () => { void gracefulShutdown('SIGINT'); });
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

startServer();
