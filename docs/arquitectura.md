# Arquitectura

El plan técnico completo (stack, navegación, modelo de datos, seguridad, privacidad y fases) está en el documento
«NEUROTRACK · Plan técnico (Etapa 1)». Este archivo resume cómo está organizado el código.

## Capas

Las dependencias van en un solo sentido: `app/ui → state → domain ← data`, y `services` es usado por `state`.

| Capa | Carpeta | Regla |
| --- | --- | --- |
| Presentación | `src/app`, `src/ui` | Solo muestra y recoge datos; no habla con SQL. |
| Estado | `src/state` | Sesión (Zustand) y acceso a servicios y repositorios. |
| Dominio | `src/domain` | TypeScript puro: catálogos, esquemas Zod, reglas. Sin React ni SQLite. |
| Datos | `src/data` | SQL, migraciones, repositorios. Valida con el dominio antes de escribir. |
| Servicios | `src/services` | Autenticación, biometría, exportación de archivos (PDF, CSV, JSON) y recordatorios. |

## Decisiones

- **Local-first.** Cada registro se guarda primero en el teléfono, en SQLite cifrado con SQLCipher. La clave es
  aleatoria (256 bits) y vive en Keychain/Keystore. La sincronización con Supabase se añade más adelante usando
  `updated_at`, `deleted_at` y `sync_status`, que ya existen en todas las tablas.
- **Repositorios con SQL explícito en lugar de Drizzle.** El plan proponía Drizzle ORM; se optó por repositorios
  tipados sobre un contrato `SqlDatabase` mínimo. Así las pruebas corren contra SQLite real (better-sqlite3) con las
  mismas migraciones que la app, sin mocks de base de datos.
- **Rutas en `src/app`.** Es la convención actual de Expo Router; el resto del código vive fuera de esa carpeta.
- **Validación en tres niveles.** Formularios (mensajes en español), repositorios (Zod, siempre) y restricciones
  `CHECK` en SQLite y PostgreSQL.
- **Borrado lógico.** Borrar un registro marca `deleted_at`; eliminar todos los datos o la cuenta borra físicamente.
- **Reloj inyectable** (`src/utils/clock.ts`) para probar fechas futuras, duraciones y bloqueos de forma determinista.

## Estados de sesión

`initializing → signedOut → needsConsent → ready ⇄ locked`

- `needsConsent`: faltan los consentimientos obligatorios vigentes (`CURRENT_CONSENT_VERSION`). Cambiar la versión
  vuelve a pedirlos.
- `locked`: bloqueo biométrico al abrir la app y tras `lockAfterMinutes` en segundo plano.

Las rutas se protegen con `Stack.Protected` en `src/app/_layout.tsx`: cada grupo solo existe en su estado.

## Modelo de datos

15 tablas: `users`, `user_settings`, `emergency_contacts`, `consents`, `headache_episodes`, `episode_events`,
`symptoms`, `aura_details`, `triggers`, `medications`, `sleep_records`, `hydration_records`, `meal_records`,
`daily_records` y `alarm_flags`. Definición local en `src/data/db/migrations.ts` y en la nube en
`supabase/migrations/`.

La comunidad añade 4 tablas no clínicas: `community_profiles` (seudónimo y normas aceptadas), `community_posts`,
`community_replies` y `community_reports`. En la nube son compartidas entre todas las cuentas; en el modo local de
prueba viven en el teléfono con temas de ejemplo.

## Comunidad

Foros por categoría (consejos, experiencias, preguntas, apoyo) en la pestaña Comunidad.

- **Seudónimo obligatorio:** nunca se muestra el email ni ningún registro clínico. Las normas se aceptan al entrar y
  están versionadas (`COMMUNITY_RULES_VERSION`); cambiarlas vuelve a pedirlas.
- **Sin datos de contacto:** títulos, textos y seudónimos rechazan emails y teléfonos (`src/domain/community.ts`).
- **Moderación por reportes:** quien reporta deja de ver ese contenido; con 3 reportes de personas distintas se oculta
  para todos hasta revisarlo. En Supabase lo hace un disparador, no la app.
- **Servicio intercambiable:** `src/services/community` elige Supabase o el modo local, igual que la autenticación.

## Módulos por responsabilidad

| Responsabilidad | Dónde |
| --- | --- |
| UI y navegación | `src/app` (rutas), `src/ui/components` (reutilizables), `src/ui/features` (por función) |
| Lógica de negocio | `src/domain/entities` (esquemas), `src/domain/usecases` (borradores de formulario) |
| Persistencia | `src/data/db` (migraciones), `src/data/repositories` |
| Autenticación | `src/services/auth` (Supabase o local), `src/state/sessionStore.ts` |
| Análisis estadístico | `src/domain/analytics` (resúmenes, períodos, calendario, patrones) |
| Señales de alarma | `src/domain/alerts/rules.ts` (reglas) y `src/data/repositories/alarmRepository.ts` |
| Generación de informes | `src/domain/report` (contenido, CSV, HTML) y `src/services/export` (PDF y compartir) |
| Notificaciones | `src/domain/reminders.ts` (ajustes) y `src/services/notifications` (programación) |
| Comunidad | `src/domain/community.ts` (normas y validación), `src/services/community` (local o Supabase), `src/app/comunidad` |

## Flujo de un episodio

1. `EpisodeForm` edita un `EpisodeDraft` (textos y horas por separado).
2. `draftToInput` lo convierte en `EpisodeInput`; los errores vuelven al paso del formulario que corresponde.
3. `EpisodeRepository` valida con Zod, comprueba solapamientos y escribe episodio, síntomas, aura y desencadenantes en
   una transacción.
4. `onChange` dispara `AlarmRepository.evaluate`, que aplica las reglas y sincroniza `alarm_flags`.
5. El detalle muestra el aviso si hay señales; calendario, evolución e informe leen los mismos repositorios.

## Archivos que salen del teléfono

Solo cuando el usuario elige un destino en la hoja de compartir: informe PDF, CSV y copia completa JSON. Se crean en
`cache/exportaciones`, se borran al cerrar la hoja y la carpeta se vacía también al arrancar la app.
