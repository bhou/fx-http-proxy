var requestIp = require('request-ip');

function AdminApi(upstreamDb) {
  this.upstreamDb = upstreamDb;
}

AdminApi.prototype.accept = function (req) {
  var os = require('os');

  var ip = requestIp.getClientIp(req);

  if (!ip) {
    return false;
  }

  if (ip == '127.0.0.1'
    || ip == '::1'  // ipv6's 127.0.0.1
    || ip.indexOf('127.0.0.1') != -1) {
    return true;
  }

  var networkInterfaces = os.networkInterfaces();
  for (var key in networkInterfaces) {
    if (networkInterfaces.hasOwnProperty(key)) {
      var interfaces = networkInterfaces[key];

      for (var i = 0; i < interfaces.length; i++) {
        if (interfaces[i].address == ip
          || interfaces[i].address.indexOf(ip) != -1
          || ip.indexOf(interfaces[i].address) != -1) {
          return true;
        }
      }
    }
  }

  return false;
};

AdminApi.prototype.addUpstream = function (req, res) {
  if (!this.accept(req)) {
    return res.end(JSON.stringify({
      code: 401,
      data: 'Unauthorized'
    }));
  }

  var url = require('url');
  var query = url.parse(req.url, true).query;

  if (!query.domain || !query.subdomain || !query.route || !query.upstream) {
    return res.end(JSON.stringify({
      code: 400,
      data: 'Bad Request'
    }));
  }

  this.upstreamDb.addUpstream(query.domain, query.subdomain, query.route, query.upstream, function () {
    res.end(JSON.stringify({
      code: 200,
      data: 'OK'
    }));
  });
};

AdminApi.prototype.removeUpstream = function (req, res) {
  if (!this.accept(req)) {
    return res.end(JSON.stringify({
      code: 401,
      data: 'Unauthorized'
    }));
  }

  var url = require('url');
  var query = url.parse(req.url, true).query;

  if (!query.domain || !query.subdomain || !query.route || !query.upstream) {
    return res.end(JSON.stringify({
      code: 400,
      data: 'Bad Request'
    }));
  }

  this.upstreamDb.removeUpstream(query.domain, query.subdomain, query.route, query.upstream, function () {
    res.end(JSON.stringify({
      code: 200,
      data: 'OK'
    }))
  });
};


AdminApi.prototype.getUpstreams = function (req, res) {
  if (!this.accept(req)) {
    return res.end(JSON.stringify({
      code: 401,
      data: 'Unauthorized'
    }));
  }

  var url = require('url');
  var self = this;
  var query = url.parse(req.url, true).query;

  if (!query.domain || !query.subdomain || !query.route) {
    return res.end(JSON.stringify({
      code: 200,
      data: self.upstreamDb.getAllUpstream()
    }, null, 4));
  }

  return res.end(JSON.stringify({
    code: 200,
    data: self.upstreamDb.getRouteUpstream(query.domain, query.subdomain, query.route)
  }, null, 4));
};


module.exports = AdminApi;