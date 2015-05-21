var http = require('http');
var url = require('url');
var httpProxy = require('http-proxy');

var UpstreamDB = require('./upstreams');
var AdminApi = require('./admin');

module.exports = function (options, imports, register) {
  // options
  var config = options.config || {
      port: 8080,
      securePort: 433,
      secure: false,
      secureOnly: false
    };

  // imports
  var logger = imports.logger('Proxy');
  var proxy = httpProxy.createProxyServer({});

  // init upstream
  var upstreamDB = new UpstreamDB();
  var adminApi = new AdminApi(upstreamDB);
  upstreamDB.load(function () {
    var handler = function (req, res) {
      var pathname = url.parse(req.url).pathname;

      if (pathname.lastIndexOf('/proxy/add', 0) == 0) {
        return adminApi.addUpstream(req, res);
      } else if (pathname.lastIndexOf('/proxy/remove', 0) == 0) {
        return adminApi.removeUpstream(req, res);
      } else if (pathname.lastIndexOf('/proxy/upstream', 0) == 0) {
        return adminApi.getUpstreams(req, res);
      }

      var route = '/' + pathname.split('/')[1];

      var upstream = upstreamDB.nextUpstream(route);

      try {
        proxy.proxyRequest(req, res, {
          target: upstream
        });
      } catch (e) {
        logger.error(e);
        res.end(JSON.stringify({
          code: 500,
          data: 'Internal Error'
        }));
      }

    };


    if (!config.secureOnly) {
      var httpServer = http.createServer(handler).listen(config.port);
      logger.info("HTTP: listening on port", config.port);
    }

    if (config.secure) {
      var httpsServer = http.createServer({}, handler).listen(config.securePort);
      logger.info("HTTPS: listening on port", config.securePort);
    }
  });

  register(); // provides nothing
};