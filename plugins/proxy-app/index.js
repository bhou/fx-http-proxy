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
      port: 8080,
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

  // imports
  var logger = imports.logger('Proxy');
  var proxy = httpProxy.createProxyServer({ws: true});

  proxy.on('error', function (err, req, res) {
    res.writeHead(500, {
      'Content-Type': 'text/plain'
    });

    res.end(JSON.stringify({
      code: 500,
      data: 'Internal Error'
    }));
  });


  // init upstream
  var upstreamDB = new UpstreamDB(argv.us);
  var adminApi = new AdminApi(upstreamDB);

  var handlers = handlerBuilder(logger, proxy, adminApi, upstreamDB);
  upstreamDB.load(function () {
    var webHandler = handlers.webHandler;
    var socketHandler = handlers.webSocketHandler;


    if (!config.secureOnly) {
      var httpServer = http.createServer(webHandler).listen(config.port);
      httpServer.on('upgrade', socketHandler);
      logger.info("HTTP: listening on port", config.port);
    }

    if (config.secure) {
      var fs = require('fs');
      var hskey = fs.readFileSync(argv.key ? global.home + '/' + argv.key : global.home + '/key.pem');
      var hscert = fs.readFileSync(argv.key ? global.home + '/' + argv.cert : global.home + '/cert.pem');

      var credentials = {
        key: hskey,
        cert: hscert
      };
      var httpsServer = https.createServer(credentials, webHandler).listen(config.securePort);
      logger.info("HTTPS: listening on port", config.securePort);
    }

  });

  register(); // provides nothing
};