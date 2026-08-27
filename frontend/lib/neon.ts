import { createClient } from '@neondatabase/neon-js';

const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
const dataApiUrl = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;

if (!authUrl || !dataApiUrl) {
  throw new Error('Faltan NEXT_PUBLIC_NEON_AUTH_URL o NEXT_PUBLIC_NEON_DATA_API_URL');
}

export const neon = createClient({
  auth: { url: authUrl },
  dataApi: { url: dataApiUrl },
});