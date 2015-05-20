var http = require('http');
var httpProxy = require('http-proxy');

var upstreams = {
  "/path1": [
    "127.0.0.1:8080"
  ]
};

var ipHash = {};

function removeRoute(app, route) {
  for (var i = 0, len = app._router.stack.length; i < len; ++i) {
    if (!app._router.stack[i].route) {
      continue;
    }

    if (app._router.stack[i].route.path == route) {
      app._router.stack[i].splice(i, 1);
      return true;
    }
  }

  return false;
}

function addUpstream(req, res, app, proxy, route, upstream) {
  if (!upstreams.hasOwnProperty(route)) {
    upstreams.route = [upstream];
  }

  if (!upstreams[route].hasOwnProperty(upstream)) {
    upstreams[route].push(upstream);
  }

  app.all(route, function (req, res) {
    // get ip
    //var ip =

    var upstreamList = upstreams[route];
    for (var i = 0; i < upstreamList.length; i++) {
      proxy.proxyRequest(req, res, {target: upstream});
    }
  });
}

module.exports = function (options, imports, register) {
  // options
  var config = options.config || {
      port: 80
    };

  // imports
  var logger = imports.logger('Proxy');
  var express = imports.express;
  var server = imports.server;
  var app = imports.webapp;
  var middlewares = imports.middlewares;

  var proxy = httpProxy.createProxyServer({});

  // apply global middlewares
  for (var key in middlewares) {
    if (middlewares.hasOwnProperty(key) && typeof middlewares[key] === 'function') {
      app.use(middlewares[key]);
    }
  }

  /* add upstream */
  app.post('/admin', function (req, res) {
    var route = req.body.route;
    var upstream = req.body.upstream;

    removeRoute(app, route);
    addUpstream(req, res, app, route, upstream);

    res.end(JSON.stringify({
      code: 200,
      data: 'OK'
    }))
  });


  logger.info("listening on port", config.port);
  server.listen(config.port);

  register(); // provides nothing
};