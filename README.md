# TrackMyProgress

App personal para llevar el progreso en gimnasio (y, más adelante, dieta, estudios y peso
corporal). Es una PWA: funciona en el navegador del PC y se puede instalar en el iPhone desde
Safari, sin pasar por la App Store.

## 1. Crear el proyecto de Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita (puedes entrar con
   GitHub o Google).
2. Crea un **nuevo proyecto** (elige una contraseña de base de datos y guárdala).
3. Cuando el proyecto esté listo, ve a **SQL Editor** → **New query**, pega el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo. Esto crea las tablas
   `workouts` / `workout_sets` con seguridad a nivel de fila (cada usuario solo ve sus propios
   datos).
4. Ve a **Project Settings → API** y copia:
   - **Project URL**
   - **anon public key**

## 2. Configurar el proyecto local

```bash
cp .env.example .env
```

Edita `.env` y pega los valores del paso anterior:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## 3. Instalar y arrancar

```bash
npm install
npm run dev
```

Abre la URL que muestre la terminal (normalmente `http://localhost:5173`). Regístrate con tu
email — Supabase te enviará un correo de confirmación antes de poder iniciar sesión (puedes
desactivar esa confirmación en **Authentication → Providers → Email** mientras pruebas, si
quieres saltártela).

## 4. Usarla en el iPhone

Con el servidor solo en local (`npm run dev`), únicamente el PC puede acceder. Para instalarla
en el iPhone como una app hace falta que esté servida por HTTPS y accesible desde internet.
La forma más simple y gratuita es desplegarla en **Vercel** o **Netlify**:

1. Sube este proyecto a un repositorio de GitHub.
2. Conéctalo en [vercel.com](https://vercel.com) (importar repo de GitHub).
3. Añade las mismas variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) en la
   configuración del proyecto en Vercel.
4. Despliega. Vercel te dará una URL `https://...vercel.app`.
5. Abre esa URL en Safari desde el iPhone → botón **Compartir** → **Añadir a pantalla de
   inicio**. Se instalará como una app con su propio icono.

## Estructura

- `src/pages/` — pantallas: login, registro, dashboard, nuevo entrenamiento, historial, detalle.
- `src/context/AuthContext.jsx` — sesión de Supabase (login/registro/logout).
- `src/components/Layout.jsx` — navegación (barra inferior en móvil, superior en escritorio).
- `supabase/schema.sql` — tablas y políticas de seguridad (RLS).

Para añadir un nuevo módulo (peso corporal, dieta, estudios...) se sigue el mismo patrón: una
tabla nueva en Supabase con RLS por `user_id`, una página en `src/pages/`, y una entrada en la
navegación de `Layout.jsx`.
