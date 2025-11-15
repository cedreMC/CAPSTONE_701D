// db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost', // Cambiar si usas un servidor remoto
  user: 'root',      // Tu usuario de MySQL
  password: '1@d&838VyO',      // Tu contraseña de MySQL
  database: 'myweb', // El nombre de tu base de datos
  charset: 'utf8mb4'
});

// Conectar a la base de datos
db.connect((err) => {
  if (err) {
    console.error('Error de conexión a MySQL:', err);
  } else {
    console.log('Conexión exitosa a MySQL');
  }
});

process.on('exit', () => {
  if (db && db.end) {
    db.end();
    console.log('🔒 Conexión MySQL cerrada al salir del proceso');
  }
});

module.exports = db; // Exportamos la conexión para usarla en app.js

