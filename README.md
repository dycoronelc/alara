# ALARA INSP - Plataforma de Inspecciones VIP

## Requisitos
- Node.js 18+
- MySQL 8+

## Backend (NestJS + Prisma)

```bash
cd backend
npm install
```

Configura variables de entorno en `backend/.env`:

```
DATABASE_URL="mysql://usuario:password@localhost:3306/alara_insp"
JWT_SECRET="cambia-este-secreto"
PORT=3000
```

Crear tablas y datos de prueba:

```bash
npx prisma db execute --file prisma/db_reset.sql
npx prisma db execute --file prisma/db_init.sql
npm run prisma:seed
```

Iniciar backend:

```bash
npm run start:dev
```

## Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

## Login (usuarios de prueba)
- Aseguradora Horizonte — `insurer@horizonte.com` / `Insurer123!`
- Seguros Andinos — `insurer@andinos.com` / `Insurer123!`
- ALARA INSP — `alara@alarains.com` / `Alara123!`
- Admin — `admin@alarains.com` / `Admin123!`
