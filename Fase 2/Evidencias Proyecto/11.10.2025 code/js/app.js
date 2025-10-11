// Importamos las dependencias necesarias
const express = require('express');  // Asegúrate de que express esté importado
const bcrypt = require('bcryptjs');
const db = require('./db');  // Importamos la conexión a la base de datos
const cors = require('cors');  // Importamos el paquete CORS
const nodemailer = require('nodemailer');

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
  db.query('SELECT id, nombre, email, direccion, telefono FROM usuarios', (err, results) => {
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

// Ruta para solicitudes de servicio
app.post('/solicitar-servicio', async (req, res) => {
  const { nombre, correo, telefono, servicio, mensaje } = req.body;

  if (!nombre || !correo || !telefono || !servicio) {
    return res.status(400).json({ success: false, message: "Faltan datos obligatorios" });
  }

  try {
    // Configuración de transporte con Gmail (usar contraseña de aplicación)
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'pruebacapstone1@gmail.com',      // 👈 tu correo
        pass: 'gqke rbhd jlry jlfs'         // 👈 contraseña de aplicación
      }
    });

    // Contenido del correo
    let mailOptions = {
      from: `"Formulario Serviclemant" <${correo}>`,
      to: 'pruebacapstone1@gmail.com',  // 👈 destino (puede ser el mismo u otro)
      subject: `Nueva solicitud de servicio de ${nombre}`,
      text: `
        Nombre: ${nombre}
        Correo: ${correo}
        Teléfono: ${telefono}
        Servicio: ${servicio}
        Mensaje: ${mensaje}
      `
    };

    // Enviar
    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Solicitud enviada con éxito" });
  } catch (error) {
    console.error("Error al enviar correo:", error);
    res.status(500).json({ success: false, message: "Error al enviar correo" });
  }
});

// Obtener usuario por ID
app.get('/usuarios/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT id, nombre, email, direccion, telefono FROM usuarios WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en la consulta' });
    if (results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(results[0]);
  });
});

// Actualizar datos del usuario
app.put('/usuarios/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, email, direccion, telefono } = req.body;

  const query = 'UPDATE usuarios SET nombre = ?, email = ?, direccion = ?, telefono = ? WHERE id = ?';
  db.query(query, [nombre, email, direccion, telefono, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar:', err);
      return res.status(500).json({ error: 'Error al actualizar usuario' });
    }
    res.json({ success: true, message: 'Usuario actualizado correctamente' });
  });
});

// Iniciar el servidor en el puerto 3000
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
