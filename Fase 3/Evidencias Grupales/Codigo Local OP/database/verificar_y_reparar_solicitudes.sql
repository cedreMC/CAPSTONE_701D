-- Script para verificar y reparar problemas comunes en la tabla solicitudes
-- Ejecuta este script en tu base de datos MySQL (phpMyAdmin, MySQL Workbench, o línea de comandos)

USE myweb;

-- ============================================
-- 1. VERIFICAR ESTRUCTURA DE LA TABLA
-- ============================================
SELECT '=== VERIFICANDO ESTRUCTURA DE LA TABLA ===' AS info;

-- Ver estructura actual
DESCRIBE solicitudes;

-- Ver creación completa
SHOW CREATE TABLE solicitudes;

-- ============================================
-- 2. VERIFICAR QUE TODAS LAS COLUMNAS EXISTEN
-- ============================================
SELECT '=== VERIFICANDO COLUMNAS ===' AS info;

-- Verificar columnas críticas
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'myweb' 
  AND TABLE_NAME = 'solicitudes'
  AND COLUMN_NAME IN ('id', 'correo_usuario', 'servicio', 'fecha', 'precio', 'estado')
ORDER BY ORDINAL_POSITION;

-- ============================================
-- 3. REPARAR COLUMNA PRECIO (si es necesario)
-- ============================================
-- Si necesitas precios con decimales, ejecuta esto:
-- ALTER TABLE solicitudes MODIFY COLUMN precio DECIMAL(10, 2) DEFAULT 0;

-- Si prefieres mantener INT pero permitir valores más grandes:
-- ALTER TABLE solicitudes MODIFY COLUMN precio INT DEFAULT 0;

-- ============================================
-- 4. VERIFICAR Y REPARAR COLUMNA FECHA
-- ============================================
-- Asegurar que la columna fecha acepta el formato correcto
-- (Ya debería estar como DATETIME, pero verificamos)

SELECT '=== VERIFICANDO COLUMNA FECHA ===' AS info;
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'myweb' 
  AND TABLE_NAME = 'solicitudes'
  AND COLUMN_NAME = 'fecha';

-- Si necesitas cambiar el tipo de fecha:
-- ALTER TABLE solicitudes MODIFY COLUMN fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- 5. VERIFICAR DATOS CORRUPTOS
-- ============================================
SELECT '=== VERIFICANDO DATOS ===' AS info;

-- Contar total de registros
SELECT COUNT(*) AS total_solicitudes FROM solicitudes;

-- Verificar registros con problemas
SELECT 
    COUNT(*) AS solicitudes_sin_id 
FROM solicitudes 
WHERE id IS NULL;

SELECT 
    COUNT(*) AS solicitudes_sin_correo 
FROM solicitudes 
WHERE correo_usuario IS NULL OR correo_usuario = '';

SELECT 
    COUNT(*) AS solicitudes_sin_servicio 
FROM solicitudes 
WHERE servicio IS NULL OR servicio = '';

SELECT 
    COUNT(*) AS solicitudes_fecha_invalida 
FROM solicitudes 
WHERE fecha IS NULL;

-- ============================================
-- 6. CREAR ÍNDICES SI NO EXISTEN (mejora rendimiento)
-- ============================================
SELECT '=== VERIFICANDO ÍNDICES ===' AS info;

-- Ver índices actuales
SHOW INDEXES FROM solicitudes;

-- Crear índice en correo_usuario si no existe (mejora búsquedas)
-- CREATE INDEX idx_correo_usuario ON solicitudes(correo_usuario);

-- Crear índice en fecha si no existe (mejora ordenamiento)
-- CREATE INDEX idx_fecha ON solicitudes(fecha);

-- ============================================
-- 7. VERIFICAR CLAVES FORÁNEAS
-- ============================================
SELECT '=== VERIFICANDO CLAVES FORÁNEAS ===' AS info;

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

-- ============================================
-- 8. REPARAR DATOS PROBLEMÁTICOS (si existen)
-- ============================================
SELECT '=== REPARANDO DATOS PROBLEMÁTICOS ===' AS info;

-- Reparar fechas nulas (usar fecha actual)
-- UPDATE solicitudes 
-- SET fecha = NOW() 
-- WHERE fecha IS NULL;

-- Reparar precios nulos o negativos
-- UPDATE solicitudes 
-- SET precio = 0 
-- WHERE precio IS NULL OR precio < 0;

-- Reparar estados nulos
-- UPDATE solicitudes 
-- SET estado = 'Pendiente' 
-- WHERE estado IS NULL OR estado = '';

-- ============================================
-- 9. VERIFICACIÓN FINAL
-- ============================================
SELECT '=== VERIFICACIÓN FINAL ===' AS info;

-- Mostrar algunos registros de ejemplo
SELECT 
    id,
    correo_usuario,
    servicio,
    fecha,
    precio,
    estado
FROM solicitudes
ORDER BY fecha DESC
LIMIT 5;

SELECT '✅ Verificación completada. Revisa los resultados arriba.' AS resultado;

