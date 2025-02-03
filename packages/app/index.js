const api = require('./api/index.js');
const { getVersion } = require('./configuration/index.js');
const log = require('./log/index.js');
const prometheus = require('./prometheus/index.js');
const registry = require('./registry/index.js');
const store = require('./store/index.js');

async function main() {
  log.info(`WUD is starting (version = ${getVersion()})`);

  await store.init();
  prometheus.init();
  await registry.init();
  await api.init();
}

await main();
