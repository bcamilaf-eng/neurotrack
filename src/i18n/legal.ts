/**
 * Textos legales completos. Son un BORRADOR redactado para el producto y deben pasar
 * revisión legal antes de publicar (ver docs/despliegue.md).
 */
export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export const LEGAL_VERSION = '2026-10-25';
export const LEGAL_DRAFT_NOTICE = 'Borrador pendiente de revisión legal antes de la publicación.';

export const PRIVACY_POLICY: LegalSection[] = [
  {
    title: 'Qué datos tratamos',
    paragraphs: [
      'Para crear la cuenta: tu email y una contraseña. La contraseña nunca se guarda en claro. Te enviamos un email para confirmar que la dirección es tuya y, si lo pides, para recuperar la contraseña.',
      'Datos de salud que tú registras: episodios de dolor de cabeza, síntomas, posibles desencadenantes, medicación, sueño, hidratación, alimentación, estado del día, días de menstruación y las señales de alarma que la app detecta en esos registros.',
      'Perfil opcional: nombre, fecha de nacimiento, sexo, peso, altura, país, ocupación, diagnósticos de cefalea que te hayan indicado, otras enfermedades diagnosticadas, embarazo o posparto, notas y un contacto de emergencia. Ninguno es obligatorio y puedes dejarlo para más tarde.',
      'Datos importados de Health Connect (Android), solo si lo activas: peso, altura, horas de sueño, agua tomada y días de menstruación de los últimos 90 días.',
      'Comunidad, solo si te unes: tu seudónimo, los temas y respuestas que publicas y los reportes que envías.',
      'No recogemos ubicación, contactos del teléfono, identificadores publicitarios ni analítica de uso.',
    ],
  },
  {
    title: 'Para qué los usamos',
    paragraphs: [
      'Para mostrarte tus propios registros, estadísticas, calendario, patrones (si los activas), avisos de señales de alarma, recordatorios e informes.',
      'Para gestionar tu cuenta: iniciar sesión, confirmar tu email y recuperar la contraseña.',
      'Para que funcione la comunidad: mostrar lo que publicas con tu seudónimo y ocultar el contenido que varias personas reportan.',
      'La base legal es tu consentimiento explícito para el tratamiento de datos de salud, que puedes retirar en cualquier momento desde Perfil › Privacidad.',
    ],
  },
  {
    title: 'Dónde se guardan',
    paragraphs: [
      'Tus registros de salud y tu perfil se guardan en tu teléfono, en una base de datos cifrada (AES-256 con SQLCipher). La clave se genera en el dispositivo y se guarda en el almacén seguro del sistema (Keychain o Keystore).',
      'Tu cuenta (email y contraseña protegida) y lo que publicas en la comunidad se guardan en servidores de Supabase en Canadá, con cifrado en tránsito y en reposo y acceso controlado por reglas que solo te dejan ver y modificar lo tuyo.',
      'Si vives fuera de Canadá, esto supone una transferencia internacional de datos. Supabase actúa como encargado del tratamiento bajo un acuerdo que le exige protegerlos con garantías equivalentes a las de tu país, y no puede usarlos para fines propios.',
      'Si en el futuro activas la sincronización en la nube, tus registros se copiarán a esos mismos servidores con las mismas protecciones.',
    ],
  },
  {
    title: 'Health Connect',
    paragraphs: [
      'La conexión es opcional y se activa desde Perfil › Datos de salud del teléfono. Tú eliges en Health Connect qué tipos de datos puede leer NeuroTrack y puedes retirar el permiso cuando quieras desde sus ajustes.',
      'NeuroTrack solo lee: no escribe, modifica ni borra nada en Health Connect.',
      'Lo importado se guarda únicamente en tu teléfono, junto al resto de tus registros, y nunca reemplaza lo que anotaste a mano.',
      'El uso de la información recibida de Health Connect se ajusta a la Política de permisos de Health Connect, incluidos sus requisitos de uso limitado: no se usa para publicidad, no se vende y no se comparte con terceros.',
    ],
  },
  {
    title: 'Comunidad',
    paragraphs: [
      'Participas con un seudónimo. Nunca mostramos tu email ni ninguno de tus registros de salud.',
      'Lo que publicas lo pueden leer todas las personas con cuenta en NeuroTrack. No publiques datos que permitan identificarte a ti o a otros: la app rechaza emails y teléfonos, pero revisa lo que escribes.',
      'Puedes borrar tus temas y respuestas cuando quieras. Si varias personas reportan un contenido, se oculta hasta revisarlo.',
      'Lo publicado en la comunidad son experiencias personales, no consejos médicos.',
    ],
  },
  {
    title: 'Con quién se comparten',
    paragraphs: [
      'Tus registros de salud, con nadie, salvo que tú lo decidas: los informes PDF o CSV y la copia completa de tus datos solo salen del teléfono cuando eliges un destino en la hoja de compartir.',
      'Supabase actúa como encargado del tratamiento para alojar tu cuenta y la comunidad, y no puede usar esos datos para fines propios.',
      'Los recordatorios no muestran datos de salud: solo «Tienes un registro pendiente».',
      'No vendemos datos ni los usamos para publicidad.',
    ],
  },
  {
    title: 'Tus derechos',
    paragraphs: [
      'Acceso y portabilidad: Perfil › Privacidad › Exportar todos mis datos.',
      'Rectificación: puedes editar cualquier registro o tu perfil.',
      'Supresión: puedes borrar registros sueltos, todos tus registros, tus publicaciones en la comunidad o la cuenta completa.',
      'Retirada del consentimiento: desde Perfil › Privacidad. Retirar el consentimiento de datos de salud impide seguir usando la app. El permiso de Health Connect se retira desde sus ajustes.',
    ],
  },
  {
    title: 'Conservación',
    paragraphs: [
      'Tus datos se conservan mientras mantengas la cuenta. Al eliminarla se borran del teléfono y de los servidores, incluidos tu seudónimo, tus publicaciones y tus reportes en la comunidad.',
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
    title: 'Comunidad',
    paragraphs: [
      'Para participar debes aceptar las normas de la comunidad: compartir experiencias y no indicaciones médicas, no recomendar medicamentos ni dosis, respetar a las demás personas, no publicar datos personales ni publicidad.',
      'Podemos ocultar o eliminar contenido que incumpla las normas. Eres responsable de lo que publicas.',
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
