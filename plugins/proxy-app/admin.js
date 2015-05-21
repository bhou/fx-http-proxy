function AdminApi(upstreamDb) {
  this.upstreamDb = upstreamDb;
}

AdminApi.prototype.accept = function (req) {
  var os = require('os');

  var ip = (req.headers['x-forwarded-for'] || '').split(',')[0]
    || req.connection.remoteAddress;

  if (!ip) {
    return false;
  }

  if (ip == '127.0.0.1' || ip.indexOf('127.0.0.1') != -1) {
    return true;
  }

  var networkInterfaces = os.networkInterfaces();
  for (var key in networkInterfaces) {
    if (networkInterfaces.hasOwnProperty(key)) {
      if (networkInterfaces[key].address == ip) {
        return true;
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

  if (!query.route || !query.upstream) {
    return res.end(JSON.stringify({
      code: 400,
      data: 'Bad Request'
    }));
  }

  this.upstreamDb.addUpstream(query.route, query.upstream, function () {
    res.end(JSON.stringify({
      code: 200,
      data: 'OK'
    }))
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

  if (!query.route || !query.upstream) {
    return res.end(JSON.stringify({
      code: 400,
      data: 'Bad Request'
    }));
  }

  this.upstreamDb.removeUpstream(query.route, query.upstream, function () {
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

  if (!query.route) {
    return res.end(JSON.stringify({
      code: 200,
      data: self.upstreamDb.getAllUpstream()
    }));
  }

  return res.end(JSON.stringify({
    code: 200,
    data: self.upstreamDb.getRouteUpstream(query.route)
  }));
};


module.exports = AdminApi;