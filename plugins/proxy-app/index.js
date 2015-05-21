var http = require('http');
var url = require('url');
var httpProxy = require('http-proxy');

var UpstreamDB = require('./upstreams');

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
  upstreamDB.load(function () {
    var handler = function (req, res) {
      var route = '/' + url.parse(req.url).pathname.split('/')[1];
      console.log(route);
      var upstream = upstreamDB.nextUpstream(route);
      console.log(upstream);
      proxy.proxyRequest(req, res, {
        target: upstream
      });
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


  http.createServer(function (req, res) {
    res.end('Hello World 1! ' + req.url);
  }).listen(8081);

  http.createServer(function (req, res) {
    res.end('Hello World 2! ' + req.url);
  }).listen(8082);

  http.createServer(function (req, res) {
    res.end('Hello World 3! ' + req.url);
  }).listen(8083);

  register(); // provides nothing
};