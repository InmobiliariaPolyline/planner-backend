# Parche 007: refinamiento visual e interfaz de configuración

Repaso del sistema de diseño del frontend y una vista nueva para administrar los
catálogos. **La pantalla de acceso no se toca** (sigue siendo demo sin
autenticación, decisión temporal del proyecto).

## Sistema de diseño (`frontend/app/globals.css`)

Refinamiento en el sitio, sin renombrar clases (los componentes no cambian de
API). Se conservan las reglas responsive y las de `.login-*`.

- **Tokens**: escala tipográfica y de radios ampliada; fondo y superficies
  recalibrados (más contraste entre `--surface`, `--surface-2`, `--surface-3`);
  `--accent-2` para degradados; anillo de foco `--accent-ring`; tokens de
  elevación en capas (`--elev-1..4`) y de motion (`--ease`, `--ease-out`,
  `--dur-*`). `color-scheme` explícito en claro y oscuro.
- **Modo oscuro** retocado: `--accent-fg` pasa a blanco (antes casi negro sobre
  el acento), superficies y peligro reajustados, sombras propias.
- **Base**: `text-rendering`, `text-wrap: balance` en títulos, `::selection`,
  barras de desplazamiento finas, `.skeleton` con shimmer, respeto de
  `prefers-reduced-motion`.
- **Primitivas**: botón primario con degradado y sombra de color; `.btn-ghost`
  nuevo; `.badge` con punto de color; `.stat-card`, `.empty-state`, `.ring`,
  `.project-card` (franja superior en hover), `.progress`, `.tabs` y `.nav-item`
  (píldora de acento en el ítem activo) revisados.
- **Inputs**: se estilan también `email` / `password` / `url` / `textarea`;
  estados hover / focus / disabled; icono del date-picker visible en oscuro.
- **Modal**: estructura explícita `.modal-head` + `.modal-body` (cabecera fija,
  cuerpo con scroll), backdrop con desenfoque, animación de entrada.
- **Gantt**: líneas de cuadrícula en la pista, marcador de "Hoy" y su leyenda,
  barras con degradado.

## Interfaz de configuración (nuevo)

- **`components/planner/SettingsView.tsx`**: vista "Configuración" con dos
  paneles (`CatalogPanel`) para **áreas técnicas** y **estados de equipo**:
  listar, crear en línea y eliminar. El borrado muestra el error del backend
  (409 si el elemento está en uso).
- **`lib/api.ts`**: `deleteTechnicalArea` y `deleteTeamStatus` (consumen los
  `DELETE` añadidos en el parche 006).
- **`lib/types.ts`**: `ActiveView` incluye `"settings"`.
- **`components/planner/AppShell.tsx`**: ítem de navegación "Configuración"
  (icono nuevo) y su miga de pan.
- **`components/planner/PlannerApp.tsx`**: estado y manejadores de alta/baja de
  catálogos, render de la vista.
- **`components/ui/Icon.tsx`**: icono `settings`.

## Correcciones de modo oscuro (posteriores)

- **Logotipo invisible en oscuro**: `.sidebar-brand span` / `.public-brand span`
  alcanzaban también al `<span class="brand-mark">` y le imponían
  `color: var(--text-muted)`, dejando el icono casi sin contraste sobre el
  degradado morado. Los selectores se acotan a `> div span`. Mismo arreglo en
  `.sidebar-footer span`, que apagaba las iniciales del avatar.
- `--text-muted` en oscuro sube de `#79808d` a `#8a91a0` (AA en texto pequeño
  para etiquetas, pistas y epígrafes).
- `.crumb-sep` usa `--text-muted` (antes `--border-strong`, apenas visible).
- Sombras con `rgba(15,22,41,…)` que se perdían en oscuro (`.ring-center`,
  `.gantt-bar`) pasan a tokens de elevación / negro translúcido.

## Validación en todos los formularios (posterior)

Antes solo el alta/edición de expediente mostraba el borde rojo y la ventana
emergente con requisitos y ejemplo. Ahora el mismo trato cubre todos:

- **`SelectOrCreate`** (área técnica en la tarea, estado en el participante):
  nuevas props `required` / `showErrors` / `example`. Borde rojo y aviso
  «Selecciona una opción o crea una nueva» si se envía vacío; ventana de ayuda al
  enfocar el `select` (y también el campo de «crear nueva», con sus reglas).
- **Alta de tarea → «Depende de»**: pasa a `ValidatedField` (opcional; solo
  avisa si supera 300 caracteres o lleva `< >`).
- **Edición de tarea → métricas y enlaces de Drive**: los cuatro campos (unidad,
  ritmo por día, divisor, dirección del enlace) usan `ValidatedField` con sus
  reglas — el enlace exige empezar por `http://` o `https://`, el divisor un
  entero ≥ 1.
- **Configuración → catálogos**: el campo de alta usa `ValidatedField`
  (obligatorio, ≤ 300, sin `< >`).
- `ValidatedField` admite `type="url"`.

## Validación

- `npx tsc --noEmit`, `npx eslint`, `npx next build`: correctos.
- Probado contra Neon: alta y baja de área técnica desde la vista de
  configuración; navegación entre Dashboard / Expedientes / Detalle / Gantt /
  Configuración; modales con la nueva estructura (cerrar con Escape y clic
  fuera); envío vacío de alta de tarea, métricas y catálogos → todos los campos
  se marcan en rojo con su motivo; modo claro y oscuro.
