// Crea las cuentas de acceso al sistema (Administrador y Arquitecto) si todavía
// no existen. Si no se indica una contraseña, genera una aleatoria y segura;
// en cualquier caso se muestra UNA sola vez en la consola: no se guardan en
// ningún archivo ni se suben al repositorio.
//
// Uso (con la DATABASE_URL de destino en el entorno o en .env):
//   npx tsx scripts/seed-users.ts
//
// Para elegir tú mismo usuario y contraseña (recomendado si quieres saberla
// de antemano en vez de que sea aleatoria):
//   ADMIN_USERNAME=admin ADMIN_PASSWORD=tu-contraseña ^
//   ARCHITECT_USERNAME=arquitecto ARCHITECT_PASSWORD=otra-contraseña ^
//   npx tsx scripts/seed-users.ts
//
// Se recomiendan contraseñas de al menos 8 caracteres; con menos, el script
// avisa pero igual las acepta. Si un usuario ya existe, este script no lo
// toca (no cambia su contraseña).

import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { hashPassword } from '../src/lib/auth';
import { pool, prisma } from '../src/lib/prisma';

type Role = 'admin' | 'architect';
type Seed = { username: string; name: string; role: Role; password?: string };

const ROLE_LABEL: Record<Role, string> = { admin: 'Administrador', architect: 'Arquitecto' };

function ownPassword(envVar: string): string | undefined {
  const value = process.env[envVar]?.trim();
  if (!value) return undefined;
  if (value.length < 8) {
    console.warn(`Aviso: ${envVar} tiene menos de 8 caracteres — es fácil de adivinar.`);
  }
  return value;
}

const USERS: Seed[] = [
  {
    username: process.env.ADMIN_USERNAME?.trim().toLowerCase() || 'admin',
    name: 'Administrador',
    role: 'admin',
    password: ownPassword('ADMIN_PASSWORD'),
  },
  {
    username: process.env.ARCHITECT_USERNAME?.trim().toLowerCase() || 'arquitecto',
    name: process.env.ARCHITECT_NAME?.trim() || 'Arquitecto',
    role: 'architect',
    password: ownPassword('ARCHITECT_PASSWORD'),
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
    const password = seed.password ?? generatePassword();
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
