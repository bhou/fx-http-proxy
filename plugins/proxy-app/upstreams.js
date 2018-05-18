/**
 * Created by B.HOU on 5/20/2015.
 */
var path = require('path');

var JSON_FILE = path.join(global.home, '/upstreams.json');

function UpstreamDB(fileName) {
  if (fileName) {
    JSON_FILE = path.join(global.home, '/upstreams.json');
  }

  this.upstreams = {};
  this.nexts = {};
  this.domains = [];
}

UpstreamDB.prototype.load = function (done) {
  var self = this;

  var fs = require('fs');

  fs.exists(JSON_FILE, function (exists) {
    //if (require.cache.hasOwnProperty(JSON_FILE)) {
    delete require.cache[require.resolve(JSON_FILE)];
    //}

    if (exists) {
      self.upstreams = require(JSON_FILE);
    }

    self.initDomains();

    self.save(done);
  });
};

UpstreamDB.prototype.update = function (upstreams, done) {
  var self = this;

  self.upstreams = upstreams;

  self.initDomains();

  self.save(done);
};

UpstreamDB.prototype.initDomains = function () {
  var self = this;

  self.domains = self.sortKey(self.upstreams, true, function (value) {
    return self.sortKey(value, false, null);
  });
};

UpstreamDB.prototype.sortKey = function (map, reverse, valueProcessor) {
  var ret = [];
  for (var key in map) {
    if (map.hasOwnProperty(key)) {
      var value = map[key];
      if (valueProcessor) {
        value = valueProcessor(value);
      }

      ret.push({
        key: reverse ? key.split('').reverse().join('') : key,
        value: value
      });
    }
  }

  ret.sort(function (a, b) {
    return b.key.length - a.key.length;
  });

  return ret;
};

UpstreamDB.prototype.addUpstream = function (domain, subdomain, route, upstream, done) {
  if (!this.upstreams.hasOwnProperty(domain)) {
    this.upstreams[domain] = {};
  }

  if (!this.upstreams[domain].hasOwnProperty(subdomain)) {
    this.upstreams[domain][subdomain] = {};
  }

  if (!this.upstreams[domain][subdomain].hasOwnProperty(route)) {
    this.upstreams[domain][subdomain][route] = [];
  }

  if (!this.upstreams[domain][subdomain][route].hasOwnProperty(upstream)) {
    this.upstreams[domain][subdomain][route].push(upstream);
  }

  // save file
  this.save(done);
};

UpstreamDB.prototype.removeUpstream = function (domain, subdomain, route, upstream, done) {
  if (!this.upstreams.hasOwnProperty(domain)) {
    return save(done);
  }

  if (!this.upstreams[domain].hasOwnProperty(subdomain)) {
    return save(done);
  }

  if (!this.upstreams[domain][subdomain].hasOwnProperty(route)) {
    return save(done);
  }

  var index = this.upstreams[domain][subdomain][route].indexOf(upstream);
  if (index > -1) {
    this.upstreams[domain][subdomain][route].splice(index, 1);
  }

  if (this.upstreams[domain][subdomain][route].length == 0) {
    delete this.upstreams[domain][subdomain][route];
  }

  if (Object.keys(this.upstreams[domain][subdomain]).length == 0) {
    delete this.upstreams[domain][subdomain];
  }

  if (Object.keys(this.upstreams[domain]).length == 0) {
    delete this.upstreams[domain];
  }

  // save file
  this.save(done);
};

UpstreamDB.prototype.getRouteUpstream = function (domain, subdomain, route) {
  if (!this.upstreams.hasOwnProperty(domain)) {
    this.upstreams[domain] = {};
  }

  if (!this.upstreams[domain].hasOwnProperty(subdomain)) {
    this.upstreams[domain][subdomain] = {};
  }

  if (!this.upstreams[domain][subdomain].hasOwnProperty(route)) {
    this.upstreams[domain][subdomain][route] = [];
  }

  return this.upstreams[domain][subdomain][route];
};

UpstreamDB.prototype.getDomainUpstream = function (domain) {
  if (!this.upstreams.hasOwnProperty(domain)) {
    this.upstreams[domain] = {};
  }

  return this.upstreams[domain];
};

UpstreamDB.prototype.getAllUpstream = function () {
  return this.upstreams;
};


UpstreamDB.prototype.nextUpstream = function (host, route) {
  var domainKey = '*';
  var subdomainKey = 'www';

  var reverseHost = host.split('').reverse().join('');
  for (var i = 0; i < this.domains.length; i++) {
    if (reverseHost.indexOf(this.domains[i].key) == 0) {
      domainKey = this.domains[i].key.split('').reverse().join('');

      for (var j = 0; j < this.domains[i].value.length; j++) {
        if (host.indexOf(this.domains[i].value[j].key) == 0) {
          subdomainKey = this.domains[i].value[j].key;
          break;
        }
      }
      break;
    }
  }

  return this.internalNextUpstream(domainKey, subdomainKey, route);
};

/**
 * Internal
 * @param domain
 * @param subdomain
 * @param route
 * @returns {*}
 */
UpstreamDB.prototype.internalNextUpstream = function (domain, subdomain, route) {
  if (!this.upstreams.hasOwnProperty(domain)) {
    if (!this.upstreams.hasOwnProperty('*')) {
      let error = new Error('No upstream defined for ' + domain);
      error.statusCode = 404;
      throw error;
    }
    domain = '*';
  }

  if (!this.upstreams[domain].hasOwnProperty(subdomain)) {
    if (!this.upstreams[domain].hasOwnProperty('www')) {
      let error = new Error('No upstream defined for ' + subdomain + '.' + domain);
      error.statusCode = 404;
      throw error;
    }
    subdomain = 'www';
  }

  if (!this.upstreams[domain][subdomain].hasOwnProperty(route) 
      || this.upstreams[domain][subdomain][route].length == 0) {
    if (!this.upstreams[domain][subdomain].hasOwnProperty('/') 
        || this.upstreams[domain][subdomain]['/'].length == 0) {
      let error = new Error('No upstream found for ' + subdomain + '.' + domain + route);
      error.statusCode = 404;
      throw error;
    } else {
      route = '/';
    }
  }

  var host = subdomain + '.' + domain;
  var upstreamList = this.upstreams[domain][subdomain][route];
  var currentUpstream = upstreamList[0];
  if (!this.nexts.hasOwnProperty(host)) {
    this.nexts[host] = {};
  }
  if (this.nexts[host].hasOwnProperty(route)) {
    currentUpstream = this.nexts[host][route];
  }

  var index = upstreamList.indexOf(currentUpstream);
  if (index < 0) {
    index = 0;
  }

  index = (index + 1) % upstreamList.length;

  this.nexts[host][route] = upstreamList[index];

  return this.nexts[host][route];
};

UpstreamDB.prototype.save = function (done) {
  this.initDomains();

  var fs = require('fs');

  fs.writeFile(JSON_FILE, JSON.stringify(this.upstreams, null, 2), done);
};

module.exports = UpstreamDB;
