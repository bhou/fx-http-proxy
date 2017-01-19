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

  // imports
  var logger = imports.logger.getLogger('Proxy');
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

  var handlers = handlerBuilder(logger, proxy, adminApi, upstreamDB, config);
  upstreamDB.load(function () {
    var webHandler = handlers.webHandler;
    var socketHandler = handlers.webSocketHandler;

    var le = require('letsencrypt').create({ server: 'staging' });

    var opts = {
      domains: ['localhost'], email: 'bo.hou@oobabyshop.com', agreeTos: true
    };

    /*le.register(opts).then(function (certs) {
      console.log(certs);
      // privkey, cert, chain, expiresAt, issuedAt, subject, altnames
    }, function (err) {
      console.error(err);
    });*/

    var httpServer = http.createServer(le.middleware(webHandler)).listen(config.port);
    httpServer.on('upgrade', socketHandler);
    logger.info("HTTP: listening on port", config.port);

    var httpsServer = https.createServer(le.middleware(webHandler)).listen(config.securePort);
    httpsServer.on('upgrade', socketHandler);
    logger.info("HTTPS: listening on port", config.securePort);

    /*if (config.secure) {
      var fs = require('fs');
      var hskey = fs.readFileSync(argv.key ? path.join(global.home, argv.key) : path.join(global.home, '/key.pem'));
      var hscert = fs.readFileSync(argv.key ? path.join(global.home, argv.cert) : path.join(global.home, '/cert.pem'));

      var credentials = {
        key: hskey,
        cert: hscert
      };
      var httpsServer = https.createServer(credentials, webHandler).listen(config.securePort);
      logger.info("HTTPS: listening on port", config.securePort);
    }*/
  });

  register(); // provides nothing
};