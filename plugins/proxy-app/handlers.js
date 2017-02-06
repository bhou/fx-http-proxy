/**
 * Created by B.HOU on 5/26/2015.
 */
var url = require('url');
var finalhandler = require("finalhandler");
var serveStatic = require('serve-static');
var utils = require('./utils');
var userinfo = null;


function getWebHandler(logger, proxy, adminApi, upstreamDB, config) {
  // Serve up public folder
  var serve = serveStatic('./public', {'index': ['index.html', 'index.htm']})

  return function (req, res) {
    var time = process.hrtime();
    try {
      // this is handled by letsencrypt lib, keep the code here in case you dont want to use letsencrypt
      if (config.secure && config.secureOnly) {  // enable secure, and secure only
        // force https: redirect to https if protocol is http
        if (!req.connection.encrypted) {
          var hostname = null;
          var parts = req.headers['host'].split(':');
          if (parts.length > 1) {
            hostname = parts[0] + ':' + config.securePort;
          } else {
            hostname = req.headers['host'] + ':' + config.securePort;
          }

          var secureTarget = "https://" + hostname + req.url;
          logger.info('redirect to https -->', secureTarget);
          res.writeHead(301,
            {Location: secureTarget}
          );
          return res.end();
        }
      }

      var pathname = url.parse(req.url).pathname;

      if (pathname.lastIndexOf('/proxy/add', 0) == 0) {
        return adminApi.addUpstream(req, res);
      } else if (pathname.lastIndexOf('/proxy/remove', 0) == 0) {
        return adminApi.removeUpstream(req, res);
      } else if (pathname.lastIndexOf('/proxy/upstream', 0) == 0) {
        return adminApi.getUpstreams(req, res);
      } else if (pathname.lastIndexOf('/proxy/update', 0) == 0) {
        return adminApi.updateUpstreams(req, res);
      } else if (pathname.lastIndexOf('/proxy/console', 0) == 0) {
        // check authorization header
        return basicAuth(req, res, function() {
          return serve(req, res, finalhandler(req, res));
        });
      } 

      var route = '/' + pathname.split('/')[1];

      var upstream = upstreamDB.nextUpstream(req.headers['host'], route);

      var diff = process.hrtime(time);
      logger.info(req.method, req.url, '-->', upstream + req.url, (diff[0] * 1e9 + diff[1]) / 1e6, 'ms');
      proxy.proxyRequest(req, res, {
        target: upstream
      });

    } catch (e) {
      logger.error(e);
      res.writeHead(e.statusCode || 500, {
        'Content-Type': 'text/plain'
      });

      let data = null;
      switch (e.statusCode) {
        case 404:
          data = 'Not found!';
          break;
        case 401:
          data = 'Unauthorized!';
          break;
        default:
          data = 'Proxy Error: please verify your request';
          break;
      }

      res.end(JSON.stringify({
        code: e.statusCode || 500,
        data: data,
      }));

    }
  }
}

function getWebSocketHandler(logger, proxy, upstreamDB, config) {
  return function (req, socket, head) {
    try {
      var pathname = url.parse(req.url).pathname;

      var route = '/' + pathname.split('/')[1];

      var upstream = upstreamDB.nextUpstream(req.headers['host'], route);

      logger.info('SOCK', req.url, '-->', upstream + req.url);

      proxy.proxyWebsocketRequest(req, socket, head, {
        target: upstream
      });
    } catch (e) {
      logger.error(e);
    }
  }
}

function basicAuth(req, res, done) {
  if (!userinfo) {
    userinfo = require('./utils').loadUserInfo(__dirname + '/../../users.htpasswd');
  }

  if (!req.headers || !req.headers.hasOwnProperty('authorization')) {
    return requestBasicAuth(res);
  }

  var token = req.headers["authorization"];

  if (userinfo.tokens.indexOf(token) >= 0) {
    done();
  } else {
    return requestBasicAuth(res);
  }
}

function requestBasicAuth(res) {
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="fx http proxy"'
  });

  res.end("Unauthorized");
}

module.exports = function (logger, proxy, adminApi, upstreamDB, config) {
  return {
    webHandler: getWebHandler(logger, proxy, adminApi, upstreamDB, config),
    webSocketHandler: getWebSocketHandler(logger, proxy, upstreamDB, config)
  }
};
