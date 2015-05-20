/**
 * Created by B.HOU on 5/20/2015.
 */
var JSON_FILE = global.home + '/upstreams.json';

function UpstreamDB() {
  this.upstreams = {};
}

UpstreamDB.prototype.load = function (done) {
  var self = this;

  var fs = require('fs');

  fs.exists(JSON_FILE, function (exists) {
    if (require.cache.hasOwnProperty(JSON_FILE)) {
      delete require.cache[require.resolve(JSON_FILE)];
    }

    if (exists) {
      self.upstreams = require(JSON_FILE);
    }

    done();
  });
};

UpstreamDB.prototype.addUpstream = function (route, upstream, done) {
  if (!this.upstreams.hasOwnProperty(route)) {
    this.upstreams[route] = [];
  }

  if (!this.upstreams[route].hasOwnProperty(upstream)) {
    this.upstreams[route].push(upstream);
  }

  // save file
  save(done);
};

UpstreamDB.prototype.removeUpstream = function (route, upstream, done) {
  if (!this.upstreams.hasOwnProperty(route)) {
    return save(done);
  }

  var index = this.upstreams[route].indexOf(upstream);
  if (index > -1) {
    this.upstreams[route].splice(index, 1);
  }

  // save file
  save(done);
};

UpstreamDB.prototype.getRouteUpstream = function (route) {
  if (!this.upstreams.hasOwnProperty(route)) {
    return [];
  }

  return this.upstreams[route];
};

UpstreamDB.prototype.getAllUpstream = function () {
  return this.upstreams;
};

UpstreamDB.prototype.save = function (done) {
  var fs = require('fs');

  fs.writeFile(JSON_FILE, JSON.stringify(this.upstreams, null, 2), done);
};

module.exports = UpstreamDB;