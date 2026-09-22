# Parche 022: el botón «Añadir material» ahora se distingue

## Qué se pidió

Se podía confundir «Añadir material» con «Guardar cambios» / «Crear
tarea» y pensar que el material seleccionado se guardaba solo al usar
esos botones grandes. Se pidió darle un color distinto a «Añadir
material» y algo que aclare para qué sirve.

## Qué se corrigió

- **`app/globals.css`**: nueva clase `.btn-success` (verde sólido,
  distinto del morado de «Guardar cambios» / «Crear tarea») y `.form-hint`
  para texto de ayuda discreto.
- **`TaskFormModal.tsx`**: el botón «Añadir material» ahora usa
  `.btn-success` y debajo aparece: «Pulsa aquí para sumar cada material a
  la lista de arriba. Elegirlo y llenar sus campos no alcanza: sin este
  botón no queda registrado, ni al crear la tarea ni al guardar cambios.»

## Validación

- `npx tsc --noEmit`, `npx eslint . --quiet`: correctos.
- Verificado en el navegador, en modo claro y oscuro, sobre la tarea real
  «Casa Auxiliar» del expediente «Lutx»: el botón se ve verde y distinto
  del morado de «Guardar cambios», con el texto de ayuda visible debajo.
  Se limpió un material de prueba que había quedado de una verificación
  anterior; el expediente quedó igual que antes.
