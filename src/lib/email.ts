import { Resend } from 'resend';

let client: Resend | null = null;

function getClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('El envío de correo no está configurado en el servidor (falta RESEND_API_KEY).');
  }
  if (!client) client = new Resend(key);
  return client;
}

const FROM = process.env.RESEND_FROM ?? 'Project Planner <onboarding@resend.dev>';

export type TwoFactorPurpose = 'link' | 'unlink' | 'login';

const SUBJECT: Record<TwoFactorPurpose, string> = {
  link: 'Vincula tu correo — Project Planner',
  unlink: 'Confirma quitar la verificación en dos pasos — Project Planner',
  login: 'Tu código de acceso — Project Planner',
};

const INTRO: Record<TwoFactorPurpose, string> = {
  link: 'Usa este código para vincular este correo a tu cuenta de Project Planner:',
  unlink: 'Usa este código para confirmar que quieres quitar la verificación en dos pasos:',
  login: 'Usa este código para terminar de iniciar sesión en Project Planner:',
};

/** Envía el código de 6 dígitos por correo. Lanza si el envío falla. */
export async function sendTwoFactorEmail(to: string, code: string, purpose: TwoFactorPurpose): Promise<void> {
  const { error } = await getClient().emails.send({
    from: FROM,
    to,
    subject: SUBJECT[purpose],
    html: `
      <div style="font-family: sans-serif; color: #171a21;">
        <p>${INTRO[purpose]}</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; margin: 24px 0;">${code}</p>
        <p style="color: #545b68; font-size: 13px;">Vence en 10 minutos. Si no fuiste tú quien lo pidió, ignora este correo.</p>
      </div>
    `,
  });
  if (error) {
    console.error('Resend no pudo enviar el correo:', error);
    throw new Error('No fue posible enviar el correo con el código. Inténtalo de nuevo en un momento.');
  }
}

/** "jperez@gmail.com" -> "jp***@gmail.com" — para mostrar sin exponer el correo completo. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${'*'.repeat(Math.max(3, user.length - visible.length))}@${domain}`;
}
