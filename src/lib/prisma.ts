import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

const connectionString = process.env.DATABASE_URL;
// max acotado: Render free tiene poca memoria y Neon limita conexiones simultáneas
export const pool = new Pool({ connectionString, max: 5 });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export const projectInclude = {
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
