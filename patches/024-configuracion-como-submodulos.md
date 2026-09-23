# Parche 024: Configuración pasa a submódulos, no una sola página larga

## Qué se pidió

Las sub-opciones de Configuración (Perfil, Tema, Seguridad…) debían
sentirse como áreas distintas a las que se entra con un clic, no una sola
pantalla larga con todo apilado — y mostrar solo lo que de verdad aplica.

## Qué se construyó

**`ConfigView.tsx`**: ahora es un mini panel de dos niveles.

- **Nivel 1 (por defecto):** una cuadrícula de tarjetas, una por cada
  área disponible — «Perfil» (Cuenta), «Tema» (Apariencia), «Verificación
  en dos pasos» (Acceso). Cada tarjeta es un botón con ícono, categoría,
  título y una línea de qué hace.
- **Nivel 2:** al hacer clic en una tarjeta, se entra a esa área sola —
  con su propio título y un enlace «← Configuración» para volver — sin
  ver el resto de las secciones.
- La lista de módulos tiene un campo `available` por cada uno: solo se
  muestran (y se puede entrar a) los que de verdad están activos. Hoy los
  tres lo están, pero deja listo el lugar para ocultar uno el día que deje
  de aplicar (o mostrar uno nuevo solo bajo cierta condición) sin tocar el
  resto del componente.
- El contenido de cada sección (el selector de tema, el formulario de
  contraseña, el aviso de 2FA) es el mismo de antes, solo que ya no repite
  su propio título/ícono adentro — ese rol lo cumple ahora el encabezado
  del submódulo.
- **`app/globals.css`**: nuevas clases `.config-modules` (cuadrícula) y
  `.config-module-card` (tarjeta clicable con hover), siguiendo el mismo
  lenguaje visual que el resto de la app.

## Validación

- `npx tsc --noEmit`, `npx eslint . --quiet`, `npx next build`: correctos.
- Verificado en el navegador (claro y oscuro): la cuadrícula muestra las
  tres tarjetas; entrar a «Tema» permite cambiarlo y el cambio se aplica
  al instante; «← Configuración» vuelve a la cuadrícula manteniendo el
  tema elegido; «Perfil» muestra el formulario de contraseña solo, y
  «Verificación en dos pasos» su aviso solo.

No requiere cambios de backend ni migración.
