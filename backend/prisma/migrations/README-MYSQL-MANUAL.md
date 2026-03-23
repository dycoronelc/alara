# Migraciones SQL manuales (MySQL)

## Error: `amount_in_force` does not exist

Si el backend registra `500` en:

- `GET /api/inspection-requests`
- `GET /api/dashboard/alara`
- `GET /api/inspection-requests/:id`

y el mensaje de Prisma dice que falta la columna `inspection_requests.amount_in_force`, la base de datos **no** se actualizó tras un deploy que ya incluye ese campo en `schema.prisma`.

**Solución:** ejecutar en la base **de producción** el archivo:

`client_address_amount_in_force_mysql.sql`

Hasta hacerlo, Prisma no puede leer filas de `inspection_requests` y el listado falla (a veces el front solo muestra datos viejos en caché o un subconjunto).

### Si una columna ya existe

MySQL devolverá error `1060 Duplicate column name`. En ese caso, ejecuta solo las sentencias `ALTER` que falten (por ejemplo solo la de `amount_in_force`).

### Alternativa con Prisma (desarrollo local)

```bash
cd backend
npx prisma db push
```

En producción suele preferirse SQL explícito o migraciones gestionadas por tu plataforma.
