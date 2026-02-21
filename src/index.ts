import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';

async function main(): Promise<void> {
  // Connect to database
  await connectDatabase();

  // Start server
  const server = app.listen(env.PORT, () => {
    logger.info(`
    ╔══════════════════════════════════════════╗
    ║    ZenWallet Loan Origination Server     ║
    ║──────────────────────────────────────────║
    ║  Port:      ${String(env.PORT).padEnd(28)}║
    ║  Env:       ${env.NODE_ENV.padEnd(28)}║
    ║  WhatsApp:  Evolution API                ║
    ║  AI:        Claude (Anthropic)           ║
    ╚══════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.fatal(error, 'Fatal error during startup');
  process.exit(1);
});
