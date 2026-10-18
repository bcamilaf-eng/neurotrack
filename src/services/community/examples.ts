/**
 * Temas de ejemplo del modo local de prueba. Cumplen las normas de la comunidad:
 * experiencias personales, sin recomendar medicamentos ni dosis.
 */
import type { CommunityCategory } from '../../domain/community';

export const EXAMPLE_AUTHOR_ID = 'ejemplo';

export interface ExampleThread {
  alias: string;
  category: CommunityCategory;
  title: string;
  body: string;
  hoursAgo: number;
  replies: { alias: string; body: string; hoursAgo: number }[];
}

export const EXAMPLE_THREADS: ExampleThread[] = [
  {
    alias: 'Lucía (ejemplo)',
    category: 'tips',
    title: 'Lo que me ayuda cuando empieza el aura',
    body:
      'Cuando noto el aura, lo primero que hago es avisar a alguien de confianza y buscar un sitio oscuro y en silencio. ' +
      'Me pongo algo frío en la nuca y apago notificaciones del móvil. No a todos les sirve lo mismo, pero a mí me ' +
      'da una sensación de control. ¿Qué hacéis vosotros en esos primeros minutos?',
    hoursAgo: 5,
    replies: [
      { alias: 'Marcos (ejemplo)', body: 'Yo llevo siempre unas gafas de sol en la mochila, me salvan con las luces fuertes.', hoursAgo: 4 },
      { alias: 'Ana R (ejemplo)', body: 'Lo de silenciar el móvil lo voy a probar. Gracias por compartirlo.', hoursAgo: 2 },
    ],
  },
  {
    alias: 'Paula (ejemplo)',
    category: 'experiences',
    title: 'Llevar un registro me ayudó a hablar con mi neuróloga',
    body:
      'Durante años llegaba a la consulta sin saber cuántas crisis había tenido. Desde que anoto cada episodio, el ' +
      'sueño y lo que como, llevo un resumen y la conversación es mucho más concreta. Ahora veo que dormir poco ' +
      'coincide con muchos de mis episodios, aunque sé que eso no significa que sea la causa.',
    hoursAgo: 30,
    replies: [{ alias: 'Lucía (ejemplo)', body: 'Me pasa igual con el sueño. Ver los datos juntos ayuda muchísimo.', hoursAgo: 26 }],
  },
  {
    alias: 'Javi (ejemplo)',
    category: 'questions',
    title: '¿Cómo explicáis la migraña en el trabajo?',
    body:
      'Empiezo en un trabajo nuevo y no sé cómo contar que a veces necesito parar o irme antes. ¿Lo contáis desde ' +
      'el principio? ¿Cómo lo explicáis para que no suene a «solo un dolor de cabeza»?',
    hoursAgo: 52,
    replies: [
      { alias: 'Paula (ejemplo)', body: 'Yo lo conté con naturalidad y expliqué qué necesito durante una crisis. Ayudó mucho.', hoursAgo: 50 },
    ],
  },
  {
    alias: 'Ana R (ejemplo)',
    category: 'support',
    title: 'Semana difícil, necesitaba contarlo',
    body:
      'Llevo tres días con crisis y me siento muy cansada y un poco sola. Sé que pasará, pero hoy cuesta. ' +
      'Gracias por este espacio, leer que a otros les pasa lo mismo ya ayuda.',
    hoursAgo: 75,
    replies: [
      { alias: 'Marcos (ejemplo)', body: 'Mucho ánimo. No estás sola, aquí estamos para leerte cuando lo necesites.', hoursAgo: 70 },
      { alias: 'Javi (ejemplo)', body: 'Un abrazo. Descansa sin culpa, cuidarte también es hacer algo.', hoursAgo: 68 },
    ],
  },
];
