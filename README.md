# NEUROTRACK

> Tu registro neurológico, organizado.

Aplicación móvil (iOS y Android) para registrar, seguir y analizar migrañas, cefaleas y jaquecas, y llevar un
informe claro a la consulta médica.

**Aviso médico.** NeuroTrack es una herramienta de registro y seguimiento. No reemplaza la evaluación, diagnóstico ni
tratamiento de un profesional de salud.

## Estado

| Hito | Etapas | Estado |
| --- | --- | --- |
| 1. Base | Arquitectura, autenticación, base de datos | ✅ Hecho |
| 2. Registro clínico | Dashboard, episodios, síntomas y desencadenantes | ✅ Esta versión |
| 3. Tratamiento y hábitos | Medicación, sueño, hidratación, alimentación, estado diario | Pendiente |
| 4. Visualización y análisis | Calendario, estadísticas, patrones | Pendiente |
| 5. Seguridad del paciente | Alertas, informes PDF/CSV, notificaciones | Pendiente |
| 6. Cierre | Privacidad completa, pruebas E2E, optimización UI/UX | Pendiente |

### Qué incluye el hito 1

- Registro, inicio de sesión, verificación de email y recuperación de contraseña (Supabase Auth).
- Modo local de prueba sin servidor, para probar la app en un teléfono sin configurar nada.
- Consentimiento informado y granular antes de registrar datos de salud.
- Base de datos local cifrada (SQLCipher, AES-256) con las 15 tablas del modelo y migraciones versionadas.
- Repositorios con validación, aislamiento por usuario, borrado lógico y detección de duplicados para episodios,
  línea temporal, síntomas, aura, desencadenantes, medicación, sueño, hidratación, alimentación y estado diario.
- Bloqueo con Face ID, huella o código del dispositivo.
- Navegación inferior (Inicio, Registrar, Calendario, Evolución, Perfil), tema claro/oscuro y componentes accesibles.
- Perfil opcional, contacto de emergencia, centro de privacidad y eliminación de cuenta.
- Esquema de Supabase con Row Level Security y función de borrado de cuenta.
- 80 pruebas automatizadas.

### Qué incluye el hito 2

- Registro de episodio en 5 pasos; solo el primero (cuándo y cuánto duele) es obligatorio.
- Fecha y horas con el selector nativo, duración automática (incluye episodios que cruzan la medianoche o duran varios días).
- Escala de dolor 0–10 con número, banda (leve, moderado…) y color con contraste AA.
- Mapa de la cabeza (frente y nuca) sincronizado con la lista de localizaciones, que es la que usan los lectores de pantalla.
- Síntomas con detalle del aura y posibles desencadenantes («No identificado» es excluyente).
- Aviso de posible duplicado («Ver el existente» o «Guardar igualmente»), confirmación de episodios de más de 72 h y aviso al salir con cambios sin guardar.
- Detalle del episodio con línea temporal: anotar la intensidad actual o una nota, cerrar un episodio en curso, editar y eliminar con confirmación.
- Inicio con resumen del mes, días desde el último episodio, acciones rápidas, «día sin dolor» y gráficos de las últimas 8 semanas.
- 101 pruebas automatizadas.

Las secciones de los hitos siguientes aparecen en la app marcadas como «Próximamente».

## Ejecutar el proyecto

Requisitos: Node.js 20.19.4 o superior (recomendado 22) y la app **Expo Go** o una build de desarrollo en el teléfono.

```bash
npm install
npx expo start
```

Escanea el código QR con la cámara (iOS) o con Expo Go (Android).

- **Sin configuración**, la app arranca en *modo local de prueba*: las cuentas existen solo en el teléfono.
- **Con Supabase**, copia `.env.example` a `.env.local` y rellena `EXPO_PUBLIC_SUPABASE_URL` y
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` (ver [docs/despliegue.md](docs/despliegue.md)).

> **Cifrado de la base local:** Expo Go no incluye SQLCipher, así que allí la base no se cifra. Para probar el
> cifrado real usa una build de desarrollo: `npx expo run:android`, `npx expo run:ios` o
> `npx eas-cli@latest build --profile development`.

## Comprobaciones

```bash
npm run typecheck   # TypeScript estricto
npm run lint        # ESLint (configuración de Expo)
npm test            # Jest: dominio, base de datos real en memoria, autenticación y pantallas
npm run check       # las tres anteriores
```

## Estructura

```text
src/
├─ app/            Rutas y pantallas (Expo Router)
├─ ui/             Tema, componentes reutilizables, hooks de formulario
├─ domain/         Catálogos clínicos, esquemas de validación (Zod), errores
├─ data/           Base SQLite cifrada, migraciones y repositorios
├─ services/       Autenticación (Supabase / local) y biometría
├─ state/          Estado de sesión (Zustand) y contenedor de servicios
├─ i18n/           Textos en español, avisos médicos y legales
└─ utils/          Fechas, reloj inyectable, identificadores
supabase/          Migraciones PostgreSQL con RLS, función de borrado de cuenta, pruebas SQL
tests/             Pruebas unitarias, de integración y de pantallas
docs/              Arquitectura y despliegue
```

Más detalle en [docs/arquitectura.md](docs/arquitectura.md).
