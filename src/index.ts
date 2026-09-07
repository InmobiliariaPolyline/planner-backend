import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma, pool, projectInclude } from './lib/prisma';
import { cleanText, requiredDate, requiredNumber } from './lib/validation';
import { newShareToken, parseRole, requireEditorLink, resolveShareLink, ShareAccessError } from './lib/share';
import { assertDateOrder, monthsBetween, recomputeProjectProgress } from './lib/projectMath';
import { ACTOR_ADMIN, ACTOR_LINK, diffFields, logEvent, money, percent } from './lib/activity';

const taskInclude = { technicalArea: true, performanceMetrics: true, driveLinks: true } as const;

const dateOnly = (value: unknown): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value ? String(value) : '—';

const app = express();

// Render (y cualquier PaaS) sirve la app detrás de un proxy inverso. Sin esto,
// express-rate-limit toma la IP del proxy para todos y el cupo se comparte entre
// todos los usuarios.
app.set('trust proxy', 1);

app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000,https://plannerbackend.vercel.app').split(',').map((origin) => origin.trim());
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  // Sin excepción: el navegador bloquea la respuesta por falta de cabeceras CORS
  // y la API no devuelve un 500 con stack.
  callback(null, false);
} }));
// Cupos de peticiones separados: la administración y los enlaces públicos no
// comparten bucket, para que el tráfico de uno no bloquee al otro.
app.use('/shared', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/shared'),
}));
app.use(express.json({ limit: '10kb' }));

// Ruta de prueba inicial
app.get('/', (req: Request, res: Response) => {
  res.json({
    mensaje: "¡El servidor de Project Planner está funcionando!",
    estado: "Activo"
  });
});

// Health check ligero para Render / monitoreo
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/projects', async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({ include: projectInclude, orderBy: { createdAt: 'desc' } });
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los proyectos' });
  }
});

app.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.id);
    const project = await prisma.project.findUnique({ where: { id: projectId }, include: projectInclude });
    if (!project) {
      res.status(404).json({ error: 'Proyecto no encontrado' });
      return;
    }
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el proyecto' });
  }
});

// Historial de sucesos del expediente (más reciente primero).
app.get('/projects/:projectId/activity', async (req: Request, res: Response) => {
  try {
    const events = await prisma.activityEvent.findMany({
      where: { projectId: String(req.params.projectId) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
});

app.post('/projects', async (req: Request, res: Response) => {
  try {
    const { name, startDate, endDate, budget, ownerName } = req.body;
    const start = requiredDate(startDate, 'startDate');
    const end = requiredDate(endDate, 'endDate');
    assertDateOrder(start, end);
    const project = await prisma.project.create({
      data: {
        name: cleanText(name, 'name')!,
        startDate: start,
        endDate: end,
        budget: requiredNumber(budget, 'budget'),
        durationMonths: monthsBetween(start, end),
        progress: 0,
        ownerName: cleanText(ownerName, 'ownerName')!
      },
      include: projectInclude
    });
    await logEvent(project.id, {
      action: 'project.create',
      entity: 'expediente',
      target: project.name,
      summary: `Creó el expediente «${project.name}»`,
      tone: 'positive',
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error al crear el proyecto' });
  }
});

/** Actualiza los datos del expediente, valida fechas y registra los cambios. */
async function updateProjectFields(projectId: string, body: Record<string, unknown>, actor: string) {
  const { name, startDate, endDate, budget, ownerName } = body;
  const before = await prisma.project.findUnique({ where: { id: projectId } });
  if (!before) throw new Error('Proyecto no encontrado');
  const patch = await buildProjectDatePatch(projectId, startDate, endDate);
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(name !== undefined && { name: cleanText(name, 'name') }),
      ...(budget !== undefined && { budget: requiredNumber(budget, 'budget') }),
      ...(ownerName !== undefined && { ownerName: cleanText(ownerName, 'ownerName') }),
      ...patch,
    },
    include: projectInclude,
  });
  const changes = diffFields(before, project, [
    { key: 'name', label: 'Nombre' },
    { key: 'budget', label: 'Presupuesto', format: money },
    { key: 'ownerName', label: 'Responsable' },
    { key: 'startDate', label: 'Fecha de inicio', format: dateOnly },
    { key: 'endDate', label: 'Fecha de término', format: dateOnly },
  ]);
  if (changes.length) {
    await logEvent(projectId, {
      actor,
      action: 'project.update',
      entity: 'expediente',
      target: project.name,
      summary: `Editó el expediente «${project.name}»`,
      tone: changes.some((change) => change.field === 'budget') ? 'warning' : 'neutral',
      changes,
    });
  }
  return project;
}

app.patch('/projects/:id', async (req: Request, res: Response) => {
  try {
    const project = await updateProjectFields(String(req.params.id), req.body, ACTOR_ADMIN);
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error al actualizar el proyecto' });
  }
});

/** Resuelve el nuevo rango de fechas del proyecto, lo valida y recalcula la duración. */
async function buildProjectDatePatch(projectId: string, startDate: unknown, endDate: unknown) {
  if (startDate === undefined && endDate === undefined) return {};
  const current = await prisma.project.findUnique({ where: { id: projectId }, select: { startDate: true, endDate: true } });
  if (!current) throw new Error('Proyecto no encontrado');
  const start = startDate !== undefined ? requiredDate(startDate, 'startDate') : current.startDate;
  const end = endDate !== undefined ? requiredDate(endDate, 'endDate') : current.endDate;
  assertDateOrder(start, end);
  return { startDate: start, endDate: end, durationMonths: monthsBetween(start, end) };
}

app.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    await prisma.project.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: 'Proyecto no encontrado' });
  }
});

