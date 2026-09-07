# Interfaz del planner — diseño y estructura

Rediseño completo de la interfaz + reorganización del código (antes todo vivía en
un solo `app/page.tsx` de ~420 líneas y dos hojas CSS globales con reglas
duplicadas).

## Estructura

```
app/
  layout.tsx          fuentes (Geist) + import de globals.css
  page.tsx            → <PlannerApp/>
  globals.css         hoja única: tokens · base · primitivas · layout · vistas · responsive

lib/
  types.ts           tipos compartidos (Project, Task, …)
  api.ts             capa HTTP: URL base + endpoints tipados + mensajes de error
  format.ts          utilidades puras (fechas, moneda, iniciales, saludo…)
  normalize.ts       normalizeTasks() + geometría de las barras del Gantt

hooks/
  useTheme.ts         tema claro/oscuro (atributo data-theme en <html> + localStorage)
  useNotifications.ts  lista de notificaciones en memoria

components/
  ui/                 primitivas: Icon, Modal, ProgressBar, Badge, Avatar,
                      StatCard, EmptyState, SectionHeading
  planner/
    PlannerApp.tsx        contenedor con estado y handlers (era el componente Home)
    Screens.tsx           LoadingScreen (logo + barra "iniciando sistema" + % ) + LoginScreen
    AppShell.tsx          sidebar + topbar + menú de notificaciones
    UserMenu.tsx          HUD de usuario del topbar: avatar con estado + popover (cerrar sesión)
    DashboardView.tsx
    ProjectsView.tsx      toolbar de filtros + grid + ProjectCard
    ProjectDetailView.tsx resumen (métricas, equipo, hitos) + pestañas
    GanttChart.tsx
    ProjectFormModal.tsx  alta y edición de expediente
```

La lógica de interacción no cambió: las altas de tarea, participante e hito
siguen usando `window.prompt`, y el borrado usa `window.confirm`. Lo que se
reorganizó son las llamadas a la API (ahora en `lib/api.ts`) y el cableado de los
botones del Gantt (antes se conectaban con `document.querySelector` +
`addEventListener` y una variable global mutable; ahora son props `onClick`).

## Sistema visual

Todos los tokens son variables CSS en `:root` (y su override en
`:root[data-theme="dark"]`). No hay valores de color, radio ni sombra escritos a
mano fuera de esa sección.

- **Tipografía**: Geist Sans (cuerpo y títulos) + Geist Mono (IDs y códigos).
  Escala `--text-xs … --text-3xl`.
- **Color**: base neutra (grises) + un único acento índigo (`--accent`) +
  semánticos (`--success` / `--warning` / `--danger`) con su variante `-subtle`
  para fondos y `-on-subtle` para texto.
- **Superficies**: `--bg`, `--surface`, `--surface-2`, `--border`.
- **Radios**: `--radius-sm` 8px, `--radius` 12px, `--radius-lg` 16px.
- **Sombras**: `--shadow-xs … --shadow-lg`, discretas.
- **Movimiento**: `--dur` / `--ease`; se respeta `prefers-reduced-motion`.
- **Iconos**: `components/ui/Icon.tsx`, SVG de trazo dibujados a mano (sin
  dependencias). Antes eran emojis.

## Responsive

- ≤ 1080px: la barra lateral se colapsa a una columna de iconos.
- ≤ 860px: métricas y columnas de detalle a una sola columna; se oculta el panel
  ilustrado del login.
- ≤ 720px: se oculta la barra lateral; cabeceras y formularios en una columna.
- El cronograma Gantt siempre hace scroll horizontal dentro de su contenedor.

## Temas

`useTheme` fija `data-theme="light" | "dark"` en `<html>`, así el fondo global y
cualquier portal (modales) heredan el tema. Se persiste en `localStorage`
(`project-planner-theme`), con `try/catch` por si el almacenamiento no existe.
