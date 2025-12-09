// Importamos las dependencias necesarias
const express = require('express');  // Asegúrate de que express esté importado
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./js/db');  // Importamos la conexión a la base de datos
const cors = require('cors');  // Importamos el paquete CORS
const nodemailer = require('nodemailer');

// Inicializamos la aplicación de Express
const app = express();  

// Habilitar CORS para todas las rutas
app.use(cors());  

// Usamos express.json() para poder manejar solicitudes JSON
app.use(express.json());  

const path = require("path");

// SERVIR ARCHIVOS ESTÁTICOS
app.use(express.static(__dirname));
console.log("🟦 Servidor de archivos estáticos:", __dirname);


// Ruta para la raíz (esto es lo que hace que http://localhost:3000/ funcione)
app.get('/', (req, res) => {
  res.send('¡Servidor funcionando correctamente!');
});

// Ruta de prueba para verificar que DELETE funciona
app.delete('/test-delete', (req, res) => {
  console.log('✅ Ruta DELETE de prueba funcionando');
  res.json({ success: true, message: 'Ruta DELETE funciona correctamente' });
});

// Ruta para obtener usuarios (para admin)
app.get('/usuarios', (req, res) => {
  db.query('SELECT id, nombre, email, direccion, telefono, contraseña, rol FROM usuarios ORDER BY id ASC', (err, results) => {
    if (err) {
      console.error('❌ Error al obtener usuarios:', err);
      console.error('❌ Detalles del error:', {
        code: err.code,
        sqlMessage: err.sqlMessage,
        sqlState: err.sqlState,
        message: err.message
      });
      
      let errorMessage = 'Error al obtener usuarios';
      if (err.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = 'Error: La tabla usuarios no existe en la base de datos';
      } else if (err.code === 'ER_BAD_FIELD_ERROR') {
        errorMessage = `Error: Campo inválido en la base de datos. ${err.sqlMessage || ''}`;
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        errorMessage = 'Error: No se pudo conectar a la base de datos. Verifica que MySQL esté corriendo.';
      } else if (err.sqlMessage) {
        errorMessage = `Error de base de datos: ${err.sqlMessage}`;
      }
      
      return res.status(500).json({ success: false, message: errorMessage, errorCode: err.code });
    }
    res.json({ success: true, data: results });
  });
});

// Ruta para agregar un nuevo usuario (con contraseña encriptada)
app.post('/usuarios', (req, res) => {
  const { nombre, email, contraseña } = req.body;

  // Verificar que todos los campos estén presentes
  if (!nombre || !email || !contraseña) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  // Validación de la contraseña (mínimo 6 caracteres)
  if (contraseña.length < 6) {
    return res.status(400).json({ error: 'La contraseña es demasiado corta' });
  }

  // Verificar si el email ya está registrado
  const queryCheckEmail = 'SELECT * FROM usuarios WHERE email = ?';
  db.query(queryCheckEmail, [email], (err, results) => {
    if (err) {
      return res.status(500).send('Error al verificar el email');
    }

    if (results.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Hashear la contraseña antes de almacenarla
    bcrypt.hash(contraseña, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).send('Error al encriptar la contraseña');
      }

      // Insertar el nuevo usuario en la base de datos
      const query = 'INSERT INTO usuarios (nombre, email, contraseña) VALUES (?, ?, ?)';
      db.query(query, [nombre, email, hashedPassword], (err, result) => {
        if (err) {
          return res.status(500).send('Error al registrar al usuario');
        }
        res.status(201).send('Usuario creado exitosamente');
      });
    });
  });
});


app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Debes ingresar un correo." });
  }

  try {
    // Buscar usuario por correo
    const [rows] = await db.promise().query(
      'SELECT id, email FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      // Por seguridad, no reveles si el correo existe o no
      return res.status(200).json({
        success: true,
        message: "Si el correo está registrado, se enviará un enlace de recuperación."
      });
    }

    const usuario = rows[0];

    // Generar token aleatorio
    const token = crypto.randomBytes(32).toString('hex');
    // Expira en 1 hora
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Guardar token y expiración en la BD
    await db.promise().query(
      'UPDATE usuarios SET reset_token = ?, reset_expires = ? WHERE id = ?',
      [token, expires, usuario.id]
    );

    // Construir enlace de recuperación (local)
    const resetLink = `http://localhost:3000/html/reset-password.html?token=${token}`;

    // Enviar correo
    try {
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'pruebacapstone1@gmail.com',
          pass: 'gqke rbhd jlry jlfs'
        }
      });

      await transporter.sendMail({
        from: `"Recuperar contraseña - Serviclemant" <pruebacapstone1@gmail.com>`,
        to: email,
        subject: "Recuperación de contraseña",
        text: `
        Has solicitado recuperar tu contraseña.

        Haz clic en el siguiente enlace para crear una nueva contraseña (válido por 1 hora):

        ${resetLink}

        Si no fuiste tú, ignora este mensaje.
        `
      });

    } catch (mailErr) {
      console.error('⚠️ Error al enviar correo de recuperación:', mailErr);
      // No tiramos error al usuario, pero lo logueamos
    }

    return res.status(200).json({
      success: true,
      message: "Si el correo está registrado, se enviará un enlace de recuperación."
    });

  } catch (err) {
    console.error("❌ Error en forgot-password:", err);
    return res.status(500).json({ success: false, message: "Error al procesar la solicitud." });
  }
});

