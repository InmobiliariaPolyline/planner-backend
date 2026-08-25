import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma, projectInclude } from './lib/prisma';
import { cleanText, requiredDate, requiredNumber } from './lib/validation';

const app = express();

app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000,https://plannerbackend.vercel.app').split(',').map((origin) => origin.trim());
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error('Origen no autorizado'));
} }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(express.json({ limit: '10kb' }));

// Ruta de prueba inicial
app.get('/', (req: Request, res: Response) => {
  res.json({
    mensaje: "¡El servidor de Project Planner está funcionando!",
    estado: "Activo"
  });
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

app.post('/projects', async (req: Request, res: Response) => {
  try {
    const { name, startDate, endDate, budget, durationMonths, ownerName } = req.body;
    const project = await prisma.project.create({
      data: {
        name: cleanText(name, 'name')!,
        startDate: requiredDate(startDate, 'startDate'),
        endDate: requiredDate(endDate, 'endDate'),
        budget: requiredNumber(budget, 'budget'),
        durationMonths: requiredNumber(durationMonths ?? 0, 'durationMonths'),
        progress: 0,
        dependency: '',
        isPhase: false,
        ownerName: cleanText(ownerName, 'ownerName')!
      },
      include: projectInclude
    });
    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error al crear el proyecto' });
  }
});

app.patch('/projects/:id', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.id);
    const { name, startDate, endDate, budget, durationMonths, progress, dependency, isPhase, ownerName } = req.body;
    const project = await prisma.project.update({ where: { id: projectId }, data: {
      ...(name !== undefined && { name: cleanText(name, 'name') }),
      ...(startDate !== undefined && { startDate: requiredDate(startDate, 'startDate') }),
      ...(endDate !== undefined && { endDate: requiredDate(endDate, 'endDate') }),
      ...(budget !== undefined && { budget: requiredNumber(budget, 'budget') }),
      ...(durationMonths !== undefined && { durationMonths: requiredNumber(durationMonths, 'durationMonths') }),
      ...(progress !== undefined && { progress: requiredNumber(progress, 'progress', 0, 100) }),
      ...(dependency !== undefined && { dependency: cleanText(dependency, 'dependency', false) }),
      ...(isPhase !== undefined && { isPhase: Boolean(isPhase) }),
      ...(ownerName !== undefined && { ownerName: cleanText(ownerName, 'ownerName') })
    }, include: projectInclude });
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error al actualizar el proyecto' });
  }
});

app.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    await prisma.project.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: 'Proyecto no encontrado' });
  }
});

