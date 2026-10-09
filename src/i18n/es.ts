/**
 * Textos fijos de la app en español, incluidos los avisos médicos y legales.
 * Los textos legales son borradores y deben revisarse antes de publicar.
 */
import type { ConsentType } from '../domain/catalogs';

export const APP_NAME = 'NEUROTRACK';
export const TAGLINE = 'Tu registro neurológico, organizado.';

export const MEDICAL_DISCLAIMER =
  'NeuroTrack es una herramienta de registro y seguimiento. No reemplaza la evaluación, diagnóstico ni tratamiento de un profesional de salud.';

export const CONSENT_TEXTS: Record<ConsentType, { title: string; description: string }> = {
  terms: {
    title: 'Acepto los términos de uso',
    description:
      'NeuroTrack registra y resume lo que tú anotas. No diagnostica ni recomienda tratamientos.',
  },
  health_data: {
    title: 'Autorizo el tratamiento de mis datos de salud',
    description:
      'Tus registros se guardan cifrados en este teléfono y solo se usan para mostrarte tu evolución. Puedes retirar este permiso y borrar tus datos cuando quieras.',
  },
  cloud_sync: {
    title: 'Sincronizar una copia cifrada en la nube',
    description:
      'Opcional. Permite recuperar tus registros si cambias de teléfono. Si no lo aceptas, tus datos clínicos no salen del dispositivo.',
  },
  pattern_analysis: {
    title: 'Analizar mis registros para mostrar patrones',
    description:
      'Opcional. El análisis se hace en tu teléfono y muestra posibles asociaciones estadísticas, nunca causas ni diagnósticos.',
  },
};

export const PRIVACY_SUMMARY = [
  'Solo pedimos tu email y una contraseña. El resto del perfil es opcional.',
  'Tus registros se guardan cifrados en el teléfono (AES-256) y la clave nunca sale del almacén seguro del sistema.',
  'No hay publicidad, no vendemos datos y no usamos analítica de terceros.',
  'Tus registros clínicos solo salen del dispositivo si activas la sincronización o compartes un informe.',
  'Puedes exportar, corregir y eliminar tus datos, o eliminar tu cuenta, desde Perfil.',
];

export const TERMS_SUMMARY = [
  'NeuroTrack es una herramienta de registro personal. No es un dispositivo médico.',
  'Las estadísticas y patrones describen tus propios registros y no implican causalidad.',
  'Ante síntomas graves o repentinos, busca atención médica inmediata.',
  'No uses NeuroTrack para decidir iniciar, suspender o cambiar un medicamento: consulta a un profesional.',
];

export const LOCAL_MODE_NOTICE =
  'Modo local de prueba: la cuenta solo existe en este teléfono y no se puede recuperar la contraseña por email.';

/** Aviso fijo del módulo de medicación. */
export const MEDICATION_NOTICE =
  'NeuroTrack solo registra lo que tomaste y cómo te sentiste. No recomienda iniciar, suspender ni cambiar ningún medicamento: consulta siempre con tu profesional de salud.';

/** Aviso de las escalas de estrés, ansiedad, ánimo y carga. */
export const SUBJECTIVE_NOTICE =
  'Estas escalas son tu propia valoración del día. Sirven para ver tu evolución, no son una medición clínica.';

/** Aviso de alimentación: un alimento anotado no es una causa. */
export const FOOD_NOTICE =
  'Anotar lo que comes ayuda a buscar posibles asociaciones en tus registros. Que un alimento coincida con un episodio no significa que lo cause.';
