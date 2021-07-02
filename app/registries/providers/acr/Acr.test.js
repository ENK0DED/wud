const Acr = require('./Acr');

const acr = new Acr();
acr.configuration = {
    clientid: 'clientid',
    clientsecret: 'clientsecret',
};

test('validatedConfiguration should initialize when configuration is valid', () => {
    expect(acr.validateConfiguration({
        clientid: 'clientid',
        clientsecret: 'clientsecret',
    })).toStrictEqual({
        clientid: 'clientid',
        clientsecret: 'clientsecret',
    });
});

test('validatedConfiguration should throw error when configuration item is missing', () => {
    expect(() => {
        acr.validateConfiguration({});
    }).toThrow('"clientid" is required');
});

test('maskConfiguration should mask configuration secrets', () => {
    expect(acr.maskConfiguration()).toEqual({
        clientid: 'clientid',
        clientsecret: 'c**********t',
    });
});

test('match should return true when registry url is from acr', () => {
    expect(acr.match({
        registry: {
            url: 'test.azurecr.io',
        },
    })).toBeTruthy();
});

test('match should return false when registry url is not from acr', () => {
    expect(acr.match({
        registry: {
            url: 'est.notme.io',
        },
    })).toBeFalsy();
});

test('authenticate should add basic auth', () => {
    expect(acr.authenticate(undefined, { headers: {} })).resolves.toEqual({
        headers: {
            Authorization: 'Basic Y2xpZW50aWQ6Y2xpZW50c2VjcmV0',
        },
    });
});
