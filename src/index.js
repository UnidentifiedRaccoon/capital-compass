import { initBot } from './bot/index.js';

const bot = initBot();

async function shutdown(signal) {
  console.log(`\n${signal} received: stopping bot...`);
  try {
    await bot.stopPolling();
    console.log('Polling stopped. Bye!');
  } catch (e) {
    console.error('Error during shutdown:', e?.message || e);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
