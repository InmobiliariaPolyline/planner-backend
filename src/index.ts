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

// Ruta para obtener los proyectos con todas sus relaciones validadas por el esquema
app.get('/projects', async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
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
      }
    });
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los proyectos' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});