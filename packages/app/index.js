import api from './api/index.js';
import { getVersion } from './configuration/index.js';
import log from './log/index.js';
import prometheus from './prometheus/index.js';
import registry from './registry/index.js';
import store from './store/index.js';

async function main() {
  log.info(`WUD is starting (version = ${getVersion()})`);

  await store.init();
  prometheus.init();
  await registry.init();
  await api.init();
}

await main();
