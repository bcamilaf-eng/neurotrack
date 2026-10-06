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

`eas.json` define tres perfiles: `development` (build con el cliente de desarrollo y SQLCipher), `preview`
(instalación interna para probar) y `production` (tiendas).

```bash
npx eas-cli@latest login
npx eas-cli@latest init                              # vincula el proyecto a tu cuenta de Expo
npx eas-cli@latest build --profile development --platform android|ios
npx eas-cli@latest build --profile preview --platform all
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform ios|android
```

Configura `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` como variables de entorno de EAS
(`npx eas-cli@latest env:create`). Sin ellas, la app funciona en modo local de prueba.

### Actualizaciones por el aire

Los cambios solo de JavaScript se pueden publicar sin pasar por las tiendas:

```bash
npx eas-cli@latest update:configure
npx eas-cli@latest update --branch production --message "Corrección del informe"
```

Un cambio que añade módulos nativos (por ejemplo, una librería nueva) necesita una build nueva.

### Fichas de las tiendas

- iOS: en *App Privacy* declara «Health & Fitness» y «Contact Info» (email) como datos vinculados al usuario, no
  usados para rastreo.
- Android: en *Data safety* declara datos de salud y email, cifrados en tránsito, con borrado a petición del
  usuario (Perfil › Privacidad).
- Las notificaciones solo se piden al activar el primer recordatorio.

## 3. Antes de publicar

- Revisión legal de la política de privacidad, términos y consentimientos (`src/i18n/legal.ts` y `src/i18n/es.ts`)
  para los países de lanzamiento. Al cambiarlos, sube `CURRENT_CONSENT_VERSION` para volver a pedir el consentimiento.
- Revisión clínica de las reglas de alertas (`src/domain/alerts/rules.ts`) y de los umbrales de patrones
  (`src/domain/analytics/patterns.ts`) por un profesional de neurología. Al cambiar una regla, sube
  `ALARM_RULES_VERSION`.
- Evaluación de impacto de protección de datos (EIPD), obligatoria en la UE para datos de salud a gran escala.
