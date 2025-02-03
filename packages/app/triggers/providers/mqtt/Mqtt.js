const fs = require('node:fs').promises;
const mqtt = require('mqtt');

const { registerContainerAdded, registerContainerUpdated } = require('../../../event');
const { flatten } = require('../../../model/container');
const Trigger = require('../Trigger');
const Hass = require('./Hass');

const containerDefaultTopic = 'wud/container';
const hassDefaultPrefix = 'homeassistant';

/**
 * MQTT Trigger implementation
 */
class Mqtt extends Trigger {
  /**
   * Get the Trigger configuration schema.
   * @returns {*}
   */
  getConfigurationSchema() {
    return this.joi.object().keys({
      clientid: this.joi.string().default(`wud_${Math.random().toString(16).slice(2, 10)}`),
      hass: this.joi
        .object({
          discovery: this.joi.boolean().when('enabled', { is: true, then: this.joi.boolean().default(true) }),
          enabled: this.joi.boolean().default(false),
          prefix: this.joi.string().default(hassDefaultPrefix),
        })
        .default({ discovery: false, enabled: false, prefix: hassDefaultPrefix }),
      password: this.joi.string(),
      tls: this.joi
        .object({
          cachain: this.joi.string(),
          clientcert: this.joi.string(),
          clientkey: this.joi.string(),
          rejectunauthorized: this.joi.boolean().default(true),
        })
        .default({ cachain: undefined, clientcert: undefined, clientkey: undefined, rejectunauthorized: true }),
      topic: this.joi.string().default(containerDefaultTopic),
      url: this.joi
        .string()
        .uri({ scheme: ['mqtt', 'mqtts', 'tcp', 'tls', 'ws', 'wss'] })
        .required(),
      user: this.joi.string(),
    });
  }

  async initTrigger() {
    // Enforce simple mode
    this.configuration.mode = 'simple';

    const options = { clientId: this.configuration.clientid };

    if (this.configuration.user) {
      options.username = this.configuration.user;
    }

    if (this.configuration.password) {
      options.password = this.configuration.password;
    }

    if (this.configuration.tls.clientkey) {
      options.key = await fs.readFile(this.configuration.tls.clientkey);
    }

    if (this.configuration.tls.clientcert) {
      options.cert = await fs.readFile(this.configuration.tls.clientcert);
    }

    if (this.configuration.tls.cachain) {
      options.ca = [await fs.readFile(this.configuration.tls.cachain)];
    }

    options.rejectUnauthorized = this.configuration.tls.rejectunauthorized;

    this.client = await mqtt.connectAsync(this.configuration.url, options);

    if (this.configuration.hass.enabled) {
      this.hass = new Hass({
        client: this.client,
        configuration: this.configuration,
        log: this.log,
      });
    }
    registerContainerAdded((container) => this.trigger(container));
    registerContainerUpdated((container) => this.trigger(container));
  }

  /**
   * Sanitize sensitive data
   * @returns {*}
   */
  maskConfiguration() {
    return {
      ...this.configuration,
      hass: this.configuration.hass,
      password: Mqtt.mask(this.configuration.password),
      topic: this.configuration.topic,
      url: this.configuration.url,
      user: this.configuration.user,
    };
  }

  /**
   * Send an MQTT message with new image version details.
   *
   * @param container the container
   * @returns {Promise}
   */
  async trigger(container) {
    const containerTopic = getContainerTopic({
      baseTopic: this.configuration.topic,
      container,
    });

    this.log.debug(`Publish container result to ${containerTopic}`);
    return this.client.publish(containerTopic, JSON.stringify(flatten(container)), {
      retain: true,
    });
  }

  /**
   * Mqtt trigger does not support batch mode.
   * @returns {Promise<void>}
   */

  async triggerBatch() {
    throw new Error('This trigger does not support "batch" mode');
  }
}

/**
 * Get container topic.
 * @param baseTopic
 * @param container
 * @return {string}
 */
function getContainerTopic({ baseTopic, container }) {
  return `${baseTopic}/${container.watcher}/${container.name}`;
}

module.exports = Mqtt;
