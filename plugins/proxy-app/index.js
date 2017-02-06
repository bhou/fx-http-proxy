var http = require('http');
var https = require('https');
var url = require('url');
var path = require('path');
var httpProxy = require('http-proxy');

var UpstreamDB = require('./upstreams');
var AdminApi = require('./admin');

var handlerBuilder = require('./handlers');

module.exports = function (options, imports, register) {
  // options
  var config = options.config || {
      port: 80,
      securePort: 443,
      secure: false,
      secureOnly: false
    };

  /* update config from arguments */
  var argv = options.argv;
  if (argv.port) {
    config.port = argv.port;
  }
  if (argv.sp) {
    config.securePort = argv.sp;
  }
  if (argv.es) {
    config.secure = true;
  }
  if (argv.so) {
    config.secureOnly = true;
  }
  if (argv.domains) {
    var domains = argv.domains.split(',');
    config.domains = domains;
  } else {
    config.domains = [];
  }
  if (argv.email) {
    config.email = argv.email;
  } else {
    config.email = '';
  }
  if (argv.prod) {
    config.prod = true;
  } else {
    config.prod = false;
  }

  // imports
  var logger = imports.logger.getLogger('Proxy');
  var proxy = httpProxy.createProxyServer({ws: true});

  proxy.on('error', function (err, req, res) {
    res.writeHead(err.statusCode || 500, {
      'Content-Type': 'text/plain'
    });

    res.end(JSON.stringify({
      code: err.statusCode || 500,
      data: 'Internal Error'
    }));
  });

  // init upstream
  var upstreamDB = new UpstreamDB(argv.us);
  var adminApi = new AdminApi(upstreamDB);

  var handlers = handlerBuilder(logger, proxy, adminApi, upstreamDB, config);
  upstreamDB.load(function () {
    var webHandler = handlers.webHandler;
    var socketHandler = handlers.webSocketHandler;

    if (config.secure) {
      
      logger.info('HTTPS enabled');
      logger.info('letsencrypt config:');
      logger.info('- approved domains:', config.domains);
      logger.info('- email:', config.email);
      logger.info('- for production:', config.prod);

      function approveDomains(opts, certs, cb) {
        if (certs) {
          opts.domains = config.domains; //certs.altnames;
        }
        else {
          opts.email = config.email; 
          opts.agreeTos = true;
        }

        cb(null, { options: opts, certs: certs });
      }

      var lexOpt = {
        server: config.prod ? 'https://acme-v01.api.letsencrypt.org/directory' : 'staging', 
        approveDomains: approveDomains
      };
      logger.info('letsencrypt option - server:', lexOpt.server);
      logger.info('letsencrypt option - approvedDomains:', config.domains);
      var lex = require('letsencrypt-express').create(lexOpt);

      var httpServer = http.createServer(lex.middleware(require('redirect-https')())).listen(config.port);
      httpServer.on('upgrade', socketHandler);
      logger.info("HTTP: listening on port", config.port);

      var httpsServer = https.createServer(lex.httpsOptions, lex.middleware(webHandler)).listen(config.securePort, function () {
        logger.info("Listening for ACME tls-sni-01 challenges and serve app on", config.securePort);
      });
      httpsServer.on('upgrade', socketHandler);
    } else {

      logger.info('HTTPS disabled')
      var httpServer = http.createServer(webHandler).listen(config.port);
      httpServer.on('upgrade', socketHandler);
      logger.info("HTTP: listening on port", config.port);
    }
  });

  register(); // provides nothing
};