app.get('/technical-areas', async (_req, res) => res.json(await prisma.technicalArea.findMany({ orderBy: { name: 'asc' } })));
app.post('/technical-areas', async (req, res) => {
  try { res.status(201).json(await prisma.technicalArea.create({ data: { name: cleanText(req.body.name, 'name')! } })); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al crear el área técnica' }); }
});
app.get('/team-statuses', async (_req, res) => res.json(await prisma.teamStatus.findMany({ orderBy: { type: 'asc' } })));
app.post('/team-statuses', async (req, res) => {
  try { res.status(201).json(await prisma.teamStatus.create({ data: { type: cleanText(req.body.type, 'type')! } })); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al crear el estado' }); }
});

app.post('/projects/:projectId/tasks', async (req, res) => {
  try {
    const { name, startDate, endDate, technicalAreaId, progress, dependency, isPhase, ownerName } = req.body;
    const task = await prisma.task.create({ data: {
      name: cleanText(name, 'name')!, projectId: String(req.params.projectId),
      startDate: requiredDate(startDate, 'startDate'), endDate: requiredDate(endDate, 'endDate'),
      technicalAreaId: cleanText(technicalAreaId, 'technicalAreaId')!, progress: requiredNumber(progress ?? 0, 'progress'),
      dependency: cleanText(dependency ?? '', 'dependency', false) ?? '', isPhase: Boolean(isPhase), ownerName: cleanText(ownerName, 'ownerName')!,
    }, include: { technicalArea: true, performanceMetrics: true, driveLinks: true } });
    res.status(201).json(task);
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al crear la tarea' }); }
});

app.delete('/tasks/:id', async (req, res) => {
  try { await prisma.task.delete({ where: { id: String(req.params.id) } }); res.status(204).send(); }
  catch (_error) { res.status(404).json({ error: 'Tarea no encontrada' }); }
});

app.post('/projects/:projectId/team-members', async (req, res) => {
  try { res.status(201).json(await prisma.teamMember.create({ data: { name: cleanText(req.body.name, 'name')!, projectId: String(req.params.projectId), teamStatusId: cleanText(req.body.teamStatusId, 'teamStatusId')! }, include: { teamStatus: true } })); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al añadir participante' }); }
});
app.delete('/team-members/:id', async (req, res) => {
  try { await prisma.teamMember.delete({ where: { id: String(req.params.id) } }); res.status(204).send(); }
  catch (_error) { res.status(404).json({ error: 'Participante no encontrado' }); }
});

app.post('/projects/:projectId/milestones', async (req: Request, res: Response) => {
  try {
    const { description, date } = req.body;
    const projectId = String(req.params.projectId);
    const milestone = await prisma.milestone.create({
      data: { description: cleanText(description, 'description')!, date: requiredDate(date, 'date'), projectId }
    });
    res.status(201).json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el hito' });
  }
});

app.patch('/milestones/:id', async (req, res) => {
  try {
    const milestone = await prisma.milestone.update({ where: { id: String(req.params.id) }, data: {
      ...(req.body.description !== undefined && { description: cleanText(req.body.description, 'description') }),
      ...(req.body.date !== undefined && { date: requiredDate(req.body.date, 'date') })
    } });
    res.json(milestone);
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al actualizar el hito' }); }
});

app.delete('/milestones/:id', async (req, res) => {
  try { await prisma.milestone.delete({ where: { id: String(req.params.id) } }); res.status(204).send(); }
  catch (_error) { res.status(404).json({ error: 'Hito no encontrado' }); }
});

app.patch('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { name, startDate, endDate, progress, dependency, ownerName, isPhase, technicalAreaId } = req.body;
    const taskId = String(req.params.id);
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(name !== undefined && { name }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(progress !== undefined && { progress: requiredNumber(progress, 'progress', 0, 100) }),
        ...(dependency !== undefined && { dependency: cleanText(dependency, 'dependency', false) }),
        ...(ownerName !== undefined && { ownerName: cleanText(ownerName, 'ownerName') }),
        ...(isPhase !== undefined && { isPhase: Boolean(isPhase) }),
        ...(technicalAreaId !== undefined && { technicalAreaId })
      },
      include: { technicalArea: true, performanceMetrics: true, driveLinks: true }
    });
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la tarea' });
  }
});

app.post('/tasks/:taskId/performance-metrics', async (req, res) => {
  try {
    const { unit, ratePerDay, divisor } = req.body;
    res.status(201).json(await prisma.performanceMetric.create({ data: {
      unit: cleanText(unit, 'unit')!, ratePerDay: requiredNumber(ratePerDay, 'ratePerDay'), divisor: requiredNumber(divisor, 'divisor', 1), taskId: String(req.params.taskId)
    } }));
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al crear la métrica' }); }
});

app.delete('/performance-metrics/:id', async (req, res) => {
  try { await prisma.performanceMetric.delete({ where: { id: String(req.params.id) } }); res.status(204).send(); }
  catch (_error) { res.status(404).json({ error: 'Métrica no encontrada' }); }
});

app.post('/tasks/:taskId/drive-links', async (req, res) => {
  try {
    const url = cleanText(req.body.url, 'url')!;
    if (!/^https?:\/\//.test(url)) throw new Error('url debe ser una dirección HTTP válida');
    res.status(201).json(await prisma.driveLink.create({ data: { url, taskId: String(req.params.taskId) } }));
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Error al crear el enlace' }); }
});

app.delete('/drive-links/:id', async (req, res) => {
  try { await prisma.driveLink.delete({ where: { id: String(req.params.id) } }); res.status(204).send(); }
  catch (_error) { res.status(404).json({ error: 'Enlace no encontrado' }); }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});