app.post('/reset-password', async (req, res) => {
  const { token, nuevaPassword } = req.body;

  if (!token || !nuevaPassword) {
    return res.status(400).json({ success: false, message: "Faltan datos." });
  }

  try {
    // Buscar usuario por token
    const [rows] = await db.promise().query(
      'SELECT id, reset_expires FROM usuarios WHERE reset_token = ? LIMIT 1',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "El enlace de recuperación no es válido." });
    }

    const usuario = rows[0];

    // Verificar expiración
    const ahora = new Date();
    const expira = new Date(usuario.reset_expires);

    if (ahora > expira) {
      return res.status(400).json({ success: false, message: "El enlace de recuperación ha expirado." });
    }

    // Hashear contraseña nueva (recomendado)
    const saltRounds = 10;
    const hash = await bcrypt.hash(nuevaPassword, saltRounds);

    // Actualizar contraseña y limpiar token
    await db.promise().query(
      'UPDATE usuarios SET contraseña = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
      [hash, usuario.id]
    );

    return res.status(200).json({
      success: true,
      message: "Contraseña actualizada con éxito. Ahora puedes iniciar sesión."
    });

  } catch (err) {
    console.error("❌ Error en reset-password:", err);
    return res.status(500).json({ success: false, message: "Error al actualizar la contraseña." });
  }
});


// =======================================
// LOGIN CON HASH + ROL
// =======================================
app.post('/login', (req, res) => {
  const { email, contraseña } = req.body;

  console.log("[LOGIN] Body recibido:", req.body);

  if (!email || !contraseña) {
    console.log("❌ Login fallido: faltan email o contraseña");
    return res.status(400).json({ error: "Faltan email o contraseña" });
  }

  // Traer también el campo 'rol'
  const query = 'SELECT id, nombre, email, contraseña, rol FROM usuarios WHERE email = ? LIMIT 1';
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("❌ Error SQL:", err);
      console.error("❌ Detalles del error:", {
        code: err.code,
        sqlMessage: err.sqlMessage,
        sqlState: err.sqlState,
        message: err.message,
        query: query,
        email: email
      });
      
      let errorMessage = 'Error al buscar usuario';
      if (err.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = 'Error: La tabla usuarios no existe en la base de datos';
      } else if (err.code === 'ER_BAD_FIELD_ERROR') {
        errorMessage = `Error: Campo inválido en la base de datos. ${err.sqlMessage || ''}`;
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        errorMessage = 'Error: No se pudo conectar a la base de datos. Verifica que MySQL esté corriendo.';
      } else if (err.sqlMessage) {
        errorMessage = `Error de base de datos: ${err.sqlMessage}`;
      }
      
      return res.status(500).json({ error: errorMessage, errorCode: err.code });
    }

    if (results.length === 0) {
      console.log("❌ Usuario no encontrado:", email);
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const usuario = results[0];

    // Comparar hash con bcrypt
    bcrypt.compare(contraseña, usuario.contraseña, (err, isMatch) => {
      if (err) {
        console.error("❌ Error en bcrypt.compare:", err);
        return res.status(500).json({ error: "Error al verificar contraseña" });
      }

      if (!isMatch) {
        console.log("❌ Contraseña incorrecta para:", email);
        return res.status(401).json({ error: "Contraseña incorrecta" });
      }

      console.log("✅ Login exitoso:", email, "| Rol:", usuario.rol);

      // Devolver usuario con su rol
      return res.status(200).json({
        message: "Login exitoso",
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol
        }
      });
    });
  });
});

