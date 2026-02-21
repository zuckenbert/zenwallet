import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';

const SHUTDOWN_TIMEOUT_MS = 15_000;

async function main(): Promise<void> {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    logger.info({
      port: env.PORT,
      env: env.NODE_ENV,
      whatsapp: 'Evolution API',
      ai: 'Claude (Anthropic)',
    }, 'ZenWallet Loan Origination Server started');
  });

  // Keep-alive settings for production
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, 'Graceful shutdown initiated');

    // Force exit after timeout
    const forceTimeout = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceTimeout.unref();

    try {
      // Stop accepting new connections
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info('HTTP server closed');

      // Disconnect database
      await disconnectDatabase();

      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
}

main().catch((error) => {
  logger.fatal(error, 'Fatal error during startup');
  process.exit(1);
});
