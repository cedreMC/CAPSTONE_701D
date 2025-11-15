-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS myweb;
USE myweb;

-- Crear tabla usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  contraseña VARCHAR(255) NOT NULL
);

CREATE TABLE solicitudes (
  id INT NOT NULL AUTO_INCREMENT,
  correo_usuario VARCHAR(255) NOT NULL,
  cliente_id INT NULL,
  servicio VARCHAR(255) NOT NULL,
  mensaje TEXT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
  precio INT NULL DEFAULT 0,
  nombre VARCHAR(255) NOT NULL,
  correo VARCHAR(255) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  PRIMARY KEY (id),
  KEY cliente_id (cliente_id)
);

CREATE TABLE servicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT NULL,
  precio_base INT NOT NULL,
  activo BOOLEAN DEFAULT TRUE
);


ALTER TABLE usuarios
ADD COLUMN rol VARCHAR(20) NOT NULL DEFAULT 'usuario';

