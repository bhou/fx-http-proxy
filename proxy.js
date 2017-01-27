
var runtime = require('fx-runtime');

runtime.start(__dirname, './architect-config', function() {
  console.log('Usage: node index.js [options]');
  console.log('Options:');
  console.log('--us, upstream file, related to home path');
  console.log('--port http port, default: 80');
  console.log('--sp https port, default: 443');
  console.log('--es enable secure, default: false');

  console.log('Letsencrypt Settings:');
  console.log('--domains, list of approved domains, separated by comma (,)');
  console.log('--email, email for configging letsencrypt');
  console.log('--prod, if using prod letsencrypt server, default: false');
  
  //console.log('--so only secure, default: false');
  //console.log('--key certificate key file path, default: ./key.pem');
  //console.log('--cert certificate file path, default: ./cert.pem');
});
