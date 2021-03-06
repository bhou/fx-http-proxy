var fs = require('fs');

module.exports = {
  loadUserInfo: function (file) {
    var users = {};
    var tokens = [];

    var lines = ((fs.readFileSync(file, 'UTF-8')).replace(/\r\n/g, "\n")).split("\n");

    for (var i = 0; i < lines.length; i++) {
      var userLine = lines[i];
      var parts = userLine.split(":");
      users[parts[0]] = parts[1];

      tokens.push("Basic " + new Buffer(userLine).toString('base64'));
    }

    return {
      users: users,
      tokens: tokens
    };
  }
};