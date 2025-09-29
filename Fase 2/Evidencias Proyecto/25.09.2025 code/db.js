const mysql = require('mysql2');

// Configuración de la base de datos
const connection = mysql.createConnection({
  host: 'localhost',      // si es local
  user: 'root',           // tu usuario
  password: '1@d&838VyO',
  database: 'web1'
});

// Conectar y probar
connection.connect((err) => {
  if (err) {
    console.error('Error de conexión:', err.message);
    return;
  }
  console.log('Conectado correctamente a la base de datos');
});

// Consulta de prueba
connection.query('SELECT 1 + 1 AS resultado', (err, results) => {
  if (err) throw err;
  console.log('Prueba de consulta:', results[0].resultado); // debe mostrar 2
  connection.end(); // cerrar conexión
});

