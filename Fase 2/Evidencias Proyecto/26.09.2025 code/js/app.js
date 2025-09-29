// Importamos las dependencias necesarias
const express = require('express');  // Asegúrate de que express esté importado
const bcrypt = require('bcryptjs');
const db = require('./db');  // Importamos la conexión a la base de datos
const cors = require('cors');  // Importamos el paquete CORS

// Inicializamos la aplicación de Express
const app = express();  

// Habilitar CORS para todas las rutas
app.use(cors());  

// Usamos express.json() para poder manejar solicitudes JSON
app.use(express.json());  

// Ruta para la raíz (esto es lo que hace que http://localhost:3000/ funcione)
app.get('/', (req, res) => {
  res.send('¡Servidor funcionando correctamente!');
});

// Ruta para obtener usuarios
app.get('/usuarios', (req, res) => {
  db.query('SELECT id, nombre, email FROM usuarios', (err, results) => {
    if (err) {
      res.status(500).send('Error en la consulta');
      return;
    }
    res.json(results);
  });
});

// Ruta para agregar un nuevo usuario (con contraseña encriptada)
app.post('/usuarios', (req, res) => {
  const { nombre, email, contraseña } = req.body;

  // Hashear la contraseña antes de almacenarla
  bcrypt.hash(contraseña, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).send('Error al encriptar la contraseña');
    }

    // Insertar el usuario con la contraseña hasheada
    const query = 'INSERT INTO usuarios (nombre, email, contraseña) VALUES (?, ?, ?)';
    db.query(query, [nombre, email, hashedPassword], (err, result) => {
      if (err) {
        res.status(500).send('Error al insertar el usuario');
        return;
      }
      res.status(201).send('Usuario creado exitosamente');
    });
  });
});

// LOGIN CON HASH
app.post('/login', (req, res) => {
  const { email, contraseña } = req.body;

  console.log("[LOGIN] Body recibido:", req.body);

  if (!email || !contraseña) {
    return res.status(400).json({ error: "Faltan email o contraseña" });
  }

  const query = 'SELECT id, nombre, email, contraseña FROM usuarios WHERE email = ? LIMIT 1';
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("Error SQL:", err);
      return res.status(500).json({ error: "Error en la consulta" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const usuario = results[0];

    // comparar hash con bcrypt
    bcrypt.compare(contraseña, usuario.contraseña, (err, isMatch) => {
      if (err) {
        console.error("Error en bcrypt.compare:", err);
        return res.status(500).json({ error: "Error al verificar contraseña" });
      }

      if (!isMatch) {
        console.log("❌ Contraseña incorrecta para:", email);
        return res.status(401).json({ error: "Contraseña incorrecta" });
      }

      console.log("✅ Login exitoso:", email);
      return res.status(200).json({
        message: "Login exitoso",
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email
        }
      });
    });
  });
});

// Iniciar el servidor en el puerto 3000
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
