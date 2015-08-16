var editor;
var upstreams = {};
var schema = {};


function prebuild(data) {
  for (var key in data) {
    if (data.hasOwnProperty(key) && typeof data[key] === 'object') {
      prebuild(data[key]);

      var newKey = key;
      if (key.indexOf('.') > 0) {
        newKey = key.replace(/\./g, ':');

        data[newKey] = data[key];
        delete data[key];
      }
    }
  }

  return data;
}

function postbuild(data) {
  for (var key in data) {
    if (data.hasOwnProperty(key) && typeof data[key] === 'object') {
      prebuild(data[key]);

      var newKey = key;
      if (key.indexOf(':') > 0) {
        newKey = key.replace(/:/g, '.');

        data[newKey] = data[key];
        delete data[key];
      }
    }
  }

  return data;
}

function initEditor($, schema) {
  var element = document.getElementById('json-editor');

  if (editor) {
    editor.destroy();
  }

  editor = new JSONEditor(element, {
    schema: schema,
    ajax: true,
    theme: 'foundation5'
  });

  editor.on('change', function () {
    updateList($);
  });

  $.get('/proxy/upstreams', function (data) {
    upstreams = JSON.parse(data);
    upstreams = prebuild(upstreams.data)
    updateEditor($);
    updateList($);
  }).fail(function () {
    alert('Failed to get upstreams!');
  });
}

function updateEditor($) {
  editor.setValue(upstreams);
}

function updateList($) {
  $('#upstream-list').empty();
  var currentUpstreams = editor.getValue();
  for (var host in currentUpstreams) {
    if (currentUpstreams.hasOwnProperty(host)) {
      for (var subdomain in currentUpstreams[host]) {
        if (currentUpstreams[host].hasOwnProperty(subdomain)) {
          for (var path in currentUpstreams[host][subdomain]) {
            if (currentUpstreams[host][subdomain].hasOwnProperty(path)) {
              var tmpUpstream = subdomain + '.' + host + path;
              tmpUpstream = tmpUpstream.replace(/:/g, '.');

              var content = "<li><h5>" + tmpUpstream + "</h5><ul>"
              for (var i = 0; i < currentUpstreams[host][subdomain][path].length; i++) {
                content += '<li>' + currentUpstreams[host][subdomain][path][i] + '</li>';
              }
              content += "</ui></li>"

              $('#upstream-list').append(content);
            }
          }
        }
      }
    }
  }
}

function init($) {
  $.get('/proxy/console/upstreams-schema.json', function (data) {
    schema = data;
    initEditor($, schema);
  }).fail(function () {
    alert('Failed to load schema!');
  });

  $('#update-upstreams').click(function() {
    var dataUpstreams = editor.getValue();
    dataUpstreams = postbuild(dataUpstreams);

    console.log(dataUpstreams);
    $.ajax({
      url: '/proxy/update',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(dataUpstreams),
      dataType: 'json'
    }).done(function() {
      initEditor($, schema);
    });
  })
}

function proxyConsole($) {
  init($);
}


$(document).ready(proxyConsole);