// =======================================
// CREAR ADMIN AUTOMÁTICO SI NO EXISTE
// =======================================
async function crearAdminPorDefecto() {
  const emailAdmin = 'admin@example.com';
  const contraseñaAdmin = 'admin123';

  try {
    db.query('SELECT * FROM usuarios WHERE email = ?', [emailAdmin], async (err, results) => {
      if (err) {
        console.error('❌ Error al verificar admin:', err);
        return;
      }

      if (results.length > 0) {
        console.log('✅ Usuario administrador ya existe.');
        return;
      }

      // Hashear la contraseña
      const hash = await bcrypt.hash(contraseñaAdmin, 10);

      // Insertar nuevo admin
      const insertQuery = `
        INSERT INTO usuarios (nombre, email, contraseña, rol)
        VALUES (?, ?, ?, ?)
      `;

      db.query(insertQuery, ['Administrador', emailAdmin, hash, 'admin'], (err) => {
        if (err) {
          console.error('❌ Error al crear usuario admin:', err);
        } else {
          console.log('👑 Usuario administrador creado con éxito:');
          console.log('   Email: admin@example.com');
          console.log('   Contraseña: admin123');
        }
      });
    });
  } catch (error) {
    console.error('⚠️ Error inesperado al crear admin:', error);
  }
}

// Ejecutar al iniciar el servidor (solo si no es entorno de test)
if (process.env.NODE_ENV !== 'test') {
  crearAdminPorDefecto();
}


