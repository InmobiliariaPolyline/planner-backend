import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Medidas de seguridad y límites
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});