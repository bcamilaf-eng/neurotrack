# Privacidad y seguridad

Cómo cubre NeuroTrack cada punto del apartado 19 de la especificación.

| Requisito | Implementación |
| --- | --- |
| Autenticación segura | Supabase Auth (email y contraseña, confirmación de email) o cuentas locales (solo para pruebas) con sal y SHA-256 iterado, y bloqueo tras intentos fallidos (`src/services/auth`). Sesión en el almacén seguro del sistema, troceada si es larga. |
| Cifrado | Base local SQLCipher (AES-256) con clave aleatoria de 256 bits en Keychain/Keystore (`src/data/db/expoDatabase.ts`). En la nube, TLS y cifrado en reposo de Supabase (región UE). |
| Control de acceso | Cada consulta filtra por `user_id`; en Supabase, Row Level Security en todas las tablas (`supabase/tests/rls_isolation.sql`). |
| Protección de sesiones | Bloqueo con Face ID, huella o código al abrir la app y tras 0, 1, 5 o 15 minutos en segundo plano. Las sesiones caducan. |
| Eliminación de cuenta | Perfil › Privacidad › Eliminar mi cuenta: borra cuenta y datos locales y, con Supabase, la función `delete-account`. |
| Eliminación de datos | Registros sueltos (con confirmación), todos los registros conservando la cuenta, o todo. |
| Política de privacidad | Perfil › Privacidad › Política de privacidad (`src/i18n/legal.ts`, borrador para revisión legal). |
| Consentimiento informado | Obligatorios: términos y datos de salud. Opcionales y revocables: sincronización y análisis de patrones. Versionados: un cambio de versión vuelve a pedirlos. |
| Minimización de datos | Solo email y contraseña son obligatorios. Sin ubicación, contactos, publicidad ni analítica de terceros. |
| Acceso y portabilidad | Perfil › Privacidad › Exportar todos mis datos (JSON). |

## Nada sale del teléfono sin una acción explícita

- Informes PDF y CSV y la copia JSON se crean en la caché privada y solo se envían a donde el usuario elija en la hoja
  de compartir. Se borran al cerrarla y, por si la app se cerrara, al volver a arrancar.
- Los nombres de archivo no contienen datos clínicos (`neurotrack-informe-AAAA-MM-DD_AAAA-MM-DD.pdf`).
- Los recordatorios solo dicen «Tienes un registro pendiente». En Android, el canal oculta el contenido en la pantalla
  de bloqueo.
- Android: `allowBackup` desactivado, para que la base no acabe en copias de seguridad del sistema.

## Pendiente antes de publicar

Revisión legal de los textos, evaluación de impacto (EIPD) y revisión clínica de las reglas. Ver
[despliegue.md](despliegue.md).
