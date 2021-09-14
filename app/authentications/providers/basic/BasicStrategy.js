const { BasicStrategy: HttpBasicStrategy } = require('passport-http');

/**
 * Inherit from Basic Strategy including Session support.
 * @type {module.MyStrategy}
 */
module.exports = class BasicStrategy extends HttpBasicStrategy {
    authenticate(req) {
        // Already authenticated (thanks to session) => ok
        if (req.isAuthenticated()) {
            return this.success(req.user);
        }
        return super.authenticate(req);
    }

    /**
     * Override challenge to avoid browser popup on 401 errrors.
     * @returns {string}
     * @private
     */
    // eslint-disable-next-line class-methods-use-this
    _challenge() {
        return 401;
    }
};
