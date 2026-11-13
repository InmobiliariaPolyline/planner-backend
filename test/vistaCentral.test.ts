import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  construirVista,
  crearPlanificador,
  estadoProyecto,
  mensajeSeguro,
  sincronizar,
  sincronizarSeguro,
  vistaCentralMiddleware,
  type Fuente,
  type HitoOrigen,
  type ProyectoOrigen,
} from '../src/lib/vistaCentral';

const hoy = new Date('2026-06-15T12:00:00Z');
const d = (s: string) => new Date(`${s}T00:00:00Z`);

const proyecto = (over: Partial<ProyectoOrigen> = {}): ProyectoOrigen => ({
  id: 'p1', name: 'Torre Norte', ownerName: 'Ana', startDate: d('2026-01-01'), endDate: d('2026-12-31'),
  progress: 40, tasks: [], ...over,
});

test('estadoProyecto: terminado, atrasado, por iniciar y en curso', () => {
  assert.equal(estadoProyecto(proyecto({ progress: 100, endDate: d('2026-01-02') }), hoy), 'terminado');
  assert.equal(estadoProyecto(proyecto({ endDate: d('2026-06-01') }), hoy), 'atrasado');
  assert.equal(estadoProyecto(proyecto({ startDate: d('2026-07-01') }), hoy), 'por iniciar');
  assert.equal(estadoProyecto(proyecto(), hoy), 'en curso');
});

test('construirVista: cuenta tareas atrasadas y elige el próximo hito', () => {
  const tareas = [
    { endDate: d('2026-06-01'), progress: 50 },  // vencida y incompleta → atrasada
    { endDate: d('2026-06-01'), progress: 100 }, // vencida pero completa
    { endDate: d('2026-09-01'), progress: 0 },   // aún no vence
  ];
  const hitos: HitoOrigen[] = [
    { id: 'h1', projectId: 'p1', description: 'Vaciado de losa', date: d('2026-07-10') },
    { id: 'h2', projectId: 'p1', description: 'Entrega de planos', date: d('2026-06-20') },
    { id: 'h3', projectId: 'p1', description: 'Ya pasó hace mucho', date: d('2026-05-01') },
  ];
  const v = construirVista([proyecto({ tasks: tareas })], hitos, hoy);
  assert.equal(v.proyectos.length, 1);
  assert.equal(v.proyectos[0].tareas_total, 3);
  assert.equal(v.proyectos[0].tareas_atrasadas, 1);
  assert.equal(v.proyectos[0].proximo_hito, 'Entrega de planos');
  assert.equal(v.proyectos[0].proximo_hito_fecha, '2026-06-20');
  assert.deepEqual(v.hitos.map(h => h.hito_id), ['h2', 'h1']); // el viejo se descarta, orden por fecha
});

test('construirVista: no incluye presupuesto, equipo ni logotipo', () => {
  const origen = { ...proyecto(), budget: 123456, logoUrl: 'data:image/png;base64,AAA', teamMembers: [{ name: 'X' }] };
  const fila = construirVista([origen as ProyectoOrigen], [], hoy).proyectos[0];
  assert.deepEqual(Object.keys(fila).sort(), [
    'avance_pct', 'estado', 'fin', 'inicio', 'nombre', 'proximo_hito', 'proximo_hito_fecha', 'proyecto_id',
    'responsable', 'tareas_atrasadas', 'tareas_total',
  ]);
});

test('construirVista: ignora hitos de proyectos que no existen y acota el avance a 0-100', () => {
  const v = construirVista(
    [proyecto({ progress: 140 })],
    [{ id: 'h9', projectId: 'otro', description: 'x', date: d('2026-07-01') }],
    hoy,
  );
  assert.equal(v.hitos.length, 0);
  assert.equal(v.proyectos[0].avance_pct, 100);
});

test('sincronizar: manda 5 consultas parametrizadas y marca la hora de sincronización', async () => {
  const consultas: { text: string; params?: unknown[] }[] = [];
  const central = { query: async (text: string, params?: unknown[]) => { consultas.push({ text, params }); } };
  const fuente: Fuente = { leer: async () => ({ proyectos: [proyecto()], hitos: [] }) };
  const r = await sincronizar(fuente, central, hoy);
  assert.deepEqual(r, { proyectos: 1, hitos: 0 });
  assert.equal(consultas.length, 5);
  assert.match(consultas[4].text, /sync_estado/);
  // Los datos viajan como parámetro, nunca pegados en el SQL.
  assert.ok(!consultas[0].text.includes('Torre Norte'));
  assert.ok(String(consultas[0].params?.[0]).includes('Torre Norte'));
});

test('sincronizarSeguro: no lanza si falla y no filtra la cadena de conexión', async () => {
  const original = console.warn;
  const avisos: string[] = [];
  console.warn = (...a: unknown[]) => { avisos.push(a.join(' ')); };
  try {
    const fuente: Fuente = { leer: async () => ({ proyectos: [], hitos: [] }) };
    const rota = { query: async () => { throw new Error('fallo en postgres://u:secreto@host/db'); } };
    assert.equal(await sincronizarSeguro(fuente, rota, hoy), false);
    assert.equal(avisos.length, 1);
    assert.ok(!avisos[0].includes('secreto'));
  } finally {
    console.warn = original;
  }
  assert.ok(!mensajeSeguro(new Error('postgresql://a:b@c/d')).includes('b@c'));
});

test('crearPlanificador: agrupa ráfagas en una sola ejecución', async () => {
  let ejecuciones = 0;
  const { programar } = crearPlanificador(async () => { ejecuciones++; }, 20);
  programar(); programar(); programar();
  await new Promise(r => setTimeout(r, 80));
  assert.equal(ejecuciones, 1);
});

test('crearPlanificador: si llega un cambio durante una ejecución, repite una vez al terminar', async () => {
  let ejecuciones = 0;
  const planificador = crearPlanificador(async () => {
    ejecuciones++;
    if (ejecuciones === 1) { planificador.programar(); await new Promise(r => setTimeout(r, 40)); }
  }, 10);
  planificador.programar();
  await new Promise(r => setTimeout(r, 200));
  assert.equal(ejecuciones, 2);
});

test('middleware: sin CENTRAL_DATABASE_URL no hace nada y siempre llama a next', () => {
  delete process.env.CENTRAL_DATABASE_URL;
  let finish: (() => void) | undefined;
  let siguiente = false;
  const res = { statusCode: 200, on: (_: 'finish', cb: () => void) => { finish = cb; } };
  vistaCentralMiddleware({ method: 'POST', path: '/projects' }, res, () => { siguiente = true; });
  assert.ok(siguiente);
  assert.doesNotThrow(() => finish?.());
});