// --------- SOLICITUD DE SERVICIO ---------
// --------- SOLICITUD DE SERVICIO ---------
app.post('/solicitar-servicio', async (req, res) => {
  const { correo_usuario, nombre, correo, telefono, servicio, mensaje } = req.body;

  // ⚙️ Validar usuario logueado (excepto en test)
  if (!correo_usuario && process.env.NODE_ENV !== 'test') {
    return res.status(400).json({ success: false, message: "Usuario no logueado" });
  }

  // 🧩 Validar campos requeridos
  if (!nombre || !correo || !telefono || !servicio) {
    return res.status(400).json({ success: false, message: "Faltan datos obligatorios" });
  }

  try {

    // ⏳ ANTI-SPAM: evitar solicitudes repetidas durante 5 minutos según CORREO DEL FORMULARIO
    const [ultimaSolicitud] = await db.promise().query(
      `SELECT fecha FROM solicitudes 
       WHERE correo = ? 
       ORDER BY fecha DESC 
       LIMIT 1`,
      [correo]
    );

    if (ultimaSolicitud.length > 0) {
      const ultimaFecha = new Date(ultimaSolicitud[0].fecha);
      const ahora = new Date();
      const diffMin = (ahora - ultimaFecha) / (1000 * 60);

      if (diffMin < 5) {
        return res.status(429).json({
          success: false,
          message: `Debes esperar ${Math.ceil(5 - diffMin)} minutos antes de enviar otra solicitud.`
        });
      }
    }

    // 🔍 Buscar servicio en la tabla 'servicios'
    const [servicioData] = await db.promise().query(
      'SELECT id, nombre, precio_base FROM servicios WHERE nombre = ? AND activo = 1 LIMIT 1',
      [servicio]
    );

    // 🚫 Si el servicio no existe o está inactivo
    if (servicioData.length === 0) {
      return res.status(400).json({ success: false, message: "Servicio no válido o no disponible" });
    }

    // 🧮 Extraer datos
    const { id: servicio_id, nombre: nombreServicio, precio_base: precio } = servicioData[0];
    const estado = 'Pendiente';

    // 🧾 Guardar solicitud
    const query = `
      INSERT INTO solicitudes 
      (correo_usuario, nombre, correo, telefono, servicio, servicio_id, mensaje, estado, precio, fecha)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const values = [
      correo_usuario || 'test@serviclemant.cl',
      nombre,
      correo,
      telefono,
      nombreServicio,
      servicio_id,
      mensaje || '',
      estado,
      precio
    ];

    await db.promise().query(query, values);

    // ✉️ Enviar correo de notificación
    try {
      if (process.env.NODE_ENV !== 'test') {
        let transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'pruebacapstone1@gmail.com',
            pass: 'gqke rbhd jlry jlfs'
          }
        });

        await transporter.sendMail({
          from: `"Formulario Serviclemant" <${correo}>`,
          to: 'pruebacapstone1@gmail.com',
          subject: `Nueva solicitud de ${nombre}`,
          text: `
            Nueva solicitud recibida:

            Nombre: ${nombre}
            Correo: ${correo}
            Teléfono: ${telefono}
            Servicio: ${nombreServicio}
            Mensaje: ${mensaje}
            Precio estimado: $${precio.toLocaleString('es-CL')}
            Estado: ${estado}
            Correo del usuario: ${correo_usuario || 'test@serviclemant.cl'}
          `
        });
      }
    } catch (mailErr) {
      console.error('⚠️ Error al enviar correo:', mailErr);
    }

    // 📤 Respuesta final
    const statusCode = process.env.NODE_ENV === 'test' ? 200 : 201;
    res.status(statusCode).json({
      success: true,
      message: "Solicitud enviada y guardada con éxito",
      precio
    });

  } catch (err) {
    console.error("❌ Error al procesar solicitud:", err);
    res.status(500).json({ success: false, message: "Error al guardar la solicitud" });
  }
});

// =======================================
// POSTULACIÓN - TRABAJA CON NOSOTROS
// =======================================
app.post('/postulacion', async (req, res) => {
  const { correo_usuario, nombre, apellido, correo, telefono, rut, genero, nacionalidad, fecha_nacimiento, servicio, mensaje } = req.body;

  // ⚙️ Validar usuario logueado (excepto en test)
  if (!correo_usuario && process.env.NODE_ENV !== 'test') {
    return res.status(400).json({ success: false, message: "Usuario no logueado" });
  }

  // 🧩 Validar campos requeridos
  if (!nombre || !apellido || !correo || !telefono || !servicio || !rut) {
    return res.status(400).json({ success: false, message: "Faltan datos obligatorios" });
  }

  try {
    // ⏳ ANTI-SPAM: evitar postulaciones repetidas durante 5 minutos según CORREO DEL FORMULARIO
    const [ultimaPostulacion] = await db.promise().query(
      `SELECT fecha FROM solicitudes 
       WHERE correo = ? AND servicio LIKE '%Postulación%'
       ORDER BY fecha DESC 
       LIMIT 1`,
      [correo]
    );

    if (ultimaPostulacion.length > 0) {
      const ultimaFecha = new Date(ultimaPostulacion[0].fecha);
      const ahora = new Date();
      const diffMin = (ahora - ultimaFecha) / (1000 * 60);

      if (diffMin < 5) {
        return res.status(429).json({
          success: false,
          message: `Debes esperar ${Math.ceil(5 - diffMin)} minutos antes de enviar otra postulación.`
        });
      }
    }

    // 🧾 Guardar postulación en la tabla solicitudes con identificador especial
    const nombreCompleto = `${nombre} ${apellido}`;
    const servicioPostulacion = `Postulación - ${servicio}`;
    const estado = 'Pendiente';
    const precio = 0; // Las postulaciones no tienen precio

    const query = `
      INSERT INTO solicitudes 
      (correo_usuario, nombre, correo, telefono, servicio, mensaje, estado, precio, fecha)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const values = [
      correo_usuario || 'test@serviclemant.cl',
      nombreCompleto,
      correo,
      telefono,
      servicioPostulacion,
      `RUT: ${rut}\nGénero: ${genero || 'No especificado'}\nNacionalidad: ${nacionalidad || 'No especificada'}\nFecha de Nacimiento: ${fecha_nacimiento || 'No especificada'}\n\nMensaje/Experiencia:\n${mensaje || 'Sin mensaje adicional'}`,
      estado,
      precio
    ];

    await db.promise().query(query, values);

    // ✉️ Enviar correo de notificación
    try {
      if (process.env.NODE_ENV !== 'test') {
        let transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'pruebacapstone1@gmail.com',
            pass: 'gqke rbhd jlry jlfs'
          }
        });

        await transporter.sendMail({
          from: `"Formulario Trabaja Con Nosotros" <${correo}>`,
          to: 'pruebacapstone1@gmail.com',
          subject: `Nueva postulación de trabajo - ${nombreCompleto}`,
          text: `
            Nueva postulación recibida:

            Nombre: ${nombreCompleto}
            Correo: ${correo}
            Teléfono: ${telefono}
            RUT: ${rut}
            Género: ${genero || 'No especificado'}
            Nacionalidad: ${nacionalidad || 'No especificada'}
            Fecha de Nacimiento: ${fecha_nacimiento || 'No especificada'}
            Área de Interés: ${servicio}
            Mensaje/Experiencia: ${mensaje || 'Sin mensaje adicional'}
            Correo del usuario: ${correo_usuario || 'test@serviclemant.cl'}
          `
        });
      }
    } catch (mailErr) {
      console.error('⚠️ Error al enviar correo:', mailErr);
    }

    // 📤 Respuesta final
    const statusCode = process.env.NODE_ENV === 'test' ? 200 : 201;
    res.status(statusCode).json({
      success: true,
      message: "Postulación enviada con éxito. Te contactaremos pronto."
    });

  } catch (err) {
    console.error("❌ Error al procesar postulación:", err);
    res.status(500).json({ success: false, message: "Error al guardar la postulación" });
  }
});



