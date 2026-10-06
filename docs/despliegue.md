# Despliegue

## 1. Backend (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com) en una **región de la UE** (datos de salud).
2. Aplica el esquema:
   ```bash
   npx supabase link --project-ref TU_PROYECTO
   npx supabase db push
   ```
3. Despliega la función de borrado de cuenta:
   ```bash
   npx supabase functions deploy delete-account
   ```
4. En *Authentication › URL Configuration* añade `neurotrack://reset-password` como URL de redirección.
5. En *Authentication › Providers › Email* activa la confirmación de email y la protección contra contraseñas
   filtradas. `supabase/config.toml` recoge los valores recomendados.
6. Copia la URL y la clave `anon` del proyecto a `.env.local` (ver `.env.example`). La clave `service_role` nunca va
   en la app.

### Probar las políticas de seguridad en local

Con un PostgreSQL 15+ local:

```bash
psql -f supabase/tests/00_auth_stub.sql
psql -f supabase/migrations/20261006000000_esquema_inicial.sql
psql -f supabase/tests/rls_isolation.sql
```

Las sentencias marcadas «debe fallar» deben terminar en `ERROR`, y el usuario B debe ver 0 episodios del usuario A.

## 2. App móvil (EAS)

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile development   # build de desarrollo con SQLCipher
npx eas-cli@latest build --profile production
npx eas-cli@latest submit --platform ios|android
```

Configura `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` como variables de entorno de EAS.

## 3. Antes de publicar

- Revisión legal de la política de privacidad, términos y consentimientos (`src/i18n/es.ts`) para los países de
  lanzamiento.
- Revisión clínica de las reglas de alertas (hito 5) por un profesional de neurología.
- Evaluación de impacto de protección de datos (EIPD), obligatoria en la UE para datos de salud a gran escala.
