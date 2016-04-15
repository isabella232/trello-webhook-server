'use strict';

const WebhookRegistrar = require('./register-webhook');
const handlers = { };

function getHTTPServerSetup(tws, server) {
  const that = tws;
  return function setup(modelID) {
    that.config.modelID = modelID;
    server(); // placeholder
    handlers[modelID] = {
      data: []
    };
  };
}

function getOwnServerSetup(tws) {
  const that = tws;
  return function setup(modelID) {
    that.config.modelID = modelID;
    handlers[modelID] = {
      data: []
    };
  };
}

class TrelloWebhookServer {
  constructor(config) { // port, host, apiKey, apiToken, clientSecret) {
    if (!config) {
      throw new Error('Config is required');
    }
    this.config = { };
    if (config.server) {
      if (config.server.constructor.name === 'Server') {
        if (config.server.use) {
          this.config.server = config.server;
          this.start = require('./get-express-server-setup')(this, handlers);
        } else {
          this.config.server = config.server;
          this.start = getHTTPServerSetup(this, this.config.server);
        }
      } else {
        throw new Error('Server (config.server) must be an Express/Restify-style server or an Http.Server');
      }
    } else {
      let numPort = 0;
      numPort = Number(config.port);
      if (!config.port || Number.isNaN(numPort) || numPort < 0 || numPort > 65535) {
        throw new Error('Port (config.port) must be numeric, greater than 0 and less than 65536');
      }
      this.config.port = numPort;
      this.start = getOwnServerSetup(this);
    }

    if (!config.hostURL || !config.hostURL.match(/^https?:\/\//)) {
      throw new Error('Host URL (config.hostURL) must be specified and must begin with http:// or https://');
    }

    if (!config.apiKey) {
      throw new Error('Trello API key (config.apiKey) must be specified');
    }

    if (!config.apiToken) {
      throw new Error('Trello API token (config.apiToken) must be specified');
    }

    if (!config.clientSecret) {
      throw new Error('Trello client secret (config.clientSecret) must be specified');
    }

    this.config.hostURL = config.hostURL;
    this.config.clientSecret = config.clientSecret;

    this.registrar = new WebhookRegistrar(config.apiKey, config.apiToken);
  }

  cleanup() {
    return this.registrar.unregister();
  }

  on(eventName, handler) {
    if (!this.config.modelID) {
      throw new Error('Cannot subscribe to events prior to calling start');
    }
    if (!handlers[this.config.modelID]) {
      handlers[this.config.modelID] = { };
    }
    if (!Array.isArray(handlers[this.config.modelID][eventName])) {
      handlers[this.config.modelID][eventName] = [];
    }
    if (typeof handler === 'function') {
      handlers[this.config.modelID][eventName].push(handler);
    }
  }
}

module.exports = TrelloWebhookServer;
