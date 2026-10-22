# Parche 037: Rediseño del PDF al nivel de la interfaz

## Qué cambia (solo frontend)

El PDF se rehízo en `frontend/lib/pdfReport.ts` (los helpers comunes pasan a
`lib/exportShared.ts`; `transfer.ts` solo conserva el Excel y re-exporta el PDF).

**Informe del expediente**

- **Portada:** marca de la app, tipo de informe, título grande, responsable,
  periodo y duración, y el **logotipo del expediente** si lo tiene.
- **Tarjetas de cifras** con filete de color (avance, presupuesto, tareas
  completadas, equipo).
- **Estado de las tareas:** anillo dibujado con completadas / en curso / sin
  iniciar y aviso de atrasadas.
- **Ritmo del proyecto:** tiempo transcurrido frente al avance real, con un
  veredicto (al ritmo previsto, por debajo, plazo vencido) y días restantes.
- **Cronograma Gantt dibujado:** barras con el progreso (verde completada, violeta
  en curso, roja atrasada), fases resaltadas, cuadrícula de meses, línea de
  «Hoy» y rombos de hitos; se parte en varias páginas con la cabecera repetida.
- **Detalle de tareas** con área, responsable, plazo y barra de avance.
- **Materiales agrupados por categoría.**
- **Equipo** en tarjetas con avatar e **hitos** en línea de tiempo (verde los ya
  vencidos).
- Cabecera de página en las siguientes hojas y pie «Project Planner V… · Página X de Y».

**Informe del historial:** mismas tarjetas (sucesos, positivos, negativos,
personas) y línea de tiempo agrupada por día, con punto de color por tipo de
suceso y los cambios como «antes > después».

## Validación

`tsc`, `eslint` y `next build` sin errores. Se generaron PDF reales con datos
ficticios y se revisaron como imagen: expediente completo (3 páginas),
historial, expediente vacío, logotipo inválido y un expediente de 70 tareas
(8 páginas). El Excel sigue importándose igual (ida y vuelta verificada). No
requiere migración ni cambios de backend.
