const { getVersion } = require('../../../configuration');
const { registerContainerAdded, registerContainerRemoved, registerContainerUpdated, registerWatcherStart, registerWatcherStop } = require('../../../event');
const containerStore = require('../../../store/container');

const HASS_DEVICE_ID = 'wud';
const HASS_DEVICE_NAME = 'wud';
const HASS_MANUFACTURER = 'wud';
const HASS_ENTITY_VALUE_TEMPLATE = '{{ value_json.image_tag_value }}';
const HASS_LATEST_VERSION_TEMPLATE =
  '{% if value_json.update_kind_kind == "digest" %}{{ value_json.result_digest[:15] }}{% else %}{{ value_json.result_tag }}{% endif %}';

class Hass {
  constructor({ client, configuration, log }) {
    this.client = client;
    this.configuration = configuration;
    this.log = log;

    // Subscribe to container events to sync HA
    registerContainerAdded((container) => this.addContainerSensor(container));
    registerContainerUpdated((container) => this.addContainerSensor(container));
    registerContainerRemoved((container) => this.removeContainerSensor(container));

    // Subscribe to watcher events to sync HA
    registerWatcherStart((watcher) => this.updateWatcherSensors({ isRunning: true, watcher }));
    registerWatcherStop((watcher) => this.updateWatcherSensors({ isRunning: false, watcher }));
  }

  /**
   * Add container sensor.
   * @param container
   * @returns {Promise<void>}
   */
  async addContainerSensor(container) {
    const containerStateTopic = this.getContainerStateTopic({ container });
    this.log.info(`Add hass container update sensor [${containerStateTopic}]`);

    if (this.configuration.hass.discovery) {
      await this.publishDiscoveryMessage({
        discoveryTopic: this.getDiscoveryTopic({ kind: 'update', topic: containerStateTopic }),
        icon: sanitizeIcon(container.displayIcon),
        name: container.displayName,
        options: {
          force_update: true,
          json_attributes_topic: containerStateTopic,
          latest_version_template: HASS_LATEST_VERSION_TEMPLATE,
          latest_version_topic: containerStateTopic,
          release_url: container.result ? container.result.link : undefined,
          value_template: HASS_ENTITY_VALUE_TEMPLATE,
        },
        stateTopic: containerStateTopic,
      });
    }

    await this.updateContainerSensors(container);
  }

  /**
   * Get container state topic.
   * @param container
   * @return {string}
   */
  getContainerStateTopic({ container }) {
    return `${this.configuration.topic}/${container.watcher}/${container.name}`;
  }

  /**
   * Get discovery topic for an entity topic.
   * @param kind
   * @param topic
   * @returns {string}
   */
  getDiscoveryTopic({ kind, topic }) {
    return `${this.configuration.hass.prefix}/${kind}/${getHassEntityId(topic)}/config`;
  }

  /**
   * Publish a discovery message.
   * @param discoveryTopic
   * @param stateTopic
   * @param name
   * @param icon
   * @param options
   * @returns {Promise<*>}
   */
  async publishDiscoveryMessage({ discoveryTopic, icon, name, options = {}, stateTopic }) {
    const entityId = getHassEntityId(stateTopic);
    return this.client.publish(
      discoveryTopic,
      JSON.stringify({
        device: getHaDevice(),
        entity_picture: 'https://github.com/getwud/wud/raw/main/docs/assets/wud-logo-256.png',
        icon: icon || sanitizeIcon('mdi:docker'),
        name: name || entityId,
        object_id: entityId,
        state_topic: stateTopic,
        unique_id: entityId,
        ...options,
      }),
      { retain: true },
    );
  }

  /**
   * Remove container sensor.
   * @param container
   * @returns {Promise<void>}
   */
  async removeContainerSensor(container) {
    const containerStateTopic = this.getContainerStateTopic({ container });
    this.log.info(`Remove hass container update sensor [${containerStateTopic}]`);

    if (this.configuration.hass.discovery) {
      await this.removeSensor({ discoveryTopic: this.getDiscoveryTopic({ kind: 'update', topic: containerStateTopic }) });
    }

    await this.updateContainerSensors(container);
  }

  /**
   * Publish an empty message to discovery topic to remove the sensor.
   * @param discoveryTopic
   * @returns {Promise<*>}
   */
  async removeSensor({ discoveryTopic }) {
    return this.client.publish(discoveryTopic, JSON.stringify({}), { retain: true });
  }