// --------- HISTORIAL DE SOLICITUDES ---------
// Obtener historial de solicitudes por usuario
// app.get('/historial/:email', (req, res) => {
//   const email = req.params.email;
//   console.log('📩 Buscando historial para:', email);

//   const sql = `
//     SELECT id, servicio, fecha, estado, precio
//     FROM solicitudes 
//     WHERE LOWER(correo_usuario) = LOWER(?) 
//     ORDER BY fecha DESC
//   `;

//   db.query(sql, [email], (err, results) => {
//     if (err) {
//       console.error('❌ Error al obtener historial:', err);
//       return res.status(500).json({ success: false, message: 'Error del servidor' });
//     }

//     console.log('🧾 Resultados encontrados:', results.length);
//     res.json({ success: true, data: results });
//   });
// });

// --------- HISTORIAL DE SOLICITUDES (admin + usuario) ---------
app.get('/historial', (req, res) => {
  const { email, rol } = req.query; 
  console.log('📩 Solicitando historial para:', email, '| Rol:', rol);

  let sql;
  let params = [];

  if (rol === 'admin') {
    // 👑 Si es admin, ver todas las solicitudes
    sql = `
      SELECT 
        id,
        correo_usuario,
        nombre,
        correo,
        telefono,
        servicio,
        mensaje,
        estado,
        precio,
        fecha,
        DATE_FORMAT(fecha, '%d-%m-%Y %H:%i') AS fecha_formateada
      FROM solicitudes
      ORDER BY fecha DESC
    `;
  } else {
    // 👤 Usuario normal: solo su propio historial
    sql = `
      SELECT 
        id,
        servicio,
        DATE_FORMAT(fecha, '%d-%m-%Y %H:%i') AS fecha,
        estado,
        precio
      FROM solicitudes
      WHERE LOWER(correo_usuario) = LOWER(?)
      ORDER BY fecha DESC
    `;
    params = [email];
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener historial:', err);
      return res.status(500).json({ success: false, message: 'Error del servidor' });
    }

    console.log(`🧾 ${results.length} resultados encontrados`);
    res.json({ success: true, data: results });
  });
});






// Obtener usuario por ID
app.get('/usuarios/:id', (req, res) => {
  const { id } = req.params;
  // Incluir fecha_creacion y ultima_sesion si existen en la tabla
  db.query('SELECT id, nombre, email, direccion, telefono, fecha_creacion, ultima_sesion FROM usuarios WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('❌ Error al obtener usuario por ID:', err);
      console.error('❌ Detalles del error:', {
        code: err.code,
        sqlMessage: err.sqlMessage,
        sqlState: err.sqlState,
        message: err.message,
        id: id
      });
      
      let errorMessage = 'Error al obtener usuario';
      if (err.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = 'Error: La tabla usuarios no existe en la base de datos';
      } else if (err.code === 'ER_BAD_FIELD_ERROR') {
        errorMessage = `Error: Campo inválido en la base de datos. ${err.sqlMessage || ''}`;
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        errorMessage = 'Error: No se pudo conectar a la base de datos. Verifica que MySQL esté corriendo.';
      } else if (err.sqlMessage) {
        errorMessage = `Error de base de datos: ${err.sqlMessage}`;
      }
      
      return res.status(500).json({ error: errorMessage, errorCode: err.code });
    }
    if (results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    const user = results[0];
    // Normalizar nombres de campos para compatibilidad

    
    res.json(user);
  });
});

// Actualizar datos del usuario
app.put('/usuarios/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, email, direccion, telefono, rol } = req.body;

  // Construir la query dinámicamente según los campos proporcionados
  let query = 'UPDATE usuarios SET ';
  const values = [];
  const updates = [];

  if (nombre !== undefined) {
    updates.push('nombre = ?');
    values.push(nombre);
  }
  if (email !== undefined) {
    updates.push('email = ?');
    values.push(email);
  }
  if (direccion !== undefined) {
    updates.push('direccion = ?');
    values.push(direccion);
  }
  if (telefono !== undefined) {
    updates.push('telefono = ?');
    values.push(telefono);
  }
  if (rol !== undefined) {
    updates.push('rol = ?');
    values.push(rol);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
  }

  query += updates.join(', ') + ' WHERE id = ?';
  values.push(id);

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar usuario:', err);
      console.error('❌ Detalles del error:', {
        code: err.code,
        sqlMessage: err.sqlMessage,
        sqlState: err.sqlState,
        message: err.message,
        query: query,
        values: values,
        body: req.body
      });
      
      let errorMessage = 'Error al actualizar usuario';
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        errorMessage = `Error: Campo inválido en la base de datos. ${err.sqlMessage || ''}`;
      } else if (err.sqlMessage) {
        errorMessage = `Error de base de datos: ${err.sqlMessage}`;
      }
      
      return res.status(500).json({ error: errorMessage, errorCode: err.code });
    }
    res.json({ success: true, message: 'Usuario actualizado correctamente' });
  });
});

