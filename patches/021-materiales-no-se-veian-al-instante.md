# Parche 021: los materiales sí se guardaban, solo tardaban en aparecer

## Qué se reportó

Al editar una tarea, llenar los campos de un material («Cantidad a usar» y
los valores de su métrica) y pulsar «Añadir material», la lista seguía
mostrando «Sin materiales.» — parecía que el botón no hacía nada.

## Qué encontré al investigar

**El material sí se estaba guardando en el backend.** Lo confirmé
reproduciendo la petición real (`POST /tasks/:taskId/materials`) contra
producción: respondía `201` de inmediato con el material creado.

El problema estaba en cómo se refrescaba la pantalla: después de guardar,
el modal esperaba a una recarga completa del expediente
(`GET /projects/:id`) para volver a mostrar la lista de materiales. Esa
consulta puede tardar varios segundos —más aún si el servicio de Render
llevaba un rato inactivo y tiene que «despertar»— y mientras tanto no había
ningún aviso de que algo estuviera en curso. El usuario veía la lista
vacía, asumía que había fallado, y probaba de nuevo o cerraba el modal sin
llegar a ver que sí se había guardado (lo confirmé: encontré materiales
duplicados en la tarea de prueba, de intentos que sí funcionaron pero
"tardaron").

## Qué se corrigió

- **`TaskFormModal.tsx` (`TaskExtras`)**: la lista de materiales y de
  enlaces de Drive ahora se actualiza **al instante** con la respuesta que
  ya devuelve el propio servidor al crear o borrar, en vez de esperar a
  que el modal reciba la tarea completa de vuelta. Esa recarga en segundo
  plano se sigue disparando (para que el Gantt y la pestaña «Tareas»
  también se pongan al día), pero ya no bloquea lo que ve el usuario.
- Los botones «Añadir material» y «Añadir enlace» ahora muestran
  «Añadiendo…» y se deshabilitan mientras se guarda, para que quede claro
  que la acción está en curso y no se pueda enviar dos veces sin querer.
- Si el borrado o la creación falla de verdad, la fila se revierte y se
  muestra el error (antes solo fallaba en silencio si el modal ya se había
  cerrado).

No hubo cambios de backend ni de esquema: el problema era enteramente de
la interfaz.

## Validación

- `npx tsc --noEmit`, `npx eslint . --quiet`, `npx next build`: correctos.
- Reproducido y verificado en el navegador contra producción, en la tarea
  real «Casa Auxiliar» del expediente «Lutx»: se agregó «Vidrio templado»
  (cantidad 8, Área (m²): 8) y apareció en la lista sin demora perceptible;
  se quitó y volvió a mostrar «Sin materiales.» también al instante. Los
  materiales de prueba (incluidos los duplicados detectados durante la
  investigación) se eliminaron al terminar; el expediente quedó igual que
  antes de la prueba.
