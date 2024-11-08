const { ValidationError } = require('joi');

const Gotify = require('./Gotify');

const gotify = new Gotify();

const configurationValid = {
    url: 'http://xxx.com',
    token: 'xxx',
    priority: 2,
    mode: 'simple',
    threshold: 'all',
    once: true,
    // eslint-disable-next-line no-template-curly-in-string
    simpletitle: 'New ${kind} found for container ${name}',
    // eslint-disable-next-line no-template-curly-in-string
    simplebody: 'Container ${name} running with ${kind} ${local} can be updated to ${kind} ${remote}\n${link}',
    // eslint-disable-next-line no-template-curly-in-string
    batchtitle: '${count} updates available',
};

test('validateConfiguration should return validated configuration when valid', () => {
    const validatedConfiguration = gotify.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {
        url: 'git://xxx.com',
    };
    expect(() => {
        gotify.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});
