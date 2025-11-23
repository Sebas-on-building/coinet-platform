const pino = require('pino');
function setupLogger() {
  global.logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });
}
module.exports = { setupLogger }; 