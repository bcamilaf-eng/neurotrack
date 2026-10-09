import { ValidationError } from '../../src/domain/errors';
import { csvCell, escapeHtml, reportToCsv, reportToHtml } from '../../src/domain/report/formats';
import { buildReport, type ReportEpisode, type ReportInput, reportRange } from '../../src/domain/report/report';
import { defaultReminders, parseReminders, REMINDER_BODY } from '../../src/domain/reminders';
import { NOW } from '../fixtures/factories';

const ep = (id: string, startedAt: string, overrides: Partial<ReportEpisode> = {}): ReportEpisode => ({
  id,
  date: startedAt.slice(0, 10),
  startedAt,
  endedAt: new Date(Date.parse(startedAt) + 3 * 3600_000).toISOString(),
  ongoing: false,
  intensity: 6,
  maxIntensity: 7,
  durationMin: 180,
  type: 'migraine',
  symptoms: [{ type: 'nausea' }, { type: 'photophobia' }],
  triggers: [{ type: 'stress' }],
  ...overrides,
});

const input = (overrides: Partial<ReportInput> = {}): ReportInput => ({
  range: { from: '2026-09-07', to: '2026-10-06' },
  generatedAt: NOW,
  patientName: 'Ana',
  episodes: [
    ep('a', '2026-09-30T08:00:00.000Z'),
    ep('b', '2026-10-05T17:00:00.000Z', { maxIntensity: 9, triggers: [{ type: 'unidentified' }], symptoms: [] }),
    ep('old', '2026-09-01T08:00:00.000Z'),
  ],
  medications: [
    { id: 'm1', episodeId: 'b', date: '2026-10-05', takenAt: '2026-10-05T18:00:00.000Z', name: 'Ibuprofeno', doseValue: 400, doseUnit: 'mg', response: 'partial', minutesToRelief: 45 },
    { id: 'm2', date: '2026-10-01', takenAt: '2026-10-01T09:00:00.000Z', name: 'Paracetamol', doseValue: 1, doseUnit: 'g' },
  ],
  alarms: [{ episodeId: 'b', signal: 'sudden_severe' }],
  patterns: {
    episodes: 2,
    enoughData: false,
    insights: [
      { id: 'count', kind: 'recorded', title: 'Episodios del período', text: 'Durante el período seleccionado se registraron 2 episodios.' },
      { id: 'sleep', kind: 'association', title: 'Sueño y episodios', text: 'Asociación de prueba.' },
    ],
  },
  patternsConsented: false,
  ...overrides,
});

describe('período del informe', () => {
  it('usa los períodos fijos o valida el personalizado', () => {
    expect(reportRange('7d', NOW)).toEqual({ from: '2026-09-30', to: '2026-10-06' });
    expect(reportRange('custom', NOW, { from: '2026-08-01', to: '2026-08-31' })).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    const fields = (custom: { from: string; to: string }) => {
      try {
        reportRange('custom', NOW, custom);
      } catch (e) {
        return (e as ValidationError).fields;
      }
      return {};
    };
    expect(fields({ from: '2026-09-10', to: '2026-09-01' }).from).toMatch(/anterior/);
    expect(fields({ from: '2026-09-01', to: '2026-10-07' }).to).toMatch(/futura/);
    expect(fields({ from: '2025-01-01', to: '2026-10-01' }).from).toMatch(/12 meses/);
  });
});

describe('informe', () => {
  it('resume el período y arma la tabla con tratamiento y respuesta', () => {
    const report = buildReport(input());
    expect(report.summary).toMatchObject({ episodes: 2, avgIntensity: '8/10', avgDuration: '3 h', days: 30 });
    expect(report.rows.map((r) => r.episodeId)).toEqual(['a', 'b']);
    expect(report.rows[1]).toMatchObject({
      date: '05/10/2026',
      time: '17:00',
      intensity: '9/10',
      symptoms: '—',
      factors: 'No identificado',
      treatment: 'Ibuprofeno 400 mg (18:00)',
      response: 'Alivio parcial en 45 min',
      type: 'Migraña',
    });
    expect(report.rows[1].alarms).toMatch(/menos de un minuto/);
    expect(report.unlinkedMedication).toEqual(['01/10/2026 09:00 · Paracetamol 1 g · Respuesta sin registrar']);
  });

  it('sin consentimiento de patrones solo incluye datos registrados', () => {
    const titles = (r: ReturnType<typeof buildReport>) => r.observations.map((o) => o.label);
    expect(titles(buildReport(input()))).not.toContain('Asociación estadística');
    expect(titles(buildReport(input({ patternsConsented: true })))).toContain('Asociación estadística');
    expect(buildReport(input()).observations.map((o) => o.title)).toEqual(
      expect.arrayContaining(['Medicación registrada', 'Señales que la app pidió valorar']),
    );
  });

  it('el texto no contiene lenguaje diagnóstico ni de causa', () => {
    const html = reportToHtml(buildReport(input({ patternsConsented: true })));
    expect(html).not.toMatch(/diagnóstico de|padeces|causado por|causa tus/i);
    expect(html).toContain('No es un diagnóstico');
    expect(html).toContain('no recomienda iniciar, suspender ni cambiar');
  });
});

describe('formatos', () => {
  it('CSV con separador «;», comillas y sin fórmulas', () => {
    expect(csvCell('hola')).toBe('hola');
    expect(csvCell('a; b')).toBe('"a; b"');
    expect(csvCell('dice "no"')).toBe('"dice ""no"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    const csv = reportToCsv(buildReport(input()));
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines[0]).toBe(
      'Fecha;Hora;Duración;Intensidad;Síntomas;Posibles factores;Tratamiento;Respuesta;Tipo registrado por el paciente;Señales para evaluación médica',
    );
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('30/09/2026;08:00;3 h;7/10;"Náuseas, Fotofobia"');
  });

  it('HTML escapa lo que escribe el usuario', () => {
    expect(escapeHtml('<b>"x" & \'y\'</b>')).toBe('&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
    const html = reportToHtml(buildReport(input({ patientName: '<script>alert(1)</script>' })));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('ajustes de recordatorios', () => {
  it('rellena los que faltan y descarta valores no válidos', () => {
    const parsed = parseReminders({ hydration: { enabled: true, time: '10:30' }, daily: { enabled: true, time: '25:99' } });
    expect(parsed.hydration).toEqual({ enabled: true, time: '10:30' });
    expect(parsed.daily).toEqual(defaultReminders().daily);
    expect(parsed.followup).toEqual({ enabled: false, time: '19:00', weekday: 2 });
    expect(parseReminders('basura')).toEqual(defaultReminders());
    expect(REMINDER_BODY).toBe('Tienes un registro pendiente');
  });
});
