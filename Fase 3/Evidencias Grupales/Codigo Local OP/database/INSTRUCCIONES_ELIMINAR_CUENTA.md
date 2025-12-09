# Instrucciones para Habilitar Eliminación de Cuentas

## Problema
Al intentar eliminar un usuario, MySQL puede bloquear la operación si hay solicitudes relacionadas debido a restricciones de integridad referencial.

## Solución Recomendada: Agregar Clave Foránea con CASCADE

### Opción 1: Cambios en MySQL (RECOMENDADO)

Ejecuta el siguiente script SQL en tu base de datos MySQL:

```sql
USE myweb;

-- Agregar clave foránea en cliente_id con ON DELETE CASCADE
-- Esto hará que cuando se elimine un usuario, se eliminen automáticamente sus solicitudes
ALTER TABLE solicitudes
ADD CONSTRAINT fk_solicitudes_cliente
FOREIGN KEY (cliente_id)
REFERENCES usuarios(id)
ON DELETE CASCADE
ON UPDATE CASCADE;
```

**Ventajas:**
- MySQL elimina automáticamente las solicitudes cuando se elimina el usuario
- Más eficiente y seguro
- Mantiene la integridad de la base de datos

**Cómo ejecutarlo:**
1. Abre MySQL Workbench, phpMyAdmin, o tu cliente MySQL preferido
2. Conecta a tu base de datos `myweb`
3. Ejecuta el script SQL anterior
4. Verifica que se creó correctamente con: `SHOW CREATE TABLE solicitudes;`

### Opción 2: Solo Cambios en el Código (YA IMPLEMENTADO)

El código ya está actualizado para:
- Eliminar manualmente las solicitudes antes de eliminar el usuario
- Usar transacciones para asegurar que todo se elimine correctamente
- Manejar errores apropiadamente

**Nota:** Si ya ejecutaste el script SQL de la Opción 1, el código funcionará aún mejor porque MySQL hará la eliminación en cascada automáticamente.

## Verificación

Después de aplicar los cambios:

1. **Si usaste la Opción 1 (SQL):**
   - Verifica que la clave foránea existe:
     ```sql
     SHOW CREATE TABLE solicitudes;
     ```
   - Deberías ver algo como: `FOREIGN KEY (cliente_id) REFERENCES usuarios(id) ON DELETE CASCADE`

2. **Prueba la funcionalidad:**
   - Inicia sesión con un usuario de prueba
   - Ve a "Editar Perfil"
   - Haz clic en "Eliminar Cuenta"
   - Confirma la eliminación
   - Debería funcionar sin errores

## Solución de Problemas

Si aún tienes errores:

1. **Error: "Cannot add foreign key constraint"**
   - Verifica que el campo `cliente_id` existe en la tabla `solicitudes`
   - Verifica que el campo `id` existe en la tabla `usuarios`
   - Asegúrate de que los tipos de datos coincidan (ambos INT)

2. **Error: "Duplicate key name"**
   - Ya existe una clave foránea con ese nombre
   - Elimínala primero:
     ```sql
     ALTER TABLE solicitudes DROP FOREIGN KEY fk_solicitudes_cliente;
     ```
   - Luego ejecuta el script de nuevo

3. **Error: "Cannot delete or update a parent row"**
   - Esto significa que aún hay restricciones
   - El código debería manejar esto, pero si persiste, verifica que la clave foránea tiene `ON DELETE CASCADE`

