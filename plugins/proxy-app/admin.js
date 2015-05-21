function AdminApi(upstreamDb) {
  this.upstreamDb = upstreamDb;
}

AdminApi.prototype.addUpstream = function (req, res) {
  var url = require('url');
  var query = url.parse(req.url, true).query;

  if (!query.route || !query.upstream) {
    return res.end(JSON.stringify({
      code: 400,
      data: 'Bad Request'
    }));
  }

  this.upstreamDb.addUpstream(query.route, query.upstream, function() {
    res.end(JSON.stringify({
      code: 200,
      data: 'OK'
    }))
  });
};

AdminApi.prototype.removeUpstream = function (req, res) {
  var url = require('url');
  var query = url.parse(req.url, true).query;

  if (!query.route || !query.upstream) {
    return res.end(JSON.stringify({
      code: 400,
      data: 'Bad Request'
    }));
  }

  this.upstreamDb.removeUpstream(query.route, query.upstream, function() {
    res.end(JSON.stringify({
      code: 200,
      data: 'OK'
    }))
  });
};


AdminApi.prototype.getUpstreams = function (req, res) {
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