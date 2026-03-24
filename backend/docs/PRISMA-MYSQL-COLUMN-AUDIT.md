# Auditoría: columnas esperadas por Prisma (MySQL)

Si el backend devuelve **500** y Prisma dice *`The column ... does not exist`*, la tabla en MySQL no coincide con `prisma/schema.prisma`.

## Solución recomendada

Ejecutar una vez en la base de producción:

`prisma/migrations/alara_sync_prisma_columns_mysql.sql`

Añade **solo** lo que falta (comprueba `information_schema` antes de cada `ALTER`).

## Tablas que suelen desincronizarse

### `inspection_requests`

| Columna             | Tipo en Prisma        |
|---------------------|------------------------|
| `amount_in_force`   | `Decimal?` → DECIMAL(18,2) NULL |

### `clients`

| Columna           | Tipo en Prisma              |
|-------------------|-----------------------------|
| `phone_work`      | `VARCHAR(30)` NULL          |
| `employer_tax_id` | `VARCHAR(50)` NULL          |
| `profession`      | `VARCHAR(150)` NULL         |
| `address_line`    | `VARCHAR(255)` NULL         |
| `city`            | `VARCHAR(120)` NULL         |
| `country`         | `VARCHAR(80)` NULL          |

*(También existen `first_name`, `last_name`, `dob`, `id_type`, `id_number`, `email`, `phone_mobile`, `phone_home`, `employer_name`, `created_at`, `updated_at`; si falta alguna, la app ya habría fallado antes.)*

### `users` (reset de contraseña)

| Columna                      | Tipo                          |
|------------------------------|-------------------------------|
| `password_reset_token`       | `VARCHAR(128)` NULL, UNIQUE   |
| `password_reset_expires_at`  | `DATETIME(3)` NULL            |

## Comprobar columnas que faltan (consulta manual)

```sql
SELECT TABLE_NAME, COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('clients', 'inspection_requests', 'users')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

Compara el resultado con los modelos `Client`, `InspectionRequest` y `User` en `schema.prisma`.

## Otros scripts en `prisma/migrations/`

- `password_reset_columns_mysql.sql` — mismo objetivo que la parte `users` del script de sync (útil si no usas el procedimiento).
- `make_created_by_user_id_nullable.sql` — `MODIFY` nullable en varias tablas (otro tipo de desajuste).
