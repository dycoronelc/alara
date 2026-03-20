# Backend en Railway

## Error 500 en `/api/auth/login`

Lo más habitual tras añadir campos al modelo `User` en Prisma es que **la base MySQL en Railway no tenga esas columnas**. Prisma entonces falla al leer `users` y Nest devuelve 500.

### Solución: aplicar el cambio en la base

En el servicio **MySQL** de Railway (o cliente SQL con `DATABASE_URL`):

1. Ejecuta el script: `prisma/migrations/password_reset_columns_mysql.sql`  
   Si las columnas ya existen, omite las líneas que fallen o usa:

```bash
cd backend
npx prisma db push
```

(con `DATABASE_URL` apuntando a Railway, p. ej. exportada en terminal o `.env`).

2. Redeploy del backend si hace falta.

### Ver conexión a la base

`GET https://TU-BACKEND.up.railway.app/api/health`

- Si responde `database: "ok"`, la conexión Prisma funciona.
- Si responde 503 con `database: "unreachable"`, revisa `DATABASE_URL` (host, puerto, usuario, SSL si aplica).

### Ver el error exacto del 500

Tras el último deploy, en **logs del servicio backend** en Railway debería aparecer una línea del logger `HTTP` con el stack trace del error (filtro `AllExceptionsFilter`).

Busca mensajes de Prisma del tipo **Unknown column** / **P2022** → confirma que falta migración.

### Variables útiles en Railway (backend)

| Variable        | Uso                                      |
|----------------|-------------------------------------------|
| `DATABASE_URL` | Conexión MySQL (Railway suele inyectarla) |
| `JWT_SECRET`   | Firma de tokens (recomendado en producción) |
| `PORT`         | Lo define Railway; no hace falta tocarla   |

No hace falta variable de CORS: el código usa `origin: true`.
