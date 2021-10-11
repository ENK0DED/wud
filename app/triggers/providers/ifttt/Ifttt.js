const rp = require('request-promise-native');

const Trigger = require('../Trigger');

/**
 * Ifttt Trigger implementation
 */
class Ifttt extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            key: this.joi.string().required(),
            event: this.joi.string().default('wud-image'),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            key: Ifttt.mask(this.configuration.key),
        };
    }

    /**
     * Send an HTTP Request to Ifttt Webhook with new image version details.
     *
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        return this.sendHttpRequest({
            value1: container.name,
            value2: container.result.tag,
            value3: JSON.stringify(container),
        });
    }

    /**
     * end an HTTP Request to Ifttt Webhook with new image versions details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        return this.sendHttpRequest({
            value1: JSON.stringify(containers),
        });
    }

    /**
     * Send http request to ifttt.
     * @param body
     * @returns {Promise<*>}
     */
    async sendHttpRequest(body) {
        const options = {
            method: 'POST',
            uri: `https://maker.ifttt.com/trigger/${this.configuration.event}/with/key/${this.configuration.key}`,
            headers: {
                'Content-Type': 'application/json',
            },
            body,
            json: true,
        };
        return rp(options);
    }
}

module.exports = Ifttt;
