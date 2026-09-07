import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Se usa process.env directamente (no env('DATABASE_URL')) para que comandos
// offline como `prisma generate` o `prisma migrate diff --from-empty` no fallen
// cuando no hay DATABASE_URL configurada. Los comandos que sí tocan la base
// (migrate deploy, db push, studio) igual la exigen.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/placeholder',
  },
});