app.get('/technical-areas', async (_req, res) => {
  try { res.json(await prisma.technicalArea.findMany({ orderBy: { name: 'asc' } })); }
  catch { res.status(500).json({ error: 'Error al obtener las áreas técnicas' }); }
});
app.post('/technical-areas', async (req, res) => {
  try { res.status(201).json(await prisma.technicalArea.create({ data: { name: cleanText(req.body.name, 'name')! } })); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al crear el área técnica' }); }
});
app.delete('/technical-areas/:id', async (req, res) => {
  try {
    const inUse = await prisma.task.count({ where: { technicalAreaId: String(req.params.id) } });
    if (inUse > 0) { res.status(409).json({ error: `No se puede eliminar: hay ${inUse} tarea(s) usando esta área.` }); return; }
    await prisma.technicalArea.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch { res.status(404).json({ error: 'Área técnica no encontrada' }); }
});
app.get('/team-statuses', async (_req, res) => {
  try { res.json(await prisma.teamStatus.findMany({ orderBy: { type: 'asc' } })); }
  catch { res.status(500).json({ error: 'Error al obtener los estados de equipo' }); }
});
app.post('/team-statuses', async (req, res) => {
  try { res.status(201).json(await prisma.teamStatus.create({ data: { type: cleanText(req.body.type, 'type')! } })); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al crear el estado' }); }
});
app.delete('/team-statuses/:id', async (req, res) => {
  try {
    const inUse = await prisma.teamMember.count({ where: { teamStatusId: String(req.params.id) } });
    if (inUse > 0) { res.status(409).json({ error: `No se puede eliminar: hay ${inUse} participante(s) con este estado.` }); return; }
    await prisma.teamStatus.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch { res.status(404).json({ error: 'Estado de equipo no encontrado' }); }
});

async function createTaskForProject(projectId: string, body: Record<string, unknown>, actor: string = ACTOR_ADMIN) {
  const start = requiredDate(body.startDate, 'startDate');
  const end = requiredDate(body.endDate, 'endDate');
  assertDateOrder(start, end);
  const task = await prisma.task.create({ data: {
    name: cleanText(body.name, 'name')!, projectId,
    startDate: start, endDate: end,
    technicalAreaId: cleanText(body.technicalAreaId, 'technicalAreaId')!,
    progress: requiredNumber(body.progress ?? 0, 'progress', 0, 100),
    dependency: cleanText(body.dependency ?? '', 'dependency', false) ?? '',
    isPhase: Boolean(body.isPhase), ownerName: cleanText(body.ownerName, 'ownerName')!,
  }, include: taskInclude });
  await recomputeProjectProgress(projectId);
  await logEvent(projectId, {
    actor,
    action: 'task.create',
    entity: 'tarea',
    target: task.name,
    summary: `Añadió la tarea «${task.name}» al cronograma`,
    tone: 'positive',
  });
  return task;
}

async function patchTask(taskId: string, body: Record<string, unknown>, actor: string = ACTOR_ADMIN) {
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) throw new Error('Tarea no encontrada');
  const start = body.startDate !== undefined ? requiredDate(body.startDate, 'startDate') : existing.startDate;
  const end = body.endDate !== undefined ? requiredDate(body.endDate, 'endDate') : existing.endDate;
  if (body.startDate !== undefined || body.endDate !== undefined) assertDateOrder(start, end);
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(body.name !== undefined && { name: cleanText(body.name, 'name') }),
      ...(body.startDate !== undefined && { startDate: start }),
      ...(body.endDate !== undefined && { endDate: end }),
      ...(body.progress !== undefined && { progress: requiredNumber(body.progress, 'progress', 0, 100) }),
      ...(body.dependency !== undefined && { dependency: cleanText(body.dependency, 'dependency', false) ?? '' }),
      ...(body.ownerName !== undefined && { ownerName: cleanText(body.ownerName, 'ownerName') }),
      ...(body.isPhase !== undefined && { isPhase: Boolean(body.isPhase) }),
      ...(body.technicalAreaId !== undefined && { technicalAreaId: cleanText(body.technicalAreaId, 'technicalAreaId') }),
    },
    include: taskInclude,
  });
  await recomputeProjectProgress(existing.projectId);
  const changes = diffFields(existing, task, [
    { key: 'name', label: 'Nombre' },
    { key: 'ownerName', label: 'Responsable' },
    { key: 'progress', label: 'Avance', format: percent },
    { key: 'startDate', label: 'Fecha de inicio', format: dateOnly },
    { key: 'endDate', label: 'Fecha de término', format: dateOnly },
    { key: 'isPhase', label: 'Es una fase' },
    { key: 'dependency', label: 'Depende de' },
  ]);
  if (changes.length) {
    await logEvent(existing.projectId, {
      actor,
      action: 'task.update',
      entity: 'tarea',
      target: task.name,
      summary: `Editó la tarea «${task.name}»`,
      tone: 'neutral',
      changes,
    });
  }
  return task;
}

