import { Pool } from 'pg';

/**
 * Sincronización con la «vista central» que lee el agente de Coze (solo resúmenes).
 *
 * - OPCIONAL: sin CENTRAL_DATABASE_URL no hace nada, así que no cambia el comportamiento de la API.
 * - Nunca rompe una petición: corre en segundo plano, con límite de tiempo, y los errores solo se registran.
 * - Escribe con el rol `writer_planner`, que solo puede tocar las tablas del Planner en el esquema `central`.
 * - Cada ejecución deja la «foto» completa, así que repetirla no duplica nada.
 * - No copia presupuesto, equipo, enlaces públicos ni logotipos.
 */

export interface TareaOrigen { endDate: Date; progress: number }
export interface ProyectoOrigen {
  id: string;
  name: string;
  ownerName: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  tasks: TareaOrigen[];
}
export interface HitoOrigen { id: string; description: string; date: Date; projectId: string }
export interface Fuente { leer(): Promise<{ proyectos: ProyectoOrigen[]; hitos: HitoOrigen[] }> }
export interface Central { query(text: string, params?: unknown[]): Promise<unknown> }

export type EstadoProyecto = 'por iniciar' | 'en curso' | 'atrasado' | 'terminado';

/** Pasado el cual un hito vencido deja de mostrarse. */
export const DIAS_HITOS_PASADOS = 7;
export const MAX_HITOS = 300;
/** Espera tras el último cambio antes de sincronizar (agrupa ráfagas de ediciones). */
export const ESPERA_MS = 5_000;
export const TIEMPO_MAX_MS = 15_000;

const dia = (d: Date): string => d.toISOString().slice(0, 10);

export function estadoProyecto(p: Pick<ProyectoOrigen, 'startDate' | 'endDate' | 'progress'>, hoy: Date): EstadoProyecto {
  const h = dia(hoy);
  if (p.progress >= 100) return 'terminado';
  if (h > dia(p.endDate)) return 'atrasado';
  if (h < dia(p.startDate)) return 'por iniciar';
  return 'en curso';
}

export function construirVista(proyectos: ProyectoOrigen[], hitos: HitoOrigen[], hoy: Date) {
  const h = dia(hoy);
  const limiteInferior = dia(new Date(hoy.getTime() - DIAS_HITOS_PASADOS * 86_400_000));
  const hitosVigentes = hitos
    .filter(x => dia(x.date) >= limiteInferior)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_HITOS);

  const filasProyectos = proyectos.map(p => {
    const proximo = hitosVigentes.find(x => x.projectId === p.id && dia(x.date) >= h);
    return {
      proyecto_id: p.id,
      nombre: p.name,
      responsable: p.ownerName,
      estado: estadoProyecto(p, hoy),
      avance_pct: Math.min(100, Math.max(0, p.progress)),
      inicio: dia(p.startDate),
      fin: dia(p.endDate),
      tareas_total: p.tasks.length,
      tareas_atrasadas: p.tasks.filter(t => t.progress < 100 && dia(t.endDate) < h).length,
      proximo_hito: proximo?.description ?? null,
      proximo_hito_fecha: proximo ? dia(proximo.date) : null,
    };
  });
  const idsProyectos = new Set(proyectos.map(p => p.id));
  const filasHitos = hitosVigentes
    .filter(x => idsProyectos.has(x.projectId))
    .map(x => ({ hito_id: x.id, proyecto_id: x.projectId, descripcion: x.description, fecha: dia(x.date) }));
  return { proyectos: filasProyectos, hitos: filasHitos };
}

/** Copia la foto de la fuente hacia la base central. Lanza si algo falla. */
export async function sincronizar(fuente: Fuente, central: Central, hoy: Date = new Date()) {
  const { proyectos, hitos } = await fuente.leer();
  const vista = construirVista(proyectos, hitos, hoy);
  const jsonProyectos = JSON.stringify(vista.proyectos);
  const jsonHitos = JSON.stringify(vista.hitos);

  await central.query(
    `INSERT INTO central.planner_proyectos
       (proyecto_id, nombre, responsable, estado, avance_pct, inicio, fin, tareas_total, tareas_atrasadas,
        proximo_hito, proximo_hito_fecha, actualizado_en)
     SELECT t.proyecto_id, t.nombre, t.responsable, t.estado, t.avance_pct, t.inicio, t.fin, t.tareas_total,
            t.tareas_atrasadas, t.proximo_hito, t.proximo_hito_fecha, now()
       FROM jsonb_to_recordset($1::jsonb) AS t(
         proyecto_id text, nombre text, responsable text, estado text, avance_pct numeric, inicio date, fin date,
         tareas_total int, tareas_atrasadas int, proximo_hito text, proximo_hito_fecha date)
     ON CONFLICT (proyecto_id) DO UPDATE SET
       nombre = EXCLUDED.nombre, responsable = EXCLUDED.responsable, estado = EXCLUDED.estado,
       avance_pct = EXCLUDED.avance_pct, inicio = EXCLUDED.inicio, fin = EXCLUDED.fin,
       tareas_total = EXCLUDED.tareas_total, tareas_atrasadas = EXCLUDED.tareas_atrasadas,
       proximo_hito = EXCLUDED.proximo_hito, proximo_hito_fecha = EXCLUDED.proximo_hito_fecha,
       actualizado_en = now()`,
    [jsonProyectos],
  );
  await central.query(
    `DELETE FROM central.planner_proyectos
      WHERE proyecto_id NOT IN (SELECT t.proyecto_id FROM jsonb_to_recordset($1::jsonb) AS t(proyecto_id text))`,
    [jsonProyectos],
  );

  await central.query(
    `INSERT INTO central.planner_hitos (hito_id, proyecto_id, descripcion, fecha, actualizado_en)
     SELECT t.hito_id, t.proyecto_id, t.descripcion, t.fecha, now()
       FROM jsonb_to_recordset($1::jsonb) AS t(hito_id text, proyecto_id text, descripcion text, fecha date)
     ON CONFLICT (hito_id) DO UPDATE SET
       proyecto_id = EXCLUDED.proyecto_id, descripcion = EXCLUDED.descripcion, fecha = EXCLUDED.fecha,
       actualizado_en = now()`,
    [jsonHitos],
  );
  await central.query(
    `DELETE FROM central.planner_hitos
      WHERE hito_id NOT IN (SELECT t.hito_id FROM jsonb_to_recordset($1::jsonb) AS t(hito_id text))`,
    [jsonHitos],
  );

  await central.query(
    `INSERT INTO central.sync_estado (app, ultima_sync) VALUES ('planner', now())
     ON CONFLICT (app) DO UPDATE SET ultima_sync = now()`,
  );
  return { proyectos: vista.proyectos.length, hitos: vista.hitos.length };
}

