
var runtime = require('fx-runtime');

runtime.start(__dirname, './architect-config', function() {
  console.log('Usage: node index.js [options]');
  console.log('Options:');
  console.log('--port http port, default: 80');
  console.log('--sp https port, default: 443');
  console.log('--es enable secure, default: false');
  console.log('--so only secure, default: false');
  console.log('--key certificate key file path, default: ./key.pem');
  console.log('--cert certificate file path, default: ./cert.pem');
});
