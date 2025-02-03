import { pino } from 'pino';

import { getLogLevel } from '../configuration/index.js';

export default pino({ level: getLogLevel(), name: 'whats-up-docker' });