app.post('/projects/:projectId/tasks', async (req, res) => {
  try {
    res.status(201).json(await createTaskForProject(String(req.params.projectId), req.body));
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al crear la tarea' }); }
});

app.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: String(req.params.id) }, select: { projectId: true, name: true } });
    if (!task) { res.status(404).json({ error: 'Tarea no encontrada' }); return; }
    await prisma.task.delete({ where: { id: String(req.params.id) } });
    await recomputeProjectProgress(task.projectId);
    await logEvent(task.projectId, {
      action: 'task.delete',
      entity: 'tarea',
      target: task.name,
      summary: `Eliminó la tarea «${task.name}» del cronograma`,
      tone: 'negative',
    });
    res.status(204).send();
  } catch (_error) { res.status(404).json({ error: 'Tarea no encontrada' }); }
});

app.post('/projects/:projectId/team-members', async (req, res) => {
  try {
    const projectId = String(req.params.projectId);
    const member = await prisma.teamMember.create({ data: { name: cleanText(req.body.name, 'name')!, projectId, teamStatusId: cleanText(req.body.teamStatusId, 'teamStatusId')! }, include: { teamStatus: true } });
    await logEvent(projectId, {
      action: 'member.add',
      entity: 'participante',
      target: member.name,
      summary: `Añadió a «${member.name}» al equipo (${member.teamStatus.type})`,
      tone: 'positive',
    });
    res.status(201).json(member);
  }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al añadir participante' }); }
});
app.delete('/team-members/:id', async (req, res) => {
  try {
    const member = await prisma.teamMember.findUnique({ where: { id: String(req.params.id) }, select: { projectId: true, name: true } });
    if (!member) { res.status(404).json({ error: 'Participante no encontrado' }); return; }
    await prisma.teamMember.delete({ where: { id: String(req.params.id) } });
    await logEvent(member.projectId, {
      action: 'member.remove',
      entity: 'participante',
      target: member.name,
      summary: `Quitó a «${member.name}» del equipo`,
      tone: 'negative',
    });
    res.status(204).send();
  }
  catch (_error) { res.status(404).json({ error: 'Participante no encontrado' }); }
});

