import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma';

dotenv.config();

// Inicialización segura del pool de PostgreSQL para Neon con el adaptador
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Instancia de Prisma con tipado correcto del cliente generado
const prisma = new PrismaClient({ adapter });
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Ruta de prueba inicial
app.get('/', (req: Request, res: Response) => {
  res.json({
    mensaje: "¡El servidor de Project Planner está funcionando!",
    estado: "Activo"
  });
});

const projectInclude = {
  tasks: {
    include: {
      technicalArea: true,
      performanceMetrics: true,
      driveLinks: true
    }
  },
  milestones: true,
  teamMembers: {
    include: {
      teamStatus: true
    }
  }
};

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
    if (!name || !startDate || !endDate || budget === undefined || !ownerName) {
      res.status(400).json({ error: 'name, startDate, endDate, budget y ownerName son obligatorios' });
      return;
    }
    const project = await prisma.project.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        budget: Number(budget),
        durationMonths: Number(durationMonths ?? 0),
        progress: 0,
        dependency: '',
        isPhase: false,
        ownerName
      },
      include: projectInclude
    });
    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el proyecto' });
  }
});

app.post('/projects/:projectId/milestones', async (req: Request, res: Response) => {
  try {
    const { description, date } = req.body;
    const projectId = String(req.params.projectId);
    const milestone = await prisma.milestone.create({
      data: { description, date: new Date(date), projectId }
    });
    res.status(201).json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el hito' });
  }
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
        ...(progress !== undefined && { progress: Number(progress) }),
        ...(dependency !== undefined && { dependency }),
        ...(ownerName !== undefined && { ownerName }),
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});