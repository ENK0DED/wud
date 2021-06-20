const joi = require('joi');
const Loki = require('lokijs');
const fs = require('fs');
const log = require('../log');
const { getStoreConfiguration } = require('../configuration');

const app = require('./app');
const container = require('./container');

// Store Configuration Schema
const configurationSchema = joi.object().keys({
    path: joi.string().default('/store'),
    file: joi.string().default('wud.json'),
});

// Validate Configuration
const configurationToValidate = configurationSchema.validate(getStoreConfiguration() || {});
if (configurationToValidate.error) {
    throw configurationToValidate.error;
}
const configuration = configurationToValidate.value;

// Loki DB
const db = new Loki(`${configuration.path}/${configuration.file}`, { autosave: true });

function createCollections() {
    app.createCollections(db);
    container.createCollections(db);
}

/**
 * Load DB.
 * @param err
 * @param resolve
 * @param reject
 * @returns {Promise<void>}
 */
async function loadDb(err, resolve, reject) {
    if (err) {
        reject(err);
    } else {
        // Create collections
        createCollections();
        resolve();
    }
}

/**
 * Init DB.
 * @returns {Promise<unknown>}
 */
async function init() {
    log.info(`Load DB (${configuration.path}/${configuration.file})`);
    if (!fs.existsSync(configuration.path)) {
        log.info(`Create folder ${configuration.path}`);
        fs.mkdirSync(configuration.path);
    }
    return new Promise((resolve, reject) => {
        db.loadDatabase({}, (err) => loadDb(err, resolve, reject));
    });
}

/**
 * Get configuration.
 * @returns {*}
 */
function getConfiguration() {
    return configuration;
}

module.exports = {
    init,
    getConfiguration,
};
