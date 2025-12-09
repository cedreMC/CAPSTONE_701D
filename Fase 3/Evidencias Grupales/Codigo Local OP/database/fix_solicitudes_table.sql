-- Script para verificar y corregir problemas comunes en la tabla solicitudes
-- Ejecuta este script en tu base de datos MySQL

USE myweb;

-- 1. Verificar que la tabla existe
SELECT 'Verificando estructura de la tabla solicitudes...' AS status;
DESCRIBE solicitudes;

-- 2. Verificar que todas las columnas necesarias existen
SELECT 'Verificando columnas necesarias...' AS status;

-- 3. Si la columna precio es INT y necesitas decimales, cambiar a DECIMAL
-- (Descomenta la siguiente línea si necesitas precios con decimales)
-- ALTER TABLE solicitudes MODIFY COLUMN precio DECIMAL(10, 2) DEFAULT 0;

-- 4. Verificar que la columna fecha acepta valores NULL si es necesario
-- (La columna fecha ya está configurada como NOT NULL, lo cual está bien)

-- 5. Verificar índices
SHOW INDEXES FROM solicitudes;

-- 6. Verificar claves foráneas
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'myweb' 
  AND TABLE_NAME = 'solicitudes'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- 7. Verificar que no hay datos corruptos
SELECT 'Verificando datos...' AS status;
SELECT COUNT(*) AS total_solicitudes FROM solicitudes;
SELECT COUNT(*) AS solicitudes_sin_id FROM solicitudes WHERE id IS NULL;
SELECT COUNT(*) AS solicitudes_sin_correo FROM solicitudes WHERE correo_usuario IS NULL OR correo_usuario = '';
SELECT COUNT(*) AS solicitudes_sin_servicio FROM solicitudes WHERE servicio IS NULL OR servicio = '';

-- 8. Mostrar estructura completa de la tabla
SHOW CREATE TABLE solicitudes;