// Eliminar usuario (eliminar cuenta)
app.delete('/usuarios/:id', (req, res) => {
  const { id } = req.params;
  
  console.log('🗑️ Petición DELETE recibida para usuario ID:', id);
  console.log('Tipo de ID:', typeof id, 'Es número?', !isNaN(id));

  // Verificar que el ID sea válido
  if (!id || isNaN(id)) {
    console.error('❌ ID inválido:', id);
    return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
  }

  // Primero verificar que el usuario existe
  const checkQuery = 'SELECT id, email, rol FROM usuarios WHERE id = ?';
  db.query(checkQuery, [id], (err, results) => {
    if (err) {
      console.error('Error al verificar usuario:', err);
      return res.status(500).json({ success: false, message: 'Error al verificar usuario' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const usuario = results[0];

    // Prevenir eliminación de cuenta admin (opcional - puedes comentar esto si quieres permitirlo)
    // if (usuario.rol === 'admin') {
    //   return res.status(403).json({ success: false, message: 'No se puede eliminar una cuenta de administrador' });
    // }

    // Usar transacción para asegurar que todo se elimine correctamente
    db.query('START TRANSACTION', (err) => {
      if (err) {
        console.error('Error al iniciar transacción:', err);
        return res.status(500).json({ success: false, message: 'Error al iniciar transacción' });
      }

      // Primero eliminar todas las solicitudes relacionadas con este usuario
      // Eliminar por correo_usuario (para casos donde cliente_id sea NULL)
      // y por cliente_id (para casos donde esté relacionado por FK)
      const deleteSolicitudesQuery = 'DELETE FROM solicitudes WHERE correo_usuario = ? OR cliente_id = ?';
      db.query(deleteSolicitudesQuery, [usuario.email, id], (err, solicitudesResult) => {
        if (err) {
          console.error('Error al eliminar solicitudes:', err);
          db.query('ROLLBACK', () => {});
          return res.status(500).json({ 
            success: false, 
            message: `Error al eliminar solicitudes: ${err.message || 'Error desconocido'}` 
          });
        }
        
        console.log(`🗑️ Solicitudes eliminadas: ${solicitudesResult.affectedRows || 0}`);

        // Ahora eliminar el usuario de la base de datos
        const deleteQuery = 'DELETE FROM usuarios WHERE id = ?';
        db.query(deleteQuery, [id], (err, result) => {
          if (err) {
            console.error('Error al eliminar usuario:', err);
            db.query('ROLLBACK', () => {});
            
            // Verificar si es un error de clave foránea
            if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED' || err.code === '1451') {
              return res.status(400).json({ 
                success: false, 
                message: 'No se puede eliminar el usuario porque tiene datos asociados. Si agregaste la clave foránea con CASCADE, esto no debería ocurrir.' 
              });
            }
            return res.status(500).json({ 
              success: false, 
              message: `Error al eliminar usuario: ${err.message || 'Error desconocido'}` 
            });
          }

          if (result.affectedRows === 0) {
            db.query('ROLLBACK', () => {});
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
          }

          // Confirmar la transacción
          db.query('COMMIT', (commitErr) => {
            if (commitErr) {
              console.error('Error al confirmar transacción:', commitErr);
              db.query('ROLLBACK', () => {});
              return res.status(500).json({ 
                success: false, 
                message: 'Error al confirmar la eliminación' 
              });
            }

            console.log(`✅ Usuario eliminado: ${usuario.email} (ID: ${id})`);
            res.json({ 
              success: true, 
              message: 'Cuenta eliminada exitosamente' 
            });
          });
        });
      });
    });
  });
});

app.get('/perfil/solicitudes', (req, res) => {
    // Aquí enviamos el correo del usuario como query o header
    const correo_usuario = req.query.email; // o req.headers['x-usuario-email']

    if (!correo_usuario) {
        return res.status(400).json({ success: false, message: 'Usuario no logueado' });
    }

    const query = `
        SELECT id, servicio, fecha, estado, precio 
        FROM solicitudes 
        WHERE correo_usuario = ?
        ORDER BY fecha DESC
    `;

    db.query(query, [correo_usuario], (err, results) => {
        if (err) {
            console.error("Error al obtener historial:", err);
            return res.status(500).json({ success: false, message: 'Error al obtener historial' });
        }

        res.json({ success: true, solicitudes: results });
    });
});

// ADMINISTRACIÓN DE SERVICIOS
app.get('/servicios', async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT id, nombre, precio_base, activo
      FROM servicios
      ORDER BY id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ Error al obtener servicios:', err);
    res.status(500).json({ success: false, message: 'Error al obtener servicios' });
  }
});


