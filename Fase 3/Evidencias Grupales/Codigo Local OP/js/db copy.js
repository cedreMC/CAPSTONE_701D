// db.js - Configuración para HostGator (cPanel + MySQL)
// Este archivo está optimizado para funcionar en el hosting de HostGator

require('dotenv').config(); // Cargar variables de entorno desde .env
const mysql = require('mysql2');

// Configuración de la base de datos para HostGator
// NOTA: En HostGator, generalmente el host es 'localhost' cuando la app está en el mismo servidor
// Si tu base de datos está en un servidor remoto, usa la dirección IP o dominio proporcionado por HostGator

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',           // HostGator: localhost para serviclemant.site
  user: process.env.DB_USER || 'maximi44_maximi44',   // Usuario de MySQL de HostGator
  password: process.env.DB_PASSWORD || '@Lex2381',     // Contraseña de MySQL de HostGator
  database: process.env.DB_NAME || 'maximi44_myweb',  // Base de datos de HostGator
  port: process.env.DB_PORT || 3306,                   // Puerto MySQL (3306 es el estándar)
  charset: 'utf8mb4',
  // Configuración del pool para mejor rendimiento en producción
  connectionLimit: 10,                                  // Número máximo de conexiones simultáneas
  queueLimit: 0,                                       // Sin límite en la cola de conexiones
  waitForConnections: true,                            // Esperar si no hay conexiones disponibles
  // Configuración de reconexión automática
  reconnect: true,
  // Timeouts
  connectTimeout: 10000,                               // 10 segundos para establecer conexión
  acquireTimeout: 10000,                               // 10 segundos para obtener conexión del pool
  timeout: 60000,                                      // 60 segundos timeout para queries
  // Configuración adicional para HostGator
  multipleStatements: false,                           // Por seguridad, deshabilitar múltiples statements
  ssl: false                                           // HostGator generalmente no requiere SSL para conexiones locales
};

// Crear pool de conexiones (mejor para producción que createConnection)
// El pool maneja automáticamente múltiples conexiones y reconexiones
const db = mysql.createPool(dbConfig);

// Probar la conexión al iniciar
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error de conexión a MySQL:', err);
    console.error('❌ Detalles del error:', {
      code: err.code,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState,
      message: err.message
    });
    
    // Mensajes de ayuda específicos para HostGator
    if (err.code === 'ECONNREFUSED') {
      console.error('💡 Ayuda: Verifica que MySQL esté corriendo en HostGator');
      console.error('💡 En cPanel, ve a "MySQL Databases" y verifica que la base de datos exista');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Ayuda: Verifica el usuario y contraseña en cPanel > MySQL Databases');
      console.error('💡 Asegúrate de que el usuario tenga permisos sobre la base de datos');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 Ayuda: La base de datos no existe. Créala en cPanel > MySQL Databases');
    }
  } else {
    console.log('✅ Conexión exitosa a MySQL (HostGator - serviclemant.site)');
    console.log('📊 Base de datos:', dbConfig.database);
    console.log('👤 Usuario:', dbConfig.user);
    console.log('🌐 URL: https://serviclemant.site/');
    connection.release(); // Liberar la conexión de prueba
  }
});

// Manejar errores del pool
db.on('error', (err) => {
  console.error('❌ Error en el pool de MySQL:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 Intentando reconectar...');
  }
});

// Cerrar todas las conexiones al salir del proceso
process.on('SIGINT', () => {
  db.end((err) => {
    if (err) {
      console.error('❌ Error al cerrar el pool:', err);
    } else {
      console.log('🔒 Pool de conexiones MySQL cerrado correctamente');
    }
    process.exit(0);
  });
});

process.on('exit', () => {
  if (db && db.end) {
    db.end();
    console.log('🔒 Conexión MySQL cerrada al salir del proceso');
  }
});

// Exportar el pool para usar en app.js
// NOTA: El pool tiene la misma API que createConnection, así que no necesitas cambiar app.js
module.exports = db;

/* 
 * ============================================
 * INSTRUCCIONES PARA CONFIGURAR EN HOSTGATOR
 * ============================================
 * 
 * 1. CREAR BASE DE DATOS EN CPANEL:
 *    - Ve a cPanel > MySQL Databases
 *    - Crea una nueva base de datos (ej: "tuusuario_myweb")
 *    - Anota el nombre completo de la base de datos
 * 
 * 2. CREAR USUARIO DE MYSQL:
 *    - En la misma sección, crea un nuevo usuario
 *    - Asigna una contraseña segura
 *    - Anota el nombre completo del usuario (ej: "tuusuario_dbuser")
 * 
 * 3. ASIGNAR PERMISOS:
 *    - Asigna el usuario a la base de datos
 *    - Dale todos los privilegios (ALL PRIVILEGES)
 * 
 * 4. CREAR ARCHIVO .env EN LA RAÍZ DEL PROYECTO:
 *    Crea un archivo llamado ".env" con el siguiente contenido:
 * 
 *    DB_HOST=localhost
 *    DB_USER=maximi44_maximi44
 *    DB_PASSWORD=@Lex2381
 *    DB_NAME=maximi44_myweb
 *    DB_PORT=3306
 * 
 *    NOTA: Estas credenciales ya están configuradas como valores por defecto
 *    en este archivo, pero es recomendable usar variables de entorno (.env)
 *    para mayor seguridad en producción.
 * 
 * 5. IMPORTAR ESTRUCTURA DE BASE DE DATOS:
 *    - Ve a cPanel > phpMyAdmin
 *    - Selecciona tu base de datos
 *    - Ve a la pestaña "Importar"
 *    - Sube el archivo database/myweb.sql
 * 
 * 6. VERIFICAR CONFIGURACIÓN:
 *    - Asegúrate de que el archivo .env esté en la raíz del proyecto
 *    - Verifica que .env esté en .gitignore (no subir credenciales a Git)
 *    - Reinicia tu aplicación Node.js
 * 
 * NOTA: En HostGator, el host generalmente es 'localhost' cuando la app
 * está en el mismo servidor que MySQL. Si usas un servidor MySQL remoto,
 * HostGator te proporcionará la dirección específica.
 */
