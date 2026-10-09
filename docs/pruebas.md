# Pruebas

`npm test` ejecuta 183 pruebas con Jest. Los repositorios corren contra SQLite real en memoria (better-sqlite3) con
las mismas migraciones que la app; las pantallas se renderizan con React Native Testing Library. Los módulos nativos
(almacén seguro, archivos, impresión, compartir, notificaciones) se sustituyen por dobles en `tests/setup.ts`.

| Apartado 31 | Dónde |
| --- | --- |
| Crear usuario, iniciar sesión, errores de autenticación | `tests/integration/auth.test.ts`, `tests/ui/screens.test.tsx` |
| Registrar, editar y eliminar episodio | `tests/ui/episode.test.tsx`, `tests/integration/repositories.test.ts`, `tests/ui/journey.test.tsx` |
| Registrar síntomas | `tests/unit/episodeDraft.test.ts`, `tests/ui/episode.test.tsx` |
| Medicación, sueño, hidratación | `tests/integration/treatment.test.ts`, `tests/ui/treatment.test.tsx` |
| Calendario y estadísticas | `tests/unit/analytics.test.ts`, `tests/unit/evolution.test.ts`, `tests/ui/analysis.test.tsx` |
| Generar informe | `tests/unit/report.test.ts`, `tests/ui/safety.test.tsx` |
| Detectar señales de alarma | `tests/unit/alerts.test.ts`, `tests/integration/alerts.test.ts`, `tests/ui/safety.test.tsx` |
| Exportar datos | `tests/integration/privacy.test.ts`, `tests/ui/journey.test.tsx` |
| Datos incompletos e inválidos | `tests/unit/validation.test.ts`, `tests/unit/treatmentDrafts.test.ts` y pruebas de formularios |
| Registros duplicados | Solapamiento de episodios y un registro por día (`tests/integration/repositories.test.ts`, `treatment.test.ts`) |
| Sin conexión | Modo local completo sin red y traducción de errores de red de Supabase (`auth.test.ts`) |

`tests/ui/journey.test.tsx` recorre la app de punta a punta: alta, consentimiento, episodio, edición, calendario,
informe PDF, copia de datos, borrado de registros y baja.

## Antes de publicar

Las pruebas automáticas no sustituyen una ronda en dispositivos reales (iOS y Android, modo claro y oscuro, texto
grande, VoiceOver y TalkBack), sobre todo para la hoja de compartir, la impresión a PDF y las notificaciones.
