/**
 * Created by B.HOU on 5/26/2015.
 */
var url = require('url');

function getWebHandler(logger, proxy, adminApi, upstreamDB) {
  return function (req, res) {
    try {
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

function getWebSocketHandler(logger, proxy, upstreamDB) {
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

module.exports = function (logger, proxy, adminApi, upstreamDB) {
  return {
    webHandler: getWebHandler(logger, proxy, adminApi, upstreamDB),
    webSocketHandler: getWebSocketHandler(logger, proxy, upstreamDB)
  }
};