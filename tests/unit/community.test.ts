import {
  aliasSchema,
  containsContactData,
  joinCommunitySchema,
  postInputSchema,
  replyInputSchema,
  reportInputSchema,
} from '../../src/domain/community';
import { fieldErrors } from '../../src/domain/validation/common';

const errorsOf = (result: { success: boolean; error?: any }) => (result.success ? {} : fieldErrors(result.error));

describe('datos personales en la comunidad', () => {
  it.each([
    'escríbeme a ana.perez@gmail.com',
    'mi número es +34 612 345 678',
    'llámame al (011) 4555-1234',
    'whatsapp 612345678',
  ])('detecta emails y teléfonos: %s', (text) => {
    expect(containsContactData(text)).toBe(true);
  });

  it.each([
    'Dormí 7 horas y me ayudó',
    'Tuve 3 crisis en 2 semanas',
    'Desde 2019 llevo un registro',
    'La crisis del 2026-10-06 duró 12 horas',
    'Empezó el 06-10-2026 y otra vez el 6.10.26',
  ])('no confunde números normales con teléfonos: %s', (text) => {
    expect(containsContactData(text)).toBe(false);
  });
});

describe('seudónimo', () => {
  it('acepta seudónimos sencillos', () => {
    expect(aliasSchema.safeParse('Luna_32').success).toBe(true);
    expect(aliasSchema.safeParse('María José').success).toBe(true);
  });

  it('rechaza seudónimos cortos, con email o con símbolos', () => {
    expect(aliasSchema.safeParse('ab').success).toBe(false);
    expect(aliasSchema.safeParse('ana@correo.com').success).toBe(false);
    expect(aliasSchema.safeParse('<script>').success).toBe(false);
  });

  it('exige aceptar las normas', () => {
    expect(errorsOf(joinCommunitySchema.safeParse({ alias: 'Luna', acceptedRules: false }))).toHaveProperty('acceptedRules');
    expect(joinCommunitySchema.safeParse({ alias: 'Luna', acceptedRules: true }).success).toBe(true);
  });
});

describe('temas y respuestas', () => {
  const valid = { category: 'tips', title: 'Lo que me ayuda', body: 'Buscar un lugar oscuro y tranquilo.' };

  it('acepta un tema válido y recorta espacios', () => {
    const result = postInputSchema.safeParse({ ...valid, title: '  Lo que me ayuda  ' });
    expect(result.success).toBe(true);
    expect(result.data!.title).toBe('Lo que me ayuda');
  });

  it('exige categoría, título y texto con un mínimo', () => {
    const errors = errorsOf(postInputSchema.safeParse({ category: 'otra', title: 'Hola', body: 'corto' }));
    expect(Object.keys(errors).sort()).toEqual(['body', 'category', 'title']);
  });

  it('no deja publicar datos de contacto', () => {
    const errors = errorsOf(postInputSchema.safeParse({ ...valid, body: 'Escríbeme a ana@correo.com y te cuento' }));
    expect(errors.body).toMatch(/privacidad/);
    expect(replyInputSchema.safeParse({ body: 'Llámame al 612 345 678' }).success).toBe(false);
  });

  it('solo admite motivos de reporte conocidos', () => {
    expect(reportInputSchema.safeParse({ reason: 'medical_advice' }).success).toBe(true);
    expect(reportInputSchema.safeParse({ reason: 'no_me_gusta' }).success).toBe(false);
  });
});
