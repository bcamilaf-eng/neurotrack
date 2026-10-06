/**
 * Textos legales completos. Son un BORRADOR redactado para el producto y deben pasar
 * revisión legal antes de publicar (ver docs/despliegue.md).
 */
export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export const LEGAL_VERSION = '2026-10-06';
export const LEGAL_DRAFT_NOTICE = 'Borrador pendiente de revisión legal antes de la publicación.';

export const PRIVACY_POLICY: LegalSection[] = [
  {
    title: 'Qué datos tratamos',
    paragraphs: [
      'Para crear la cuenta: tu email y una contraseña (que nunca se guarda en claro).',
      'Datos de salud que tú registras: episodios de dolor de cabeza, síntomas, posibles desencadenantes, medicación, sueño, hidratación, alimentación, estado del día y las señales de alarma que la app detecta en esos registros.',
      'Perfil opcional: nombre, fecha de nacimiento, sexo, peso, altura, país, embarazo o posparto, notas y un contacto de emergencia. Ninguno es obligatorio.',
      'No recogemos ubicación, contactos del teléfono, identificadores publicitarios ni analítica de uso.',
    ],
  },
  {
    title: 'Para qué los usamos',
    paragraphs: [
      'Únicamente para mostrarte tus propios registros, estadísticas, calendario, patrones (si los activas), avisos de señales de alarma, recordatorios e informes.',
      'La base legal es tu consentimiento explícito para el tratamiento de datos de salud, que puedes retirar en cualquier momento desde Perfil › Privacidad.',
    ],
  },
  {
    title: 'Dónde se guardan',
    paragraphs: [
      'En tu teléfono, en una base de datos cifrada (AES-256 con SQLCipher). La clave se genera en el dispositivo y se guarda en el almacén seguro del sistema (Keychain o Keystore).',
      'Si en el futuro activas la sincronización en la nube, tus registros se copiarán a servidores en la Unión Europea, con cifrado en tránsito y en reposo y acceso limitado a tu cuenta.',
    ],
  },
  {
    title: 'Con quién se comparten',
    paragraphs: [
      'Con nadie, salvo que tú lo decidas: los informes PDF o CSV y la copia completa de tus datos solo salen del teléfono cuando eliges un destino en la hoja de compartir.',
      'Los recordatorios no muestran datos de salud: solo «Tienes un registro pendiente».',
      'No vendemos datos ni los usamos para publicidad.',
    ],
  },
  {
    title: 'Tus derechos',
    paragraphs: [
      'Acceso y portabilidad: Perfil › Privacidad › Exportar todos mis datos.',
      'Rectificación: puedes editar cualquier registro o tu perfil.',
      'Supresión: puedes borrar registros sueltos, todos tus registros o la cuenta completa.',
      'Retirada del consentimiento: desde Perfil › Privacidad. Retirar el consentimiento de datos de salud impide seguir usando la app.',
    ],
  },
  {
    title: 'Conservación',
    paragraphs: [
      'Tus datos se conservan mientras mantengas la cuenta. Al eliminarla se borran del teléfono y, si hubiera copia en la nube, también de allí.',
      'Los archivos exportados se crean en una carpeta temporal privada y se borran al cerrar la hoja de compartir.',
    ],
  },
];

export const TERMS_OF_USE: LegalSection[] = [
  {
    title: 'Qué es NeuroTrack',
    paragraphs: [
      'NeuroTrack es una herramienta de registro y seguimiento personal de dolores de cabeza. No es un dispositivo médico y no reemplaza la evaluación, diagnóstico ni tratamiento de un profesional de salud.',
    ],
  },
  {
    title: 'Uso de la información',
    paragraphs: [
      'Las estadísticas y los patrones describen únicamente lo que registraste. Una asociación estadística no demuestra que un factor cause tus episodios.',
      'El tipo de episodio es la categoría que eliges tú («episodio registrado como migraña por el usuario»), no un diagnóstico.',
      'No uses la app para decidir iniciar, suspender o cambiar un medicamento: consulta siempre a un profesional de salud.',
    ],
  },
  {
    title: 'Señales de alarma',
    paragraphs: [
      'Los avisos de señales de alarma se basan en reglas simples sobre lo que registras y pueden no detectar todas las situaciones de riesgo. Ante síntomas graves o repentinos, busca atención médica inmediata aunque la app no muestre ningún aviso.',
    ],
  },
  {
    title: 'Tu cuenta',
    paragraphs: [
      'Eres responsable de proteger el acceso a tu teléfono y a tu cuenta. Te recomendamos activar el bloqueo con Face ID, huella o código.',
      'Puedes dejar de usar la app y eliminar tu cuenta en cualquier momento.',
    ],
  },
];
