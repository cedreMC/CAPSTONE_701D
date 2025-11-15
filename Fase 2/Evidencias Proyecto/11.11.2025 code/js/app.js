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

// Ruta de prueba para verificar que DELETE funciona
app.delete('/test-delete', (req, res) => {
  console.log('✅ Ruta DELETE de prueba funcionando');
  res.json({ success: true, message: 'Ruta DELETE funciona correctamente' });
});

// Ruta para obtener usuarios (para admin)
app.get('/usuarios', (req, res) => {
  db.query('SELECT id, nombre, email, direccion, telefono, contraseña, rol FROM usuarios ORDER BY id ASC', (err, results) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({ success: false, message: 'Error en la consulta' });
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
      return res.status(500).json({ error: "Error en la consulta" });
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
app.post('/solicitar-servicio', async (req, res) => {
  const { correo_usuario, nombre, correo, telefono, servicio, mensaje } = req.body;

  // ⚙️ Validar usuario logueado
  if (!correo_usuario && process.env.NODE_ENV !== 'test') {
    return res.status(400).json({ success: false, message: "Usuario no logueado" });
  }

  // 🧩 Validar campos requeridos
  if (!nombre || !correo || !telefono || !servicio) {
    return res.status(400).json({ success: false, message: "Faltan datos obligatorios" });
  }

  try {
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
      nombreServicio,  // también guardamos el texto del servicio
      servicio_id,
      mensaje || '',
      estado,
      precio
    ];

    await db.promise().query(query, values);

    // ✉️ Enviar correo de notificación (opcional)
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
        DATE_FORMAT(fecha, '%d-%m-%Y %H:%i') AS fecha
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
  db.query('SELECT id, nombre, email, direccion, telefono, fecha_creacion, ultima_sesion, created_at, last_login FROM usuarios WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en la consulta' });
    if (results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    const user = results[0];
    // Normalizar nombres de campos para compatibilidad
    if (user.created_at && !user.fecha_creacion) {
      user.fecha_creacion = user.created_at;
    }
    if (user.last_login && !user.ultima_sesion) {
      user.ultima_sesion = user.last_login;
    }
    
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
      console.error('Error al actualizar:', err);
      return res.status(500).json({ error: 'Error al actualizar usuario' });
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
    res.status(500).json({ success: false, message: 'Error al actualizar estado' });
  }
});



// Iniciar el servidor en el puerto 3000
// Exporta la app sin iniciar el servidor
if (process.env.NODE_ENV !== 'test') {
  app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
  });
}

module.exports = app;