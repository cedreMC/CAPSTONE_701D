-- Script para agregar claves foráneas con ON DELETE CASCADE
-- Esto permitirá eliminar usuarios y que se eliminen automáticamente sus solicitudes

USE myweb;

-- Primero, eliminar la clave foránea existente si hay alguna en cliente_id (por si acaso)
-- ALTER TABLE solicitudes DROP FOREIGN KEY IF EXISTS fk_solicitudes_cliente;

-- Agregar clave foránea en cliente_id con ON DELETE CASCADE
-- Esto hará que cuando se elimine un usuario, se eliminen automáticamente sus solicitudes
ALTER TABLE solicitudes
ADD CONSTRAINT fk_solicitudes_cliente
FOREIGN KEY (cliente_id)
REFERENCES usuarios(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Verificar que se creó correctamente
SHOW CREATE TABLE solicitudes;

