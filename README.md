# Project Planner

Sistema web para **planificar y dar seguimiento a proyectos de obra** (aquí
llamados *expedientes*): su equipo, sus fechas clave, su cronograma tipo Gantt y
el avance de cada tarea. Cada expediente puede compartirse con un enlace público
de solo lectura o de edición, sin que la otra persona tenga que iniciar sesión.

El repositorio contiene **las dos mitades del sistema**:

| Carpeta | Qué es | Dónde corre |
| --- | --- | --- |
| `frontend/` | Interfaz web (Next.js 16 + React 19) | Vercel |
| `src/` | API REST (Express 5 + Prisma 7) | Render |
| `prisma/` | Esquema de la base de datos y migraciones | PostgreSQL en Neon |

---

## 1. Cómo encajan las piezas

```
  Navegador
     │
     │  HTTPS  (la URL del backend viaja en NEXT_PUBLIC_API_URL)
     ▼
  Frontend Next.js  ───────────►  API Express + Prisma  ───────────►  PostgreSQL (Neon)
   (Vercel)              fetch      (Render)                 SQL         base de datos
```

- El **frontend** no habla nunca con la base de datos directamente. Todo pasa
  por la API.
- La **API** es la única que conoce la cadena de conexión (`DATABASE_URL`) y la
  única que aplica las reglas de negocio y de validación.
- La **base de datos** solo acepta conexiones desde la API.

