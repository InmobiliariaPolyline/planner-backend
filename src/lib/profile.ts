// Validación de los datos personalizables del perfil de usuario.

/** Colores de avatar disponibles (los mismos que ofrece el módulo Sistema). */
export const AVATAR_COLORS = ['#5b3df5', '#2563eb', '#0891b2', '#059669', '#d97706', '#db2777', '#dc2626', '#475569'];

/** Tope del data URL de la foto: el navegador la reduce a ~128 px (unos 5-15 KB). */
export const MAX_AVATAR_CHARS = 60_000;

const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const PHONE = /^[0-9+()\-.\s]{6,30}$/;

export type ProfileUpdate = {
  name?: string;
  jobTitle?: string | null;
  phone?: string | null;
  avatarColor?: string | null;
  avatarUrl?: string | null;
};

function optionalText(value: unknown, label: string, max: number): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || /[<>]/.test(value)) throw new Error(`${label} contiene un valor inválido.`);
  const text = value.trim();
  if (text.length > max) throw new Error(`${label} no puede pasar de ${max} caracteres.`);
  return text || null;
}

/** Valida el cuerpo de PATCH /auth/profile. Solo devuelve las claves recibidas. */
export function parseProfile(body: unknown): ProfileUpdate {
  const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const out: ProfileUpdate = {};

  if ('name' in input) {
    const name = optionalText(input.name, 'El nombre', 80);
    if (!name || name.length < 2) throw new Error('Escribe tu nombre (al menos 2 caracteres).');
    out.name = name;
  }
  if ('jobTitle' in input) out.jobTitle = optionalText(input.jobTitle, 'El cargo', 80);
  if ('phone' in input) {
    const phone = optionalText(input.phone, 'El teléfono', 30);
    if (phone && !PHONE.test(phone)) {
      throw new Error('Escribe un teléfono válido (solo números, espacios y + - ( ) .).');
    }
    out.phone = phone;
  }
  if ('avatarColor' in input) {
    const color = input.avatarColor;
    if (color === null || color === '') out.avatarColor = null;
    else if (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) out.avatarColor = color.toLowerCase();
    else throw new Error('El color del avatar no es válido.');
  }
  if ('avatarUrl' in input) {
    const url = input.avatarUrl;
    if (url === null || url === '') out.avatarUrl = null;
    else if (typeof url === 'string' && url.length <= MAX_AVATAR_CHARS && DATA_URL.test(url)) out.avatarUrl = url;
    else throw new Error('La foto no es válida o es demasiado grande. Usa una imagen PNG, JPG o WebP pequeña.');
  }
  if (Object.keys(out).length === 0) throw new Error('No hay datos para actualizar.');
  return out;
}
