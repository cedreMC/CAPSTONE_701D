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

-- Usuario con contraseña en HASH (contraseña = 12345678)
INSERT INTO usuarios (nombre, email, contraseña)
VALUES ('Usuario Hash', 'hash@ejemplo.com', '$2a$10$z2jilwCfTYtgvKxuRPO/JewrTtCbcYF04cyIP0DA2GRQKcH3sveQK');

-- Usuario con contraseña en texto plano (contraseña = 123456)
INSERT INTO usuarios (nombre, email, contraseña)
VALUES ('Usuario Plano', 'plano@ejemplo.com', '123456');
