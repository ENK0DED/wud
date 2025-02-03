const express = require('express');
const passport = require('passport');

const appRouter = require('./app');
const auth = require('./auth');
const authenticationRouter = require('./authentication');
const containerRouter = require('./container');
const logRouter = require('./log');
const registryRouter = require('./registry');
const serverRouter = require('./server');
const storeRouter = require('./store');
const triggerRouter = require('./trigger');
const watcherRouter = require('./watcher');

/**
 * Init the API router.
 * @returns {*|Router}
 */
function init() {
  const router = express.Router();

  router.use('/app', appRouter.init());

  // Routes to protect after this line
  router.use(passport.authenticate(auth.getAllIds()));

  router.use('/log', logRouter.init());
  router.use('/store', storeRouter.init());
  router.use('/server', serverRouter.init());
  router.use('/containers', containerRouter.init());
  router.use('/triggers', triggerRouter.init());
  router.use('/watchers', watcherRouter.init());
  router.use('/registries', registryRouter.init());
  router.use('/authentications', authenticationRouter.init());

  // All other API routes => 404
  router.get('/*', (request, response) => response.sendStatus(404));

  return router;
}

module.exports = {
  init,
};
