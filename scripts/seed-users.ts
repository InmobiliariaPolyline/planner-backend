// Crea las cuentas de acceso al sistema (Administrador y Arquitecto) si todavía
// no existen. Genera una contraseña aleatoria y segura para cada una y las
// muestra UNA sola vez en la consola: no se guardan en ningún archivo ni se
// suben al repositorio.
//
// Uso (con la DATABASE_URL de destino en el entorno o en .env):
//   npx tsx scripts/seed-users.ts
//
// Para elegir los nombres de usuario:
//   ADMIN_USERNAME=admin ARCHITECT_USERNAME=arquitecto npx tsx scripts/seed-users.ts

import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { hashPassword } from '../src/lib/auth';
import { pool, prisma } from '../src/lib/prisma';

type Role = 'admin' | 'architect';
type Seed = { username: string; name: string; role: Role };

const ROLE_LABEL: Record<Role, string> = { admin: 'Administrador', architect: 'Arquitecto' };

const USERS: Seed[] = [
  { username: process.env.ADMIN_USERNAME?.trim().toLowerCase() || 'admin', name: 'Administrador', role: 'admin' },
  {
    username: process.env.ARCHITECT_USERNAME?.trim().toLowerCase() || 'arquitecto',
    name: process.env.ARCHITECT_NAME?.trim() || 'Arquitecto',
    role: 'architect',
  },
];

/** Contraseña legible y robusta: mayúsculas, minúsculas, dígitos y símbolos. */
function generatePassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%*';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[randomInt(chars.length)];
  return out;
}

async function main() {
  const created: { username: string; role: Role; password: string }[] = [];

  for (const seed of USERS) {
    const existing = await prisma.user.findUnique({ where: { username: seed.username } });
    if (existing) {
      console.log(`- "${seed.username}" ya existe: no se toca.`);
      continue;
    }
    const password = generatePassword();
    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: { username: seed.username, passwordHash, name: seed.name, role: seed.role },
    });
    created.push({ username: seed.username, role: seed.role, password });
  }

  if (created.length) {
    console.log('\n== Credenciales nuevas — apúntalas ahora, no se vuelven a mostrar ==\n');
    for (const u of created) {
      console.log(`  Rol: ${ROLE_LABEL[u.role]}`);
      console.log(`  Usuario:    ${u.username}`);
      console.log(`  Contraseña: ${u.password}\n`);
    }
  } else {
    console.log('\nNo se creó ningún usuario nuevo (ya existían).');
  }
}

main()
  .catch((error) => {
    console.error('No se pudo completar la siembra de usuarios:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
