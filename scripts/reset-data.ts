// Borra todos los datos registrados (expedientes y todo lo que cuelga de ellos:
// tareas, hitos, equipo, historial, enlaces públicos, materiales y enlaces de
// Drive de cada tarea) y todos los usuarios excepto la cuenta "admin".
// Conserva los catálogos: materiales, áreas técnicas y estados de equipo.
//
// IRREVERSIBLE. Sin --yes solo muestra qué se borraría (simulacro).
//
// Uso (con la DATABASE_URL de destino en el entorno o en .env):
//   npx tsx scripts/reset-data.ts          # simulacro
//   npx tsx scripts/reset-data.ts --yes    # borra de verdad

import 'dotenv/config';
import { pool, prisma } from '../src/lib/prisma';

const KEEP_USERNAME = 'admin';

async function main() {
  const confirm = process.argv.includes('--yes');
  const keep = await prisma.user.findUnique({ where: { username: KEEP_USERNAME } });
  if (!keep) throw new Error(`No existe el usuario "${KEEP_USERNAME}": ejecuta antes npm run seed:users.`);

  const counts = {
    expedientes: await prisma.project.count(),
    tareas: await prisma.task.count(),
    historial: await prisma.activityEvent.count(),
    enlacesPublicos: await prisma.shareLink.count(),
    usuariosABorrar: await prisma.user.count({ where: { NOT: { id: keep.id } } }),
  };
  console.log('Se borrarían:', counts, `(se conserva "${KEEP_USERNAME}")`);
  if (!confirm) {
    console.log('Simulacro: no se borró nada. Repite con --yes para borrar.');
    return;
  }

  await prisma.$transaction([
    prisma.project.deleteMany(), // el resto cuelga de aquí con onDelete: Cascade
    prisma.twoFactorCode.deleteMany({ where: { NOT: { userId: keep.id } } }),
    prisma.user.deleteMany({ where: { NOT: { id: keep.id } } }),
  ]);
  console.log('Listo. Quedan:', {
    expedientes: await prisma.project.count(),
    usuarios: await prisma.user.count(),
  });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
