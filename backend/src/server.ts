import http from 'http';
import app from './app';
import { env } from './config/environment';
import { connectDatabase } from './config/database';
import { initializeFirebase } from './config/firebase';
import { logger } from './utils/logger';

// Create HTTP server
const server = http.createServer(app);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize Firebase
    initializeFirebase();

    // Start listening
    server.listen(env.PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Salon App API Server                                ║
║                                                           ║
║   Environment: ${env.NODE_ENV.padEnd(43)}║
║   Port: ${env.PORT.toString().padEnd(50)}║
║   API Version: ${env.API_VERSION.padEnd(44)}║
║                                                           ║
║   Health Check: http://localhost:${env.PORT}/health${' '.repeat(17)}║
║   API Base: http://localhost:${env.PORT}/api/${env.API_VERSION}${' '.repeat(17)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

    // TODO: Initialize Socket.io
    // const io = new Server(server, {
    //   cors: {
    //     origin: env.CORS_ORIGIN.split(','),
    //     credentials: true,
    //   },
    // });
    // setupSocketHandlers(io);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Start the server
startServer();