app.post('/projects/:projectId/milestones', async (req: Request, res: Response) => {
  try {
    const { description, date } = req.body;
    const projectId = String(req.params.projectId);
    const milestone = await prisma.milestone.create({
      data: { description: cleanText(description, 'description')!, date: requiredDate(date, 'date'), projectId }
    });
    await logEvent(projectId, {
      action: 'milestone.add',
      entity: 'hito',
      target: milestone.description,
      summary: `Añadió el hito «${milestone.description}» (${dateOnly(milestone.date)})`,
      tone: 'positive',
    });
    res.status(201).json(milestone);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error al crear el hito' });
  }
});

app.patch('/milestones/:id', async (req, res) => {
  try {
    const before = await prisma.milestone.findUnique({ where: { id: String(req.params.id) } });
    if (!before) { res.status(404).json({ error: 'Hito no encontrado' }); return; }
    const milestone = await prisma.milestone.update({ where: { id: String(req.params.id) }, data: {
      ...(req.body.description !== undefined && { description: cleanText(req.body.description, 'description') }),
      ...(req.body.date !== undefined && { date: requiredDate(req.body.date, 'date') })
    } });
    const changes = diffFields(before, milestone, [
      { key: 'description', label: 'Descripción' },
      { key: 'date', label: 'Fecha', format: dateOnly },
    ]);
    if (changes.length) {
      await logEvent(milestone.projectId, {
        action: 'milestone.update',
        entity: 'hito',
        target: milestone.description,
        summary: `Editó el hito «${milestone.description}»`,
        tone: 'neutral',
        changes,
      });
    }
    res.json(milestone);
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al actualizar el hito' }); }
});

app.delete('/milestones/:id', async (req, res) => {
  try {
    const milestone = await prisma.milestone.findUnique({ where: { id: String(req.params.id) }, select: { projectId: true, description: true } });
    if (!milestone) { res.status(404).json({ error: 'Hito no encontrado' }); return; }
    await prisma.milestone.delete({ where: { id: String(req.params.id) } });
    await logEvent(milestone.projectId, {
      action: 'milestone.remove',
      entity: 'hito',
      target: milestone.description,
      summary: `Eliminó el hito «${milestone.description}»`,
      tone: 'negative',
    });
    res.status(204).send();
  }
  catch (_error) { res.status(404).json({ error: 'Hito no encontrado' }); }
});

app.patch('/tasks/:id', async (req: Request, res: Response) => {
  try {
    res.json(await patchTask(String(req.params.id), req.body));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error al actualizar la tarea' });
  }
});

app.post('/tasks/:taskId/performance-metrics', async (req, res) => {
  try {
    const { unit, ratePerDay, divisor } = req.body;
    const taskId = String(req.params.taskId);
    const metric = await prisma.performanceMetric.create({ data: {
      unit: cleanText(unit, 'unit')!, ratePerDay: requiredNumber(ratePerDay, 'ratePerDay'), divisor: requiredNumber(divisor, 'divisor', 1), taskId
    } });
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true, name: true } });
    if (task) {
      await logEvent(task.projectId, {
        action: 'metric.add',
        entity: 'métrica',
        target: task.name,
        summary: `Añadió una métrica de rendimiento a «${task.name}» (${metric.unit}, ${metric.ratePerDay}/día)`,
        tone: 'neutral',
      });
    }
    res.status(201).json(metric);
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al crear la métrica' }); }
});

app.delete('/performance-metrics/:id', async (req, res) => {
  try {
    const metric = await prisma.performanceMetric.findUnique({ where: { id: String(req.params.id) }, include: { task: { select: { projectId: true, name: true } } } });
    if (!metric) { res.status(404).json({ error: 'Métrica no encontrada' }); return; }
    await prisma.performanceMetric.delete({ where: { id: String(req.params.id) } });
    await logEvent(metric.task.projectId, {
      action: 'metric.remove',
      entity: 'métrica',
      target: metric.task.name,
      summary: `Eliminó una métrica de rendimiento de «${metric.task.name}»`,
      tone: 'negative',
    });
    res.status(204).send();
  }
  catch (_error) { res.status(404).json({ error: 'Métrica no encontrada' }); }
});

