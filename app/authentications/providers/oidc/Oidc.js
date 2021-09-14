const { Issuer, generators } = require('openid-client');
const { v4: uuid } = require('uuid');
const Authentication = require('../Authentication');
const OidcStrategy = require('./OidcStrategy');
const { getPublicUrl } = require('../../../configuration');

/**
 * Htpasswd authentication.
 */
class Oidc extends Authentication {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            discovery: this.joi.string().uri().required(),
            clientid: this.joi.string().required(),
            clientsecret: this.joi.string().required(),
        });
    }

    async initAuthentication() {
        this.log.debug(`Discovering configuration from ${this.configuration.discovery}`);
        const issuer = await Issuer.discover(this.configuration.discovery);
        this.client = new issuer.Client({
            client_id: this.configuration.clientid,
            client_secret: this.configuration.clientsecret,
            response_types: ['code'],
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            clientid: Oidc.mask(this.configuration.clientid),
            clientsecret: Oidc.mask(this.configuration.clientsecret),
        };
    }

    /**
     * Return passport strategy.
     * @param app
     */
    getStrategy(app) {
        app.get(`/auth/oidc/${this.name}/redirect`, async (req, res) => this.redirect(req, res));
        app.get(`/auth/oidc/${this.name}/cb`, async (req, res) => this.callback(req, res));
        const strategy = new OidcStrategy(
            {
                client: this.client,
                params: {
                    scope: 'openid email profile',
                },
            },
            async (accessToken, done) => this.verify(accessToken, done),
            this.log,
        );
        strategy.name = 'oidc';
        return strategy;
    }

    getStrategyDescription() {
        return {
            type: 'oidc',
            name: this.name,
        };
    }

    async redirect(req, res) {
        const codeVerifier = generators.codeVerifier();
        const codeChallenge = generators.codeChallenge(codeVerifier);
        const state = uuid();

        req.session.oidc = {
            codeVerifier,
            state,
        };
        const authUrl = `${this.client.authorizationUrl({
            redirect_uri: `${getPublicUrl(req)}/auth/oidc/${this.name}/cb`,
            scope: 'openid email profile',
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            state,
        })}`;
        this.log.debug(`Build redirection url [${authUrl}]`);
        res.json({
            url: authUrl,
        });
    }

    async callback(req, res) {
        try {
            this.log.debug('Validate callback data');
            const params = this.client.callbackParams(req);
            const oidcChecks = req.session.oidc;

            const tokenSet = await this.client.callback(
                `${getPublicUrl(req)}/auth/oidc/${this.name}/cb`,
                params,
                {
                    response_type: 'code',
                    code_verifier: oidcChecks ? oidcChecks.codeVerifier : '',
                    state: oidcChecks ? oidcChecks.state : '',
                },
            );
            this.log.debug('Get user info');
            const user = await this.getUserFromAccessToken(tokenSet.access_token);

            this.log.debug('Perform passport login');
            req.login(user, (err) => {
                if (err) {
                    this.log.warn(`Error when logging the user [${err.message}]`);
                    res.status(401).send(err.message);
                } else {
                    this.log.debug('User authenticated => redirect to app');
                    res.redirect(`${getPublicUrl(req)}`);
                }
            });
        } catch (err) {
            this.log.warn(`Error when logging the user [${err.message}]`);
            res.status(401).send(err.message);
        }
    }

    async verify(accessToken, done) {
        try {
            const user = await this.getUserFromAccessToken(accessToken);
            done(null, user);
        } catch (e) {
            done(null, false);
        }
    }

    async getUserFromAccessToken(accessToken) {
        const userInfo = await this.client.userinfo(accessToken);
        return {
            username: userInfo.email || 'unknown',
        };
    }
}

module.exports = Oidc;
