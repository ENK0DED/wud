/* eslint-disable perfectionist/sort-objects */
const joi = require('joi');
const { readFileSync } = require('node:fs');
const { set } = require('radash');

const VAR_FILE_SUFFIX = '__FILE';

/**
 * Get a prop by path from environment variables.
 * @param {string} property
 * @param {Record<string, string>} environment
 * @returns Record<string, any>
 */
function get(property, environment = process.env) {
  let object = {};
  const environmentVariablePattern = property.replaceAll('.', '_').toUpperCase();
  const matchingEnvironmentVariables = Object.keys(environment).filter((environmentKey) => environmentKey.startsWith(environmentVariablePattern));

  for (const matchingEnvironmentVariable of matchingEnvironmentVariables) {
    const environmentVariableValue = environment[matchingEnvironmentVariable];
    const matchingPropertyPath = matchingEnvironmentVariable.replaceAll('_', '.').toLowerCase();
    const matchingPropertyPathWithoutPrefix = matchingPropertyPath.replace(`${property}.`, '');
    object = set(object, matchingPropertyPathWithoutPrefix, environmentVariableValue);
  }

  return object;
}

/**
 * Lookup external secrets defined in files.
 * @param wudEnvVars
 */
function replaceSecrets(wudEnvironmentVariables) {
  const secretFileEnvironmentVariables = Object.keys(wudEnvironmentVariables).filter((wudEnvironmentVariable) =>
    wudEnvironmentVariable.toUpperCase().endsWith(VAR_FILE_SUFFIX),
  );

  for (const secretFileEnvironmentVariable of secretFileEnvironmentVariables) {
    const secretKey = secretFileEnvironmentVariable.replace(VAR_FILE_SUFFIX, '');
    const secretFilePath = wudEnvironmentVariables[secretFileEnvironmentVariable];
    const secretFileValue = readFileSync(secretFilePath, 'utf8');
    delete wudEnvironmentVariables[secretFileEnvironmentVariable];
    wudEnvironmentVariables[secretKey] = secretFileValue;
  }
}

// 1. Get a copy of all wud related env vars
/** @type {Partial<Record<string, string>>} */
// eslint-disable-next-line unicorn/prevent-abbreviations
const wudEnvVars = {};

for (const wudEnvironmentVariable of Object.keys(process.env).filter((environmentVariable) => environmentVariable.toUpperCase().startsWith('WUD'))) {
  wudEnvVars[wudEnvironmentVariable] = process.env[wudEnvironmentVariable];
}

// 2. Replace all secret files referenced by their secret values
replaceSecrets(wudEnvVars);

/** @type {() => string} */
const getVersion = () => wudEnvVars.WUD_VERSION ?? 'unknown';
const getLogLevel = () => wudEnvVars.WUD_LOG_LEVEL ?? 'info';
const getWatcherConfigurations = () => get('wud.watcher', wudEnvVars);
const getTriggerConfigurations = () => get('wud.trigger', wudEnvVars);
const getRegistryConfigurations = () => get('wud.registry', wudEnvVars);
const getAuthenticationConfigurations = () => get('wud.auth', wudEnvVars);
const getStoreConfiguration = () => get('wud.store', wudEnvVars);

/**
 * Get Server configurations.
 */
function getServerConfiguration() {
  const configurationFromEnvironment = get('wud.server', wudEnvVars);
  const configurationSchema = joi.object().keys({
    enabled: joi.boolean().default(true),
    port: joi.number().default(3000).integer().min(0).max(65_535),
    tls: joi
      .object({
        enabled: joi.boolean().default(false),
        key: joi.string().when('enabled', { is: true, then: joi.required(), otherwise: joi.optional() }),
        cert: joi.string().when('enabled', { is: true, then: joi.required(), otherwise: joi.optional() }),
      })
      .default({}),
    cors: joi
      .object({
        enabled: joi.boolean().default(false),
        origin: joi.string().default('*'),
        methods: joi.string().default('GET,HEAD,PUT,PATCH,POST,DELETE'),
      })
      .default({}),
    feature: joi.object({ delete: joi.boolean().default(true) }).default({ delete: true }),
  });

  // Validate Configuration
  const configurationToValidate = configurationSchema.validate(configurationFromEnvironment || {});

  if (configurationToValidate.error) {
    throw configurationToValidate.error;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return configurationToValidate.value;
}

const getPublicUrl = (request) => wudEnvVars.WUD_PUBLIC_URL ?? `${request.protocol}://${request.hostname}`;

module.exports = {
  get,
  getAuthenticationConfigurations,
  getLogLevel,
  getPublicUrl,
  getRegistryConfigurations,
  getServerConfiguration,
  getStoreConfiguration,
  getTriggerConfigurations,
  getVersion,
  getWatcherConfigurations,
  replaceSecrets,
  wudEnvVars,
};
