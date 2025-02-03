const pino = require('pino');
const { getLogLevel } = require('../configuration/index.js');

module.exports = pino({ level: getLogLevel(), name: 'whats-up-docker' });