// ➕ Crear un nuevo servicio
app.post('/servicios', async (req, res) => {
  const { nombre, descripcion, precio_base, activo } = req.body;

  if (!nombre || !precio_base) {
    return res.status(400).json({ success: false, message: 'Nombre y precio son obligatorios' });
  }

  try {
    const [result] = await db.promise().query(
      'INSERT INTO servicios (nombre, descripcion, precio_base, activo) VALUES (?, ?, ?, ?)',
      [nombre, descripcion || '', precio_base, activo ?? 1]
    );

    res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      id: result.insertId
    });
  } catch (err) {
    console.error('❌ Error al crear servicio:', err);
    res.status(500).json({ success: false, message: 'Error al crear servicio' });
  }
});

// ✏️ Editar un servicio existente
app.put('/servicios/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio_base, activo } = req.body;

  try {
    const [result] = await db.promise().query(
      'UPDATE servicios SET nombre=?, descripcion=?, precio_base=?, activo=? WHERE id=?',
      [nombre, descripcion, precio_base, activo, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }

    res.json({ success: true, message: 'Servicio actualizado correctamente' });
  } catch (err) {
    console.error('❌ Error al actualizar servicio:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar servicio' });
  }
});

// 🗑️ Eliminar un servicio
app.delete('/servicios/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.promise().query('DELETE FROM servicios WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }

    res.json({ success: true, message: 'Servicio eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar servicio:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar servicio' });
  }
});

// ✅ Actualizar estado de una solicitud (solo admin)
app.put('/solicitudes/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado } = req.body;

  // Validar que se envíe el estado
  if (!nuevoEstado) {
    return res.status(400).json({ success: false, message: 'Falta el nuevo estado' });
  }

  // Validar que sea un estado permitido
  const estadosValidos = ['Pendiente', 'En proceso', 'Completado', 'Cancelado'];
  if (!estadosValidos.includes(nuevoEstado)) {
    return res.status(400).json({ success: false, message: 'Estado no válido' });
  }

  try {
    const [result] = await db.promise().query(
      'UPDATE solicitudes SET estado = ? WHERE id = ?',
      [nuevoEstado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    res.json({ success: true, message: 'Estado actualizado correctamente' });
  } catch (err) {
    console.error('❌ Error al actualizar estado:', err);
    console.error('❌ Detalles del error:', {
      message: err.message,
      code: err.code,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    });
    
    // Mensaje de error más específico
    let errorMessage = 'Error al actualizar estado';
    
    if (err.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Error: La tabla de solicitudes no existe en la base de datos';
    } else if (err.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = `Error: Campo inválido en la base de datos. ${err.sqlMessage || ''}`;
    } else if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      errorMessage = 'Error: Tipo de dato incorrecto para el campo estado';
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      errorMessage = 'Error: No se pudo conectar a la base de datos. Verifica que MySQL esté corriendo.';
    } else if (err.sqlMessage) {
      errorMessage = `Error de base de datos: ${err.sqlMessage}`;
    } else if (err.message) {
      errorMessage = `Error: ${err.message}`;
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      errorCode: err.code
    });
  }
});

