global.home = __dirname;

var path = require('path');
var architect = require('architect');
var config = require('./architect-config');

var packageJson = require('./package.json');

var tree = architect.resolveConfig(config, __dirname);

var architectApp = architect.createApp(tree, function(err, app) {
  if (err) {
    console.log(err);
  }
}).on('error', function(err) {
  console.error(err.stack);
});

if (process.env.DEBUG || packageJson.debug) {
  // _serviceToPlugin and _plugins global variable only available when debug mode is enabled
  global._serviceToPlugin = {};
  global._plugins = {};

  var servicesBuf = [];
  architectApp
    .on('plugin', function(plugin) {
      console.info('registering plugin', plugin.packagePath);

      var pluginName = path.basename(plugin.packagePath);
      // update service to plugin map
      for (var i = 0; i < servicesBuf.length; i++) {
        global._serviceToPlugin[servicesBuf[i]] = pluginName;
      }

      // update plugins
      global._plugins[pluginName] = plugin;

      servicesBuf = [];
    }).on('service', function(name, service) {
      servicesBuf.push(name);
      console.info('registering service', name);
    });
}

global.runtime = architectApp;

