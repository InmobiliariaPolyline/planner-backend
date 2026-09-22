# Parche 016: cambio de contraseña + verificación en dos pasos (en pausa)

## Qué se pidió

Doble autenticación por correo: vincular un Gmail a la cuenta con su propio
proceso de verificación (para vincular y para quitar), y pedir un código de
6 dígitos al iniciar sesión si está activada, con reenvío cada 2 minutos y
cuenta regresiva en vivo.

## Qué se construyó y por qué queda en pausa

Se construyó todo el mecanismo (backend y pantallas), usando
[Resend](https://resend.com) para el envío de correo. Al probarlo con la
API key real se confirmó que **el plan gratuito de Resend solo permite
enviar correos a la dirección con la que se creó la cuenta** — no a
cualquier Gmail. Sin verificar un dominio propio en Resend, el sistema no
puede mandarle un código a un usuario cualquiera, así que activar esto para
usuarios reales todavía no es posible.

Se decidió **dejar la función construida pero apagada**: el código sigue
en el repositorio, listo para retomarse en cuanto se verifique un dominio en
Resend, pero no aparece en ningún lado de la interfaz. Mientras tanto, el
inicio de sesión funciona exactamente como antes (usuario + contraseña, sin
pasos extra).

### Lo que sí quedó activo: cambiar la propia contraseña

En **Configuración → Perfil**, cualquier usuario puede cambiar su
contraseña en el momento (pide la contraseña actual, la nueva y su
confirmación). No requiere ningún paso de verificación adicional, tal como
se pidió.

## Backend

- **`prisma/schema.prisma`**: `User.twoFactorEmail`, `User.twoFactorEnabled`,
  y la tabla `TwoFactorCode` (códigos de un solo uso, con propósito
  `link`/`unlink`/`login`, hash del código, intentos y caducidad).
  Migración `20260922010000_add_two_factor_auth`.
- **`src/lib/email.ts`** (nuevo): envío por Resend (`RESEND_API_KEY` como
  variable de entorno) y `maskEmail()` para mostrar el correo sin exponerlo
  completo.
- **`src/lib/twoFactor.ts`** (nuevo): `issueTwoFactorCode()` (genera, guarda
  hasheado y envía; respeta un cupo de 2 min) y `verifyTwoFactorCode()`
  (comprueba, cuenta intentos, borra al usarse/caducar). Corrigió un error
  encontrado al probar: si el envío del correo fallaba, el código igual
  quedaba guardado y activaba el cupo de 2 min sin que el correo hubiera
  salido — ahora, si el envío falla, se borra el código para no bloquear un
  reintento inmediato.
- **`POST /auth/login`**: si la cuenta tiene la verificación activada,
  en vez de la sesión devuelve un desafío (`twoFactorRequired`); el segundo
  paso se completa en `POST /auth/2fa/login-verify` (público, sin sesión
  todavía) con reenvío en `POST /auth/2fa/login-resend`.
- **`GET/POST /auth/2fa/...`** (autenticadas): `status`, `link/start`,
  `link/confirm`, `unlink/start`, `unlink/confirm`.
- **`PATCH /auth/password`** (nuevo, activo): cambia la contraseña propia
  verificando la actual.

## Frontend

- **`components/ui/TwoFactorCodeForm.tsx`** (nuevo): entrada del código de
  6 dígitos con cuenta regresiva en vivo para reenviar (usado por el login
  en dos pasos; queda sin usar mientras la función está en pausa).
- **`hooks/useAuth.ts`**: maneja el desafío de dos pasos si el backend lo
  pide (`twoFactor`, `verifyTwoFactor`, `resendTwoFactor`, `cancelTwoFactor`).
- **`components/planner/Screens.tsx`**: `LoginScreen` muestra el segundo
  paso si el backend lo exige (hoy nunca ocurre, porque no hay forma de
  activarlo desde la interfaz).
- **`components/planner/ConfigView.tsx`**: sección **Perfil** (cambio de
  contraseña, activa) y sección **Verificación en dos pasos** (aviso de que
  todavía no está disponible).

## Validación

- `npm run build`, `npm test` (8), `npx prisma validate`: correctos.
- Frontend: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx next build`:
  correctos.
- Verificado en el navegador y con la API real: envío de código fallando
  con el error real de Resend (correo fuera de la cuenta verificada) sin
  dejar el cupo de 2 min activado (bug corregido); login normal sin pasos
  extra; cambio de contraseña de un usuario de prueba y confirmación de que
  la contraseña nueva sirve para entrar. El usuario de prueba se eliminó al
  terminar.

## Pendiente para retomar la verificación en dos pasos

1. Verificar un dominio propio en [resend.com/domains](https://resend.com/domains).
2. Cambiar el remitente (`RESEND_FROM`) de `onboarding@resend.dev` a una
   dirección de ese dominio.
3. Mostrar de nuevo la sección de vincular/quitar correo en Configuración
   (hoy solo muestra el aviso de "en pausa") y probar el flujo completo con
   una cuenta real ajena a la de Resend.