/** Quita cadenas de conexión de un mensaje de error antes de registrarlo. */
export function mensajeSeguro(err: unknown): string {
  return err instanceof Error ? err.message.replace(/postgres(ql)?:\/\/\S+/gi, '[conexión]') : 'error';
}

/** Ejecuta una sincronización sin lanzar nunca. Devuelve true si salió bien. */
export async function sincronizarSeguro(fuente: Fuente, central: Central, hoy?: Date): Promise<boolean> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new Error('tiempo agotado')), TIEMPO_MAX_MS);
  });
  try {
    await Promise.race([sincronizar(fuente, central, hoy), limite]);
    return true;
  } catch (err) {
    console.warn('vista central: no se pudo sincronizar:', mensajeSeguro(err));
    return false;
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Agenda una sincronización con espera (debounce): varias ediciones seguidas generan una sola.
 * Si ya hay una en curso, se repite una vez más al terminar para no perder el último cambio.
 */
export function crearPlanificador(ejecutar: () => Promise<unknown>, esperaMs = ESPERA_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let enCurso = false;
  let repetir = false;

  const lanzar = async (): Promise<void> => {
    timer = undefined;
    if (enCurso) { repetir = true; return; }
    enCurso = true;
    try { await ejecutar(); } finally {
      enCurso = false;
      if (repetir) { repetir = false; programar(); }
    }
  };
  const programar = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void lanzar(); }, esperaMs);
    timer.unref?.(); // no impide que el proceso termine
  };
  return { programar };
}

// ── Conexión real (solo si CENTRAL_DATABASE_URL existe) ──────────────────────────────────────

let planificador: ReturnType<typeof crearPlanificador> | null = null;

function iniciar(): ReturnType<typeof crearPlanificador> | null {
  const url = process.env.CENTRAL_DATABASE_URL;
  if (!url) return null;
  if (planificador) return planificador;

  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 10_000 });
  // Un error de conexión inactiva no debe tumbar el servidor.
  pool.on('error', err => console.warn('vista central: conexión inactiva falló:', mensajeSeguro(err)));
  const central: Central = { query: (text, params) => pool.query(text, params as unknown[]) };

  // Se carga aquí (y no arriba) para que las pruebas del módulo no necesiten Prisma.
  const { prisma } = require('./prisma') as typeof import('./prisma');
  const fuente: Fuente = {
    async leer() {
      const desde = new Date(Date.now() - DIAS_HITOS_PASADOS * 86_400_000);
      const [proyectos, hitos] = await Promise.all([
        prisma.project.findMany({
          select: {
            id: true, name: true, ownerName: true, startDate: true, endDate: true, progress: true,
            tasks: { select: { endDate: true, progress: true } },
          },
        }),
        prisma.milestone.findMany({
          where: { date: { gte: desde } },
          select: { id: true, description: true, date: true, projectId: true },
          orderBy: { date: 'asc' },
          take: MAX_HITOS,
        }),
      ]);
      return { proyectos, hitos };
    },
  };

  planificador = crearPlanificador(() => sincronizarSeguro(fuente, central));
  return planificador;
}

/** Pide una sincronización (con espera). No hace nada si la vista central no está configurada. */
export function programarSincronizacion(): void {
  iniciar()?.programar();
}

const METODOS_ESCRITURA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Middleware de Express: tras cualquier escritura exitosa fuera de /auth, programa una sincronización. */
export function vistaCentralMiddleware(
  req: { method: string; path: string },
  res: { statusCode: number; on(evento: 'finish', cb: () => void): unknown },
  next: () => void,
): void {
  res.on('finish', () => {
    if (METODOS_ESCRITURA.has(req.method) && res.statusCode < 400 && !req.path.startsWith('/auth')) {
      programarSincronizacion();
    }
  });
  next();
}
