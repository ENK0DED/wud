const { Kafka: KafkaClient } = require('kafkajs');
const Trigger = require('../Trigger');

/**
 * Kafka Trigger implementation
 */
class Kafka extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            brokers: this.joi.string().required(),
            topic: this.joi.string().default('wud-container'),
            clientId: this.joi.string().default('wud'),
            ssl: this.joi.boolean().default(false),
            authentication: this.joi.object({
                type: this.joi.string()
                    .allow('PLAIN')
                    .allow('SCRAM-SHA-256')
                    .allow('SCRAM-SHA-512')
                    .default('PLAIN'),
                user: this.joi.string().required(),
                password: this.joi.string().required(),
            }),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        const conf = {
            ...this.configuration,
        };
        if (conf.authentication) {
            conf.authentication = {
                ...conf.authentication,
                password: Kafka.mask(conf.authentication.password),
            };
        }
        return conf;
    }

    /**
     * Init trigger.
     */
    initTrigger() {
        const brokers = this.configuration.brokers.split(/\s*,\s*/).map((broker) => broker.trim());
        const clientConfiguration = {
            clientId: this.configuration.clientId,
            brokers,
            ssl: this.configuration.ssl,
        };
        if (this.configuration.authentication) {
            clientConfiguration.sasl = {
                mechanism: this.configuration.authentication.type,
                username: this.configuration.authentication.user,
                password: this.configuration.authentication.password,
            };
        }
        this.kafka = new KafkaClient(clientConfiguration);
    }

    /**
     * Send a record to a Kafka topic with new container version details.
     *
     * @param container the container
     * @returns {Promise<void>}
     */
    async notify(container) {
        const producer = this.kafka.producer();
        await producer.connect();
        return producer.send({
            topic: this.configuration.topic,
            messages: [{ value: JSON.stringify(container) }],
        });
    }
}

module.exports = Kafka;