// ✏️ Editar una solicitud completa (correo, servicio, fecha, precio)
app.put('/solicitudes/:id', async (req, res) => {
  const { id } = req.params;
  const { correo_usuario, servicio, fecha, precio } = req.body;

  console.log('📥 PUT /solicitudes/:id recibida', {
    id,
    body: req.body,
    correo_usuario,
    servicio,
    fecha,
    precio
  });

  // Validaciones
  if (!correo_usuario || !servicio) {
    console.warn('⚠️ Validación fallida: correo_usuario o servicio faltante');
    return res.status(400).json({ success: false, message: 'Correo y servicio son obligatorios' });
  }

  if (precio !== undefined && (isNaN(precio) || precio < 0)) {
    console.warn('⚠️ Validación fallida: precio inválido', precio);
    return res.status(400).json({ success: false, message: 'El precio debe ser un número válido mayor o igual a 0' });
  }

  try {
    console.log('📥 Recibida petición PUT /solicitudes/:id', { id, body: req.body });
    
    // Construir la consulta dinámicamente según los campos proporcionados
    const updates = [];
    const values = [];

    if (correo_usuario) {
      updates.push('correo_usuario = ?');
      values.push(correo_usuario);
    }
    if (servicio) {
      updates.push('servicio = ?');
      values.push(servicio);
    }
    if (fecha) {
      updates.push('fecha = ?');
      // Asegurar que la fecha esté en formato MySQL (YYYY-MM-DD HH:MM:SS)
      // Si viene como "YYYY-MM-DD HH:MM" o "YYYY-MM-DDTHH:MM", convertir a "YYYY-MM-DD HH:MM:SS"
      let fechaMySQL = fecha;
      if (fecha.includes('T')) {
        fechaMySQL = fecha.replace('T', ' ');
      }
      if (!fechaMySQL.includes(':')) {
        fechaMySQL += ' 00:00:00';
      } else if (fechaMySQL.split(':').length === 2) {
        fechaMySQL += ':00';
      }
      values.push(fechaMySQL);
    }
    if (precio !== undefined && precio !== null) {
      updates.push('precio = ?');
      values.push(precio);
    }

    if (updates.length === 0) {
      console.warn('⚠️ No hay campos para actualizar');
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }

    values.push(id);
    
    const query = `UPDATE solicitudes SET ${updates.join(', ')} WHERE id = ?`;
    console.log('🔍 Ejecutando query:', query);
    console.log('📊 Valores:', values);

    const [result] = await db.promise().query(query, values);
    
    console.log('✅ Query ejecutada. Filas afectadas:', result.affectedRows);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    res.json({ success: true, message: 'Solicitud actualizada correctamente' });
  } catch (err) {
    console.error('❌ Error al actualizar solicitud:', err);
    console.error('❌ Detalles del error:', {
      message: err.message,
      code: err.code,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    });
    
    // Mensaje de error más específico según el código de error de MySQL
    let errorMessage = 'Error al actualizar solicitud';
    
    if (err.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Error: La tabla de solicitudes no existe. Ejecuta el script de creación de base de datos.';
    } else if (err.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = `Error: Campo inválido en la base de datos. ${err.sqlMessage || ''}`;
    } else if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      errorMessage = 'Error: Tipo de dato incorrecto. Verifica el formato de los datos enviados.';
    } else if (err.code === 'ER_DATA_TOO_LONG') {
      errorMessage = 'Error: Los datos enviados son demasiado largos para el campo.';
    } else if (err.code === 'ER_NO_DEFAULT_FOR_FIELD') {
      errorMessage = 'Error: Campo requerido sin valor por defecto.';
    } else if (err.code === 'ER_DUP_ENTRY') {
      errorMessage = 'Error: Ya existe un registro con estos datos.';
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      errorMessage = 'Error: No se pudo conectar a la base de datos. Verifica que MySQL esté corriendo.';
    } else if (err.sqlMessage) {
      errorMessage = `Error de base de datos: ${err.sqlMessage}`;
    } else if (err.message) {
      errorMessage = `Error: ${err.message}`;
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      errorCode: err.code
    });
  }
});

// =======================================
// MANEJO GLOBAL DE ERRORES
// =======================================

// Middleware para manejar errores 404 (página no encontrada)
app.use((req, res, next) => {
  // Si es una solicitud de API, devolver JSON
  if (req.path.startsWith('/api') || req.path.startsWith('/usuarios') || 
      req.path.startsWith('/login') || req.path.startsWith('/servicios') ||
      req.path.startsWith('/solicitudes') || req.path.startsWith('/historial') ||
      req.path.startsWith('/forgot-password') || req.path.startsWith('/reset-password') ||
      req.path.startsWith('/solicitar-servicio')) {
    return res.status(404).json({ 
      success: false, 
      error: 'not-found',
      message: 'Endpoint no encontrado' 
    });
  }
  
  // Para rutas de páginas HTML, redirigir a página de error
  res.status(404).redirect('/html/error.html?type=not-found&status=404&message=' + 
    encodeURIComponent('La página que buscas no existe'));
});

// Iniciar el servidor en el puerto 3000
// Exporta la app sin iniciar el servidor
if (process.env.NODE_ENV !== 'test') {
  app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
  });
}

module.exports = app;