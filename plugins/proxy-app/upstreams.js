/**
 * Created by B.HOU on 5/20/2015.
 */
var JSON_FILE = global.home + '/upstreams.json';

function UpstreamDB(fileName) {
  if (fileName) {
    JSON_FILE = global.home + '/' + fileName;
  }

  this.upstreams = {};
  this.nexts = {};
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

    self.save(done);
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
  this.save(done);
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
  this.save(done);
};

UpstreamDB.prototype.getRouteUpstream = function (route) {
  if (!this.upstreams.hasOwnProperty(route)) {
    this.upstreams[route] = [];
  }

  return this.upstreams[route];
};

UpstreamDB.prototype.getAllUpstream = function () {
  return this.upstreams;
};

UpstreamDB.prototype.nextUpstream = function (route) {
  if (!this.upstreams.hasOwnProperty(route) || this.upstreams[route].length == 0) {
    if (!this.upstreams.hasOwnProperty('/') || this.upstreams['/'].length == 0) {
      throw new Error('No upstream found for ' + route);
    } else {
      route = '/';
    }
  }

  var upstreamList = this.upstreams[route];
  var currentUpstream = upstreamList[0];
  if (this.nexts.hasOwnProperty(route)) {
    currentUpstream = this.nexts[route];
  }

  var index = upstreamList.indexOf(currentUpstream);
  if (index < 0) {
    index = 0;
  }

  index = (index + 1) % upstreamList.length;

  this.nexts[route] = upstreamList[index];

  return this.nexts[route];
};

UpstreamDB.prototype.save = function (done) {
  var fs = require('fs');

  fs.writeFile(JSON_FILE, JSON.stringify(this.upstreams, null, 2), done);
};

module.exports = UpstreamDB;