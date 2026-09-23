# Parche 023: correcciones de errores encontrados en el testeo completo del sistema

Todo lo listado aquí salió de un testeo de punta a punta pedido explícitamente
(recorrer cada función del sistema y su forma de uso). Se corrigen todos los
hallazgos, de mayor a menor severidad.

## 1. Un 401 ya no se confunde con "tu sesión caducó"

Antes, **cualquier** respuesta 401 del backend hacía que el frontend cerrara
la sesión y mostrara «Tu sesión caducó. Vuelve a iniciar sesión.» — sin
importar si de verdad había una sesión que expiró. Esto rompía tres cosas:

- **Login con usuario/contraseña incorrectos**: en vez de «Usuario o
  contraseña incorrectos» (el mensaje real que ya mandaba el backend), se
  veía «tu sesión caducó», que no tiene sentido en la pantalla de acceso
  (nunca hubo sesión).
- **Cambiar la propia contraseña con la actual mal escrita**: cerraba la
  sesión por completo en vez de mostrar el error de validación. La
  contraseña real no cambiaba, pero se perdía cualquier trabajo sin
  guardar y confundía al usuario.
- Cualquier futura ruta que devolviera 401 por error de validación (no por
  sesión inválida) tendría el mismo problema.

**Corrección:**
- **`src/index.ts`**: `PATCH /auth/password` con la contraseña actual
  incorrecta ahora responde **400**, no 401 (la sesión sigue siendo
  válida; es un error de validación, no de autenticación).
- **`frontend/lib/api.ts`**: `request()` solo interpreta un 401 como
  "sesión caducada" (y cierra la sesión) cuando la petición **llevaba un
  token** que el servidor rechazó. Sin token — como en el login, o en un
  enlace público — nunca hubo sesión que expirar, así que el 401 se deja
  pasar tal cual con el mensaje real del servidor.

## 2. Los enlaces públicos "Editor" no podían crear tareas

El formulario de nueva tarea exige un área técnica, pero ni `GET
/technical-areas` ni `POST /technical-areas` estaban permitidos sin sesión
(solo las rutas bajo `/shared/` lo están). Un enlace público de editor
nunca podía listar ni crear un área técnica — el selector quedaba vacío y
crear una nueva mostraba, encima, el mensaje equivocado de "sesión
caducada" (por el bug de arriba). Lo mismo pasaba con el catálogo de
materiales (`GET /materials`) y con agregar/quitar materiales y enlaces de
Drive a una tarea ya creada desde ese mismo enlace.

**Corrección — nuevas rutas bajo `/shared/:token/…`, con las mismas reglas
de acceso que ya usan las tareas compartidas** (cualquier rol puede leer;
solo "editor" puede escribir):
- `GET /shared/:token/technical-areas`, `POST /shared/:token/technical-areas`
- `GET /shared/:token/materials`
- `POST /shared/:token/tasks/:taskId/materials`,
  `DELETE /shared/:token/task-materials/:id`
- `POST /shared/:token/tasks/:taskId/drive-links`,
  `DELETE /shared/:token/drive-links/:id`

**Frontend:** `TaskFormModal.tsx` ahora recibe qué funciones usar para
materiales/enlaces mediante una prop `extrasApi` (por defecto, las
autenticadas de siempre); `SharedExpediente.tsx` arma la suya ligada al
token del enlace y la pasa a ambos modales de tarea. De paso, se conectó
algo que faltaba: al crear una tarea desde un enlace público, los
materiales elegidos ahora sí se envían (antes se descartaban en silencio,
el parámetro ni se leía).

## 3. Tarea duplicada si fallaba un material al crear

Si la tarea se creaba bien pero fallaba agregar alguno de sus materiales
(p. ej. un corte de red), el modal relanzaba el error y quedaba listo para
reintentar — pero la tarea **ya existía** en el backend. Reintentar
"Crear tarea" pensando que no se había guardado nada creaba una tarea
duplicada.

**Corrección** (`PlannerApp.tsx` y `SharedExpediente.tsx`): agregar cada
material ya no relanza el error hacia arriba; si alguno falla, la tarea se
da por creada igual (se cierra el modal) y se avisa cuáles materiales no
se pudieron agregar, para volver a intentarlo desde la edición.

## 4. Cantidad de material: ya no se acepta 0 por API directa

La interfaz ya exigía «mayor que 0», pero el backend aceptaba `quantity: 0`
si se llamaba a la API directamente. Nuevo `parseQuantity()` en
`src/lib/materials.ts` (con prueba unitaria) usado en las rutas
autenticada y compartida de agregar material.

## 5. Detalle menor: "1 materiales"

`GanttChart.tsx` decía «1 materiales» en la fila de cada tarea; ahora usa
singular/plural correcto («1 material», «2 materiales»).

## Ya corregido antes de este parche (en el mismo testeo)

La sección 7 de la Guía de uso todavía describía las «métricas de
rendimiento» eliminadas hace varios parches; se corrigió aparte, ver commit
`a7133fa`.

## Validación

- Backend: `npx prisma validate`, `npm run build`, `npm test` (11, incluye
  la prueba nueva de `parseQuantity`): correctos.
- Frontend: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx next build`:
  correctos.
- Verificado en el navegador contra producción:
  - Login con contraseña incorrecta → «Usuario o contraseña incorrectos.»
    (antes: «tu sesión caducó»).
  - El cambio de contraseña con la actual mal escrita solo pudo
    verificarse tras desplegar el backend (el 401→400 es un cambio de
    servidor); ver nota abajo.

## Pendiente para el operador

Como siempre con cambios de backend, hace falta aplicar el despliegue en
Render (`git push` ya hecho a `main`; Render construye solo con
`npm run render-build`, que no incluye una migración nueva esta vez — no
hay cambios de esquema en este parche). Una vez desplegado, probar de
nuevo cambiar la contraseña con la actual mal escrita: debe mostrar el
error en el propio formulario, sin cerrar la sesión.
