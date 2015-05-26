/**
 * Created by B.HOU on 5/26/2015.
 */
var url = require('url');

function getWebHandler(logger, proxy, adminApi, upstreamDB, config) {
  return function (req, res) {
    try {
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
      }

      var route = '/' + pathname.split('/')[1];

      var upstream = upstreamDB.nextUpstream(route);

      logger.info(req.method, req.url, '-->', upstream + req.url);
      proxy.proxyRequest(req, res, {
        target: upstream
      });

    } catch (e) {
      logger.error(e);
      res.writeHead(500, {
        'Content-Type': 'text/plain'
      });

      res.end(JSON.stringify({
        code: 500,
        data: 'Internal Error'
      }));
    }
  }
}

function getWebSocketHandler(logger, proxy, upstreamDB, config) {
  return function (req, socket, head) {
    try {
      var pathname = url.parse(req.url).pathname;

      var route = '/' + pathname.split('/')[1];

      var upstream = upstreamDB.nextUpstream(route);

      logger.info('SOCK', req.url, '-->', upstream + req.url);

      proxy.proxyWebsocketRequest(req, socket, head, {
        target: upstream
      });
    } catch (e) {
      logger.error(e);
    }
  }
}

module.exports = function (logger, proxy, adminApi, upstreamDB, config) {
  return {
    webHandler: getWebHandler(logger, proxy, adminApi, upstreamDB, config),
    webSocketHandler: getWebSocketHandler(logger, proxy, upstreamDB, config)
  }
};