No hay servidor de sesiones ni cookies: hoy la aplicación es de un solo usuario
administrador (ver [§8 Estado actual](#8-estado-actual-y-pendientes)).

---

## 2. Conceptos del dominio

Entender estos ocho objetos es entender el sistema completo. Todos se guardan
con un `id` de tipo UUID y llevan `createdAt` / `updatedAt`.

| Objeto | En la interfaz | Qué representa | Notas |
| --- | --- | --- | --- |
| **Project** | «Expediente» | Un proyecto de obra: nombre, responsable, presupuesto, fecha de inicio y fin | `durationMonths` y `progress` **no se escriben a mano**, los calcula la API (ver §5) |
| **Task** | «Tarea» del cronograma | Un trabajo dentro del expediente: fechas, responsable, % de avance, área técnica | Puede marcarse como *fase* (`isPhase`) y declarar una `dependency` en texto libre |
| **TechnicalArea** | «Área técnica» | Catálogo reutilizable: *Obra civil*, *Estructura*, *Instalaciones*… | Cada tarea pertenece a una. No se puede borrar si hay tareas usándola (**409**) |
| **TeamMember** | «Participante» | Una persona asignada a un expediente | Tiene un estado tomado del catálogo `TeamStatus` |
| **TeamStatus** | «Estado de equipo» | Catálogo reutilizable: *Activo*, *Inactivo*… | No se puede borrar si hay participantes usándolo (**409**) |
| **Milestone** | «Hito» / «Fecha clave» | Un evento con fecha y descripción dentro del expediente | — |
| **PerformanceMetric** | «Métrica de rendimiento» | Ritmo esperado de una tarea: unidad, `ratePerDay`, `divisor` | Cuelga de una tarea |
| **DriveLink** | «Enlace de Drive» | Un enlace (http/https) a documentación de una tarea | Cuelga de una tarea |
| **ShareLink** | «Enlace público» | Un token para abrir un expediente sin iniciar sesión | Rol `viewer` o `editor`. El token se puede **rotar** (regenerar); no caduca |

**Borrado en cascada:** al eliminar un expediente se borran sus tareas, hitos,
participantes y enlaces. Al eliminar una tarea se borran sus métricas y enlaces
de Drive.

### Enlaces públicos con más detalle

- Se generan desde el panel **«Compartir»** de un expediente.
- El enlace apunta a `https://<frontend>/s/<token>`.
- Rol **`viewer`**: se ve el expediente en modo lectura.
- Rol **`editor`**: además se pueden editar los datos del expediente y crear,
  editar o borrar tareas. La API valida el rol en cada `PATCH`/`POST`/`DELETE`
  bajo `/shared/:token`.
- **Rotar** el token invalida el enlace anterior al instante.
- Si el token ya no resuelve (se rotó, o el expediente fue eliminado), la API
  responde **410** y el frontend muestra una pantalla propia de «expediente no
  disponible» en lugar de un error crudo.

---

## 3. Estructura del repositorio

### Backend (`src/`)

```
src/
  index.ts              toda la API: middlewares + rutas (un solo archivo)
  lib/
    prisma.ts           cliente Prisma sobre pool de pg + "include" reutilizable
    validation.ts       cleanText / requiredDate / requiredNumber
    projectMath.ts      monthsBetween, assertDateOrder, recomputeProjectProgress
    share.ts            tokens de enlace público, roles y errores 403/410
  generated/prisma/     cliente Prisma generado (no está en Git; se genera en cada build)

prisma/
  schema.prisma         los 9 modelos
  migrations/           20260822221847_init · 20260906120000_add_share_links

scripts/
  copy-prisma-client.js copia src/generated/prisma al dist tras compilar

test/
  validation.test.ts    pruebas unitarias (node:test vía tsx) — no tocan la base
```

### Frontend (`frontend/`)

```
app/
  layout.tsx            fuentes Geist + globals.css + script anti-parpadeo de tema
  page.tsx              → <PlannerApp/>
  s/[token]/            ruta pública del expediente compartido
  globals.css           hoja única: tokens · base · primitivas · layout · vistas · responsive

lib/
  api.ts               capa HTTP: URL base, endpoints tipados, reintentos, mensajes de error
  types.ts             tipos compartidos (Project, Task, …)
  format.ts            utilidades puras (fechas en UTC, moneda, iniciales, saludo)
  normalize.ts         normaliza tareas y calcula la geometría de las barras del Gantt

hooks/
  useTheme.ts          tema claro/oscuro (data-theme en <html> + localStorage)
  useNotifications.ts  lista de avisos, persistida en localStorage

components/
  ui/                  primitivas: Icon, Modal, ProgressBar, Badge, Avatar, StatCard,
                       EmptyState, SectionHeading, ValidatedField, SelectOrCreate, ConfirmDialog
  planner/
    PlannerApp.tsx         estado global y handlers
    Screens.tsx            pantalla de carga + pantalla de acceso (demo)
    AppShell.tsx           barra lateral + barra superior + notificaciones
    UserMenu.tsx           menú de usuario
    DashboardView.tsx      resumen general de la cartera
    ProjectsView.tsx       lista de expedientes + filtros
    ProjectDetailView.tsx  resumen del expediente (métricas, equipo, hitos) + pestañas
    GanttChart.tsx         cronograma con líneas de cuadrícula y marcador de «hoy»
    ProjectFormModal.tsx   alta y edición de expediente
    TaskFormModal.tsx      alta y edición de tarea + métricas + enlaces de Drive
    MemberFormModal.tsx    alta de participante
    MilestoneFormModal.tsx alta y edición de hito
    SettingsView.tsx       «Configuración»: alta y baja de áreas técnicas y estados de equipo
    ShareManager.tsx       panel «Compartir»
    SharedRoute.tsx        ruta /s/[token]: decide qué mostrar
    SharedExpediente.tsx   vista pública del expediente
    ExpedienteUnavailable.tsx  pantalla «expediente no disponible»
```

---

## 4. La API

Base local: `http://localhost:3001` · Producción: la URL del servicio en Render.

Todas las respuestas son JSON. Los errores tienen forma `{ "error": "mensaje" }`.
Los mensajes de validación (una línea) se muestran tal cual; los errores internos
se ocultan tras un texto genérico.

### Salud

| Método | Ruta | Devuelve |
| --- | --- | --- |
| `GET` | `/` | mensaje de estado |
| `GET` | `/health` | `{ "ok": true }` |

### Expedientes

| Método | Ruta | Cuerpo | Notas |
| --- | --- | --- | --- |
| `GET` | `/projects` | — | lista con tareas, hitos y participantes incluidos |
| `GET` | `/projects/:id` | — | 404 si no existe |
| `POST` | `/projects` | `name, startDate, endDate, budget, ownerName` | calcula `durationMonths`; `progress` empieza en 0 |
| `PATCH` | `/projects/:id` | cualquiera de los anteriores | si cambian las fechas, revalida y recalcula la duración |
| `DELETE` | `/projects/:id` | — | borra en cascada |

### Catálogos

| Método | Ruta | Cuerpo | Notas |
| --- | --- | --- | --- |
| `GET` / `POST` | `/technical-areas` | `name` | — |
| `DELETE` | `/technical-areas/:id` | — | **409** si alguna tarea la usa |
| `GET` / `POST` | `/team-statuses` | `type` | — |
| `DELETE` | `/team-statuses/:id` | — | **409** si algún participante lo usa |

### Tareas, equipo, hitos

| Método | Ruta | Cuerpo |
| --- | --- | --- |
| `POST` | `/projects/:projectId/tasks` | `name, startDate, endDate, technicalAreaId, ownerName, progress?, dependency?, isPhase?` |
| `PATCH` | `/tasks/:id` | cualquiera de los campos de la tarea |
| `DELETE` | `/tasks/:id` | — |
| `POST` | `/projects/:projectId/team-members` | `name, teamStatusId` |
| `DELETE` | `/team-members/:id` | — |
| `POST` | `/projects/:projectId/milestones` | `description, date` |
| `PATCH` / `DELETE` | `/milestones/:id` | `description?, date?` |

Crear, editar o borrar una tarea **recalcula el `progress` del expediente**.

### Métricas y enlaces de una tarea

| Método | Ruta | Cuerpo |
| --- | --- | --- |
| `POST` | `/tasks/:taskId/performance-metrics` | `unit, ratePerDay, divisor` |
| `DELETE` | `/performance-metrics/:id` | — |
| `POST` | `/tasks/:taskId/drive-links` | `url` (debe empezar por `http://` o `https://`) |
| `DELETE` | `/drive-links/:id` | — |

### Enlaces públicos — gestión

| Método | Ruta | Cuerpo |
| --- | --- | --- |
| `GET` | `/projects/:projectId/share-links` | — |
| `POST` | `/projects/:projectId/share-links` | `role` (`viewer` \| `editor`), `label?` |
| `PATCH` | `/share-links/:id` | `rotate?` (regenera el token), `role?`, `label?` |
| `DELETE` | `/share-links/:id` | — |

### Enlaces públicos — acceso sin sesión

| Método | Ruta | Rol | Notas |
| --- | --- | --- | --- |
| `GET` | `/shared/:token` | viewer/editor | devuelve `{ role, project }`; **410** si el enlace ya no vale |
| `PATCH` | `/shared/:token` | editor | edita nombre, presupuesto, responsable y fechas del expediente |
| `POST` | `/shared/:token/tasks` | editor | crea una tarea |
| `PATCH` | `/shared/:token/tasks/:taskId` | editor | edita una tarea |
| `DELETE` | `/shared/:token/tasks/:taskId` | editor | borra una tarea |

### Middlewares aplicados a toda la API

- **`helmet`** para cabeceras de seguridad.
- **CORS**: solo se aceptan los orígenes de `FRONTEND_ORIGIN` (lista separada por
  comas). Un origen no permitido no recibe cabeceras CORS y el navegador corta la
  respuesta — sin devolver un 500.
- **Cupo de peticiones** (`express-rate-limit`), con **buckets separados**: 600
  peticiones / 15 min para `/shared/*` y 300 / 15 min para el resto, para que el
  tráfico público y el de administración no se bloqueen entre sí.
- **`express.json`** con límite de 10 kB por cuerpo.
- **404 y 500 en JSON**, nunca HTML con stack.
- **Cierre ordenado** ante `SIGTERM` (Render lo envía en cada redeploy): cierra el
  servidor y el pool de conexiones antes de salir.

---

## 5. Reglas de negocio que conviene conocer

- **`durationMonths` es derivado**: meses entre `startDate` y `endDate`,
  redondeado, mínimo 1. El cliente no lo envía.
- **`progress` del expediente es derivado**: promedio del `progress` de sus
  tareas. Si no tiene tareas, se queda como está (0 al crearlo).
- **Orden de fechas**: `endDate` nunca puede ser anterior a `startDate`, ni en
  expedientes ni en tareas (**400**).
- **Validación de texto** (`cleanText`): campo obligatorio salvo que se marque
  opcional, máximo 300 caracteres, no se permiten `<` ni `>`, se hace `trim`.
- **Fechas de solo día** se guardan y se muestran en UTC, para que no aparezca
  «el día anterior» en zonas horarias negativas.
- **Arranque en frío**: en el plan gratuito de Render el servicio se duerme. La
  capa `lib/api.ts` del frontend **reintenta los GET** un par de veces con espera
  creciente y muestra el aviso «Conectando con el servidor…».

---

## 6. Desarrollo local

### Requisitos

- Node.js ≥ 20.19 (el backend) / ≥ 20 (el frontend). La CI usa Node 22.
- Una base PostgreSQL accesible (Neon, o Postgres local) para el backend.

### Backend

```bash
npm install
# crear un archivo .env con:  DATABASE_URL="postgresql://usuario:clave@host:5432/basedatos"
npx prisma migrate deploy     # aplica las migraciones a esa base
npm run dev                    # arranca en http://localhost:3001 (recarga con tsx)
npm test                       # pruebas unitarias de validación
```

### Frontend

```bash
cd frontend
npm install
# opcional: NEXT_PUBLIC_API_URL=http://localhost:3001  (es el valor por defecto)
npm run dev                    # http://localhost:3000
```

Si no se define `NEXT_PUBLIC_API_URL`, el frontend asume `http://localhost:3001`.

---

## 7. Build y despliegue

| Servicio | Configuración |
| --- | --- |
| **Neon** | Base PostgreSQL. De ahí sale `DATABASE_URL` (cadena *pooled*, con `sslmode=require`). |
| **Render** (backend) | Build: `npm install && npm run render-build` · Start: `npm start` |
| **Vercel** (frontend) | Root Directory: `frontend` · Build: `npm run build` |

### Scripts del backend

| Script | Qué hace |
| --- | --- |
| `npm run dev` | ejecuta `src/index.ts` con `tsx` (sin compilar) |
| `npm run build` | `prisma generate` + `tsc` + copia del cliente Prisma a `dist/` |
| `npm run render-build` | igual que `build` **+ `prisma migrate deploy`** |
| `npm start` | `node dist/index.js` |
| `npm test` | pruebas unitarias con `node:test` vía `tsx` |

> El cliente Prisma generado vive en `src/generated/prisma`, está fuera de Git y
> **no lo compila `tsc`**; por eso `copy-prisma-client.js` lo copia tal cual al
> `dist/` después de compilar.

### Migraciones de la base

Las migraciones están en `prisma/migrations/`. En producción se aplican con
`prisma migrate deploy` (incluido en `render-build`) o ejecutándolo una vez a
mano contra la base de Neon. Los detalles paso a paso están en
[`GUIA_APIS_RENDER_NEON_VERCEL.txt`](GUIA_APIS_RENDER_NEON_VERCEL.txt).

### Variables de entorno

| Variable | Servicio | Valor | Notas |
| --- | --- | --- | --- |
| `DATABASE_URL` | Render | cadena *pooled* de Neon con `sslmode=require` | **Solo aquí y en el `.env` local.** Nunca en Git, Vercel ni el navegador |
| `FRONTEND_ORIGIN` | Render | p. ej. `https://tu-app.vercel.app,http://localhost:3000` | orígenes que CORS acepta, separados por comas |
| `PORT` | Render | lo inyecta Render | el backend usa `process.env.PORT`; en local cae a 3001 |
| `NEXT_PUBLIC_API_URL` | Vercel | la URL pública del backend en Render, **sin barra final** | si falta, el frontend intenta `localhost` y las llamadas fallan en producción |

---

## 8. Integración continua

`.github/workflows/ci.yml` corre en cada push a `main` y en cada Pull Request,
**sin base de datos** (todo funciona offline):

- **backend**: `npm ci` → `npm run build` → `npm test`
- **frontend**: `npm ci` → `npx eslint` → `npx next build` (que además hace la
  comprobación de tipos de TypeScript)

---

## 9. Estado actual y pendientes

- **No hay autenticación con credenciales todavía.** La pantalla de acceso es una
  demostración (un botón que entra) y la API es abierta. Es una decisión temporal
  mientras el sistema está en construcción; **antes de manejar datos reales hay
  que añadir inicio de sesión y autorización**.
- Los enlaces públicos sí tienen control de acceso propio (token opaco + rol
  validado en el servidor).

---

## 10. Documentación adicional

| Archivo | Contenido |
| --- | --- |
| [`frontend/DESIGN.md`](frontend/DESIGN.md) | Interfaz: estructura de componentes, sistema visual, responsive, validación de formularios |
| [`patches/README.md`](patches/README.md) | Historial de parches y correcciones, en orden |
| [`GUIA_APIS_RENDER_NEON_VERCEL.txt`](GUIA_APIS_RENDER_NEON_VERCEL.txt) | Despliegue completo en Neon + Render + Vercel, paso a paso, con solución de problemas |
