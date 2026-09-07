// Copia el cliente Prisma generado (src/generated) a dist/generated tal cual.
// tsc NO debe compilar ese cliente: al bajarlo a un target antiguo rompe su
// runtime ("Must call super constructor in derived class ...").

const fs = require('fs');
const path = require('path');

const from = path.join(__dirname, '..', 'src', 'generated');
const to = path.join(__dirname, '..', 'dist', 'generated');

if (!fs.existsSync(from)) {
  console.error('No existe src/generated. Ejecuta "npx prisma generate" primero.');
  process.exit(1);
}

fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log('Cliente Prisma copiado a dist/generated');
