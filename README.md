# Project Planner

Sistema de gestión y seguimiento de proyectos (expedientes): equipo, hitos,
cronograma Gantt y enlaces públicos de solo lectura o edición.

## Arquitectura

```
Navegador
   │  HTTPS
   ▼
Frontend Next.js (Vercel)  ──fetch──►  Backend Express + Prisma (Render)  ──►  PostgreSQL (Neon)
```

- **`frontend/`** — Next.js 16 + React 19. Ver `frontend/DESIGN.md`.
- **`src/`** — API Express + Prisma 7 (driver adapter para pg).
- **`prisma/`** — schema y migraciones.
- **`patches/`** — correcciones documentadas.
- **`GUIA_APIS_RENDER_NEON_VERCEL.txt`** — despliegue paso a paso.

## Desarrollo local

Backend (necesita `DATABASE_URL` en `.env`):

```bash
npm install
npm run dev        # tsx, puerto 3001
npm test           # pruebas unitarias
```

Frontend:

```bash
cd frontend
npm install
npm run dev        # puerto 3000 ; usa NEXT_PUBLIC_API_URL o localhost:3001
```

## Build / despliegue

- Backend en Render — Build Command: `npm install && npm run render-build`
  (incluye `prisma migrate deploy`). Start: `npm start`.
- Frontend en Vercel — Root Directory `frontend`, build `npm run build`.
- Variables de entorno: ver la GUIA.

## Estado

- La pantalla de acceso es una demo: **no hay autenticación con credenciales**
  todavía. La API es abierta. Es una decisión temporal mientras el sistema está
  en mejoras; antes de datos reales hay que añadir login y autorización.
- `progress` y `durationMonths` del proyecto se calculan en el backend (promedio
  del progreso de tareas / rango de fechas).