  async updateContainerSensors(container) {
    // Sensor topics
    const totalCountTopic = `${this.configuration.topic}/total_count`;
    const totalUpdateCountTopic = `${this.configuration.topic}/update_count`;
    const totalUpdateStatusTopic = `${this.configuration.topic}/update_status`;
    const watcherTotalCountTopic = `${this.configuration.topic}/${container.watcher}/total_count`;
    const watcherUpdateCountTopic = `${this.configuration.topic}/${container.watcher}/update_count`;
    const watcherUpdateStatusTopic = `${this.configuration.topic}/${container.watcher}/update_status`;

    // Discovery topics
    const totalCountDiscoveryTopic = this.getDiscoveryTopic({ kind: 'sensor', topic: totalCountTopic });
    const totalUpdateCountDiscoveryTopic = this.getDiscoveryTopic({ kind: 'sensor', topic: totalUpdateCountTopic });
    const totalUpdateStatusDiscoveryTopic = this.getDiscoveryTopic({ kind: 'binary_sensor', topic: totalUpdateStatusTopic });
    const watcherTotalCountDiscoveryTopic = this.getDiscoveryTopic({ kind: 'sensor', topic: watcherTotalCountTopic });
    const watcherUpdateCountDiscoveryTopic = this.getDiscoveryTopic({ kind: 'sensor', topic: watcherUpdateCountTopic });
    const watcherUpdateStatusDiscoveryTopic = this.getDiscoveryTopic({ kind: 'binary_sensor', topic: watcherUpdateStatusTopic });

    // Publish discovery messages
    if (this.configuration.hass.discovery) {
      await this.publishDiscoveryMessage({
        discoveryTopic: totalCountDiscoveryTopic,
        name: 'Total container count',
        stateTopic: totalCountTopic,
      });

      await this.publishDiscoveryMessage({
        discoveryTopic: totalUpdateCountDiscoveryTopic,
        name: 'Total container update count',
        stateTopic: totalUpdateCountTopic,
      });

      await this.publishDiscoveryMessage({
        discoveryTopic: totalUpdateStatusDiscoveryTopic,
        name: 'Total container update status',
        options: { payload_off: false.toString(), payload_on: true.toString() },
        stateTopic: totalUpdateStatusTopic,
      });

      await this.publishDiscoveryMessage({
        discoveryTopic: watcherTotalCountDiscoveryTopic,
        name: `Watcher ${container.watcher} container count`,
        stateTopic: watcherTotalCountTopic,
      });

      await this.publishDiscoveryMessage({
        discoveryTopic: watcherUpdateCountDiscoveryTopic,
        name: `Watcher ${container.watcher} container update count`,
        stateTopic: watcherUpdateCountTopic,
      });

      await this.publishDiscoveryMessage({
        discoveryTopic: watcherUpdateStatusDiscoveryTopic,
        name: `Watcher ${container.watcher} container update status`,
        options: { payload_off: false.toString(), payload_on: true.toString() },
        stateTopic: watcherUpdateStatusTopic,
      });
    }

    // Count all containers
    const totalCount = containerStore.getContainers().length;
    const updateCount = containerStore.getContainers({ updateAvailable: true }).length;

    // Count all containers belonging to the current watcher
    const watcherTotalCount = containerStore.getContainers({ watcher: container.watcher }).length;
    const watcherUpdateCount = containerStore.getContainers({ updateAvailable: true, watcher: container.watcher }).length;

    // Publish sensors
    await this.updateSensor({ topic: totalCountTopic, value: totalCount });
    await this.updateSensor({ topic: totalUpdateCountTopic, value: updateCount });
    await this.updateSensor({ topic: totalUpdateStatusTopic, value: updateCount > 0 });
    await this.updateSensor({ topic: watcherTotalCountTopic, value: watcherTotalCount });
    await this.updateSensor({ topic: watcherUpdateCountTopic, value: watcherUpdateCount });
    await this.updateSensor({ topic: watcherUpdateStatusTopic, value: watcherUpdateCount > 0 });

    // Delete watcher sensors when watcher does not exist anymore
    if (watcherTotalCount === 0 && this.configuration.hass.discovery) {
      await this.removeSensor({ discoveryTopic: watcherTotalCountDiscoveryTopic });
      await this.removeSensor({ discoveryTopic: watcherUpdateCountDiscoveryTopic });
      await this.removeSensor({ discoveryTopic: watcherUpdateStatusDiscoveryTopic });
    }
  }

  /**
   * Publish a sensor message.
   * @param topic
   * @param value
   * @returns {Promise<*>}
   */
  async updateSensor({ topic, value }) {
    return this.client.publish(topic, value.toString(), { retain: true });
  }

  async updateWatcherSensors({ isRunning, watcher }) {
    const watcherStatusTopic = `${this.configuration.topic}/${watcher.name}/running`;
    const watcherStatusDiscoveryTopic = this.getDiscoveryTopic({ kind: 'binary_sensor', topic: watcherStatusTopic });

    // Publish discovery messages
    if (this.configuration.hass.discovery) {
      await this.publishDiscoveryMessage({
        discoveryTopic: watcherStatusDiscoveryTopic,
        name: `Watcher ${watcher.name} running status`,
        options: { payload_off: false.toString(), payload_on: true.toString() },
        stateTopic: watcherStatusTopic,
      });
    }

    // Publish sensors
    await this.updateSensor({ topic: watcherStatusTopic, value: isRunning });
  }
}

/**
 * Get HA wud device info.
 * @returns {*}
 */
function getHaDevice() {
  return { identifiers: [HASS_DEVICE_ID], manufacturer: HASS_MANUFACTURER, model: HASS_DEVICE_ID, name: HASS_DEVICE_NAME, sw_version: getVersion() };
}

/**
 * Get hass entity unique id.
 * @param topic
 * @return {*}
 */
function getHassEntityId(topic) {
  return topic.replaceAll(/[./]/g, '_');
}

/**
 * Sanitize icon to meet hass requirements.
 * @param icon
 * @return {*}
 */
function sanitizeIcon(icon) {
  return icon.replace('mdi-', 'mdi:').replace('fa-', 'fa:').replace('fab-', 'fab:').replace('far-', 'far:').replace('fas-', 'fas:').replace('si-', 'si:');
}

module.exports = Hass;