app.post('/tasks/:taskId/drive-links', async (req, res) => {
  try {
    const url = cleanText(req.body.url, 'url')!;
    if (!/^https?:\/\//.test(url)) throw new Error('url debe ser una dirección HTTP válida');
    const taskId = String(req.params.taskId);
    const link = await prisma.driveLink.create({ data: { url, taskId } });
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true, name: true } });
    if (task) {
      await logEvent(task.projectId, {
        action: 'link.add',
        entity: 'enlace',
        target: task.name,
        summary: `Adjuntó un enlace de Drive a «${task.name}»`,
        tone: 'neutral',
      });
    }
    res.status(201).json(link);
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al crear el enlace' }); }
});

app.delete('/drive-links/:id', async (req, res) => {
  try {
    const link = await prisma.driveLink.findUnique({ where: { id: String(req.params.id) }, include: { task: { select: { projectId: true, name: true } } } });
    if (!link) { res.status(404).json({ error: 'Enlace no encontrado' }); return; }
    await prisma.driveLink.delete({ where: { id: String(req.params.id) } });
    await logEvent(link.task.projectId, {
      action: 'link.remove',
      entity: 'enlace',
      target: link.task.name,
      summary: `Quitó un enlace de Drive de «${link.task.name}»`,
      tone: 'negative',
    });
    res.status(204).send();
  }
  catch (_error) { res.status(404).json({ error: 'Enlace no encontrado' }); }
});

// ── Enlaces públicos de expedientes ────────────────────────────────────────
// El token no caduca; se rota (regenera) cuantas veces se quiera. Al borrar el
// expediente se borran sus enlaces por cascada.

function handleShareError(error: unknown, res: Response) {
  if (error instanceof ShareAccessError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  // Errores de validación (mensajes cortos de una línea) sí se muestran; los
  // errores internos (p. ej. de Prisma) no se filtran al cliente.
  const message = error instanceof Error ? error.message : '';
  const safe = message && message.length < 160 && !message.includes('\n');
  res.status(safe ? 400 : 500).json({ error: safe ? message : 'No fue posible procesar el enlace' });
}

app.get('/projects/:projectId/share-links', async (req, res) => {
  try {
    const links = await prisma.shareLink.findMany({
      where: { projectId: String(req.params.projectId) },
      orderBy: { createdAt: 'asc' },
    });
    res.json(links);
  } catch (error) {
    handleShareError(error, res);
  }
});

const roleText = (role: string) => (role === 'editor' ? 'edición' : 'solo lectura');

app.post('/projects/:projectId/share-links', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) {
      res.status(404).json({ error: 'Proyecto no encontrado' });
      return;
    }
    const link = await prisma.shareLink.create({
      data: {
        projectId,
        token: newShareToken(),
        role: parseRole(req.body.role),
        label: cleanText(req.body.label, 'label', false) ?? null,
      },
    });
    await logEvent(projectId, {
      action: 'share.create',
      entity: 'enlace público',
      summary: `Generó un enlace público de ${roleText(link.role)}`,
      tone: 'warning',
    });
    res.status(201).json(link);
  } catch (error) {
    handleShareError(error, res);
  }
});

// Regenerar el token (rotate: true) y/o cambiar rol / etiqueta.
app.patch('/share-links/:id', async (req: Request, res: Response) => {
  try {
    const before = await prisma.shareLink.findUnique({ where: { id: String(req.params.id) } });
    if (!before) { res.status(404).json({ error: 'Enlace no encontrado' }); return; }
    const data: Record<string, unknown> = {};
    if (req.body.rotate) data.token = newShareToken();
    if (req.body.role !== undefined) data.role = parseRole(req.body.role);
    if (req.body.label !== undefined) data.label = cleanText(req.body.label, 'label', false) ?? null;
    const link = await prisma.shareLink.update({ where: { id: String(req.params.id) }, data });
    if (req.body.rotate) {
      await logEvent(link.projectId, {
        action: 'share.rotate',
        entity: 'enlace público',
        summary: 'Regeneró un enlace público (el anterior dejó de funcionar)',
        tone: 'warning',
      });
    } else if (before.role !== link.role) {
      await logEvent(link.projectId, {
        action: 'share.update',
        entity: 'enlace público',
        summary: `Cambió el permiso de un enlace público a ${roleText(link.role)}`,
        tone: 'warning',
        changes: [{ field: 'role', label: 'Permiso', from: roleText(before.role), to: roleText(link.role) }],
      });
    }
    res.json(link);
  } catch (error) {
    handleShareError(error, res);
  }
});

