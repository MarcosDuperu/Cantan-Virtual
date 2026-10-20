// Servidor de desarrollo: sirve la interfaz y hace de relé LAN (para probar en el navegador).
const path = require('path');
const { createRelay } = require('./relay');
const port = +(process.env.PORT || 8080);
createRelay({ port, staticDir: path.join(__dirname, '..', 'src') }).then(r => {
  console.log('Catan en http://localhost:' + r.port);
});
