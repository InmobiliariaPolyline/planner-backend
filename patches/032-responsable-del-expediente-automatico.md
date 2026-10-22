# Parche 032: Responsable del expediente automático, con desplegable

## Qué se pidió

El responsable del expediente debe ser automáticamente quien lo crea, o poder
elegirlo de un desplegable con las cuentas existentes del sistema.

## Qué cambia (solo frontend; `ProjectFormModal.tsx`, `PlannerApp.tsx`)

- Al **crear** un expediente, «Responsable» ya no es texto libre: es un
  desplegable con las cuentas del sistema (`GET /users/basic`) y viene
  **preseleccionada la cuenta que lo crea** (marcada «(tú)»).
- Al **editar**, el mismo desplegable permite reasignar a otra cuenta; si el
  responsable actual no figura (cuenta eliminada o texto antiguo) se conserva
  como primera opción.
- Si no hay cuentas disponibles (p. ej. el editor por enlace público, que no
  inicia sesión) se mantiene el campo de texto de siempre.

No requiere migración ni cambios de backend.

## Validación

`npx tsc --noEmit` y `npx eslint . --quiet` sin errores. Verificado en el
navegador: el formulario muestra el desplegable con «Administrador (tú)» y su
ayuda.
