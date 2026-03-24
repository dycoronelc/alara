# Migraciones SQL manuales (MySQL)

## Errores tipo: `The column ... does not exist`

El deploy incluye un **Prisma Client** generado desde `schema.prisma`. Si la base de datos en Railway (u otro) **no tiene** alguna de esas columnas, cualquier `findMany` / `findUnique` que toque esa tabla devuelve **500**. El listado de solicitudes puede quedar vacío o mostrar datos viejos en caché.

### Arreglo recomendado (una sola vez, idempotente)

Ejecutar en la base conectada a `DATABASE_URL`:

**[`alara_sync_prisma_columns_mysql.sql`](./alara_sync_prisma_columns_mysql.sql)**

- Añade, si faltan: `inspection_requests.amount_in_force`, columnas de dirección y contacto en `clients`, y columnas de reset de contraseña + índice en `users`.
- Puedes ejecutarlo **varias veces**: no falla si la columna ya existe.

### Errores que ya vimos en producción

| Mensaje en log | Tabla / columna |
|----------------|-----------------|
| `inspection_requests.amount_in_force` | Falta en `inspection_requests` |
| `clients.address_line` | Falta en `clients` (y posiblemente `city`, `country`, `phone_work`, etc.) |

### Documentación de auditoría

Lista de columnas a revisar frente a Prisma: **[`../docs/PRISMA-MYSQL-COLUMN-AUDIT.md`](../docs/PRISMA-MYSQL-COLUMN-AUDIT.md)**

### Desarrollo local

```bash
cd backend
npx prisma db push
```

### Nota sobre `client_address_amount_in_force_mysql.sql`

Ese archivo quedó **sustituido** por el script de sync anterior: ejecutar solo `amount_in_force` sin las columnas de `clients` deja la API rota al incluir relación `client`.
