-- Agregar columnas de fecha a la tabla usuarios si no existen
USE myweb;

-- Agregar columna fecha_creacion si no existe
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Agregar columna ultima_sesion si no existe
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS ultima_sesion DATETIME NULL;

-- Actualizar fecha_creacion para usuarios existentes que no tengan fecha
UPDATE usuarios
SET fecha_creacion = CURRENT_TIMESTAMP
WHERE fecha_creacion IS NULL;

------------------------------------------------------------


-- nuevo!!
-- Agregar columna fecha_creacion
ALTER TABLE usuarios
ADD COLUMN fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Agregar columna ultima_sesion
ALTER TABLE usuarios
ADD COLUMN ultima_sesion DATETIME NULL;

-- Actualizar fecha_creacion para usuarios existentes que no tengan fecha
UPDATE usuarios
SET fecha_creacion = CURRENT_TIMESTAMP
WHERE fecha_creacion IS NULL;s