app.delete('/share-links/:id', async (req: Request, res: Response) => {
  try {
    const link = await prisma.shareLink.findUnique({ where: { id: String(req.params.id) }, select: { projectId: true, role: true } });
    await prisma.shareLink.delete({ where: { id: String(req.params.id) } });
    if (link) {
      await logEvent(link.projectId, {
        action: 'share.revoke',
        entity: 'enlace público',
        summary: `Eliminó un enlace público de ${roleText(link.role)}`,
        tone: 'negative',
      });
    }
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Enlace no encontrado' });
  }
});

// Acceso público. 410 = el enlace se rotó o el expediente fue eliminado.
app.get('/shared/:token', async (req: Request, res: Response) => {
  try {
    const link = await resolveShareLink(String(req.params.token));
    const project = await prisma.project.findUnique({ where: { id: link.projectId }, include: projectInclude });
    if (!project) {
      throw new ShareAccessError(410, 'El expediente fue eliminado del sistema.');
    }
    res.json({ role: link.role, project });
  } catch (error) {
    handleShareError(error, res);
  }
});

/** "Colaborador «etiqueta»" o "Colaborador (enlace)". */
const linkActor = (link: { label: string | null }) =>
  link.label ? `Colaborador «${link.label}»` : ACTOR_LINK;

// Editar los datos del expediente mediante un enlace con rol de editor.
app.patch('/shared/:token', async (req: Request, res: Response) => {
  try {
    const link = await requireEditorLink(String(req.params.token));
    const project = await updateProjectFields(link.projectId, req.body, linkActor(link));
    res.json(project);
  } catch (error) {
    handleShareError(error, res);
  }
});

// Comprueba que la tarea pertenece al expediente del enlace (rol editor).
async function taskOfShareLink(token: string, taskId: string) {
  const link = await requireEditorLink(token);
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true, name: true } });
  if (!task || task.projectId !== link.projectId) {
    throw new ShareAccessError(404, 'Tarea no encontrada en este expediente.');
  }
  return { link, task };
}

// Crear una tarea en el expediente compartido (rol editor).
app.post('/shared/:token/tasks', async (req: Request, res: Response) => {
  try {
    const link = await requireEditorLink(String(req.params.token));
    res.status(201).json(await createTaskForProject(link.projectId, req.body, linkActor(link)));
  } catch (error) {
    handleShareError(error, res);
  }
});

// Editar una tarea (progreso, fechas, responsable, etc.) del expediente compartido.
app.patch('/shared/:token/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const { link } = await taskOfShareLink(String(req.params.token), String(req.params.taskId));
    res.json(await patchTask(String(req.params.taskId), req.body, linkActor(link)));
  } catch (error) {
    handleShareError(error, res);
  }
});

// Eliminar una tarea del expediente compartido (rol editor).
app.delete('/shared/:token/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const { link, task } = await taskOfShareLink(String(req.params.token), String(req.params.taskId));
    await prisma.task.delete({ where: { id: String(req.params.taskId) } });
    await recomputeProjectProgress(link.projectId);
    await logEvent(link.projectId, {
      actor: linkActor(link),
      action: 'task.delete',
      entity: 'tarea',
      target: task.name,
      summary: `Eliminó la tarea «${task.name}» del cronograma`,
      tone: 'negative',
    });
    res.status(204).send();
  } catch (error) {
    handleShareError(error, res);
  }
});

// 404 en JSON para rutas no registradas
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores final: responde JSON en vez de HTML con stack
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

// Cierre ordenado cuando Render envía SIGTERM en cada redeploy
async function shutdown() {
  server.close(async () => {
    await pool.end().catch(() => undefined);
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);