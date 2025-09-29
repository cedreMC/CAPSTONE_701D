const db = require('../db');

// Ejemplo de consulta
db.query('SELECT * FROM usuarios', (err, results) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(results);
});