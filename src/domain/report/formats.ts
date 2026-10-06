/**
 * Formatos de exportación del informe: CSV (para hoja de cálculo) y HTML (que se
 * convierte en PDF). No añaden datos: solo dan forma a `Report`.
 */
import type { Report } from './report';
import { REPORT_COLUMNS } from './report';

// ── CSV ──────────────────────────────────────────────────────────────────────

/** Separador «;»: es el que espera Excel con configuración regional en español. */
export const CSV_SEPARATOR = ';';

/**
 * Celda CSV segura: entre comillas si hace falta y sin fórmulas (un texto que empieza
 * por `=`, `+`, `-` o `@` se prefija con un apóstrofo para que la hoja no lo ejecute).
 */
export function csvCell(value: string): string {
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[";\n\r,]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function reportToCsv(report: Report): string {
  const header = [...REPORT_COLUMNS, 'Tipo registrado por el paciente', 'Señales para evaluación médica'];
  const lines = [header, ...report.rows.map((r) => [r.date, r.time, r.duration, r.intensity, r.symptoms, r.factors, r.treatment, r.response, r.type, r.alarms])];
  // BOM para que Excel reconozca UTF-8 (tildes y eñes).
  return '﻿' + lines.map((cells) => cells.map(csvCell).join(CSV_SEPARATOR)).join('\r\n') + '\r\n';
}

// ── HTML / PDF ───────────────────────────────────────────────────────────────

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const W = 640;
const H = 160;
const PAD = 24;

/** Barras con el número de episodios por tramo. */
export function barChartSvg(title: string, items: { label: string; value: number }[]): string {
  const max = Math.max(1, ...items.map((i) => i.value));
  const slot = (W - PAD * 2) / Math.max(1, items.length);
  const bar = Math.max(4, slot * 0.6);
  const every = Math.ceil(items.length / 12);
  const bars = items
    .map((item, i) => {
      const h = ((H - PAD * 2) * item.value) / max;
      const x = PAD + i * slot + (slot - bar) / 2;
      const y = H - PAD - h;
      const value = item.value ? `<text x="${x + bar / 2}" y="${y - 3}" class="v">${item.value}</text>` : '';
      const label = i % every === 0 ? `<text x="${x + bar / 2}" y="${H - 8}" class="l">${escapeHtml(item.label)}</text>` : '';
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bar.toFixed(1)}" height="${h.toFixed(1)}" rx="2" />${value}${label}`;
    })
    .join('');
  return `<figure><figcaption>${escapeHtml(title)}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(title)}"><line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" class="axis"/>${bars}</svg></figure>`;
}

/** Línea de intensidad media por tramo (0–10). Los tramos sin episodios cortan la línea. */
export function lineChartSvg(title: string, items: { label: string; value: number | null }[]): string {
  const slot = (W - PAD * 2) / Math.max(1, items.length);
  const point = (i: number, v: number) => [PAD + i * slot + slot / 2, H - PAD - ((H - PAD * 2) * v) / 10] as const;
  const segments: string[] = [];
  let current: string[] = [];
  items.forEach((item, i) => {
    if (item.value === null) {
      if (current.length) segments.push(current.join(' '));
      current = [];
      return;
    }
    const [x, y] = point(i, item.value);
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (current.length) segments.push(current.join(' '));
  const every = Math.ceil(items.length / 12);
  const dots = items
    .map((item, i) => {
      const label = i % every === 0 ? `<text x="${point(i, 0)[0]}" y="${H - 8}" class="l">${escapeHtml(item.label)}</text>` : '';
      if (item.value === null) return label;
      const [x, y] = point(i, item.value);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" /><text x="${x.toFixed(1)}" y="${(y - 6).toFixed(1)}" class="v">${item.value.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</text>${label}`;
    })
    .join('');
  const lines = segments.map((points) => `<polyline points="${points}" class="line" />`).join('');
  return `<figure><figcaption>${escapeHtml(title)}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(title)}"><line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" class="axis"/>${lines}${dots}</svg></figure>`;
}

const STYLE = `
  @page { margin: 16mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Roboto, Arial, sans-serif; color: #1b2330; font-size: 10.5pt; line-height: 1.4; }
  h1 { font-size: 17pt; margin: 0 0 4px; color: #1f4fbf; }
  h2 { font-size: 12.5pt; margin: 18px 0 6px; border-bottom: 1px solid #d5dbe6; padding-bottom: 3px; }
  .muted { color: #5b6577; }
  .note { background: #eef3fd; border-left: 3px solid #1f4fbf; padding: 8px 10px; margin: 10px 0; font-size: 9.5pt; }
  .metrics { display: flex; gap: 12px; }
  .metric { flex: 1; border: 1px solid #d5dbe6; border-radius: 6px; padding: 8px; }
  .metric b { display: block; font-size: 15pt; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  th, td { border: 1px solid #d5dbe6; padding: 4px 5px; text-align: left; vertical-align: top; }
  th { background: #f2f5fa; }
  tr { page-break-inside: avoid; }
  .alarm { color: #a32020; font-weight: 600; }
  .tag { display: inline-block; font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; color: #5b6577; }
  figure { margin: 8px 0; page-break-inside: avoid; }
  figcaption { font-weight: 600; margin-bottom: 4px; }
  svg { width: 100%; height: auto; }
  svg rect, svg circle { fill: #1f4fbf; }
  svg .line { fill: none; stroke: #1f4fbf; stroke-width: 2; }
  svg .axis { stroke: #9aa4b5; }
  svg text { font-size: 10px; text-anchor: middle; fill: #5b6577; }
  svg .v { fill: #1b2330; font-weight: 600; }
  ul { margin: 4px 0; padding-left: 18px; }
`;

export function reportToHtml(report: Report): string {
  const e = escapeHtml;
  const s = report.summary;
  const metric = (value: string | number, label: string) => `<div class="metric"><b>${e(String(value))}</b><span class="muted">${e(label)}</span></div>`;
  const rows = report.rows
    .map(
      (r) =>
        `<tr><td>${e(r.date)}<br/><span class="muted">${e(r.type)}</span>${r.alarms ? `<br/><span class="alarm">Señal: ${e(r.alarms)}</span>` : ''}</td>` +
        `<td>${e(r.time)}</td><td>${e(r.duration)}</td><td>${e(r.intensity)}</td><td>${e(r.symptoms)}</td>` +
        `<td>${e(r.factors)}</td><td>${e(r.treatment)}</td><td>${e(r.response)}</td></tr>`,
    )
    .join('');
  const byName = report.medication.byName
    .map((m) => `<tr><td>${e(m.name)}</td><td>${m.doses}</td><td>${m.withResponse}</td><td>${m.relief}</td></tr>`)
    .join('');
  const observations = report.observations
    .map((o) => `<li><span class="tag">${e(o.label)}</span> · <b>${e(o.title)}.</b> ${e(o.text)}</li>`)
    .join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${e(report.title)}</title><style>${STYLE}</style></head><body>
<h1>${e(report.title)}</h1>
${report.patientName ? `<div>Paciente: <b>${e(report.patientName)}</b></div>` : ''}
<div>${e(report.periodLabel)}</div>
<div class="muted">${e(report.generatedLabel)}</div>
<div class="note">${e(report.disclaimer)}</div>

<h2>Resumen</h2>
<div class="metrics">
${metric(s.episodes, 'Episodios')}${metric(s.avgIntensity, 'Intensidad media')}${metric(s.avgDuration, 'Duración media')}${metric(`${s.painDays} de ${s.days}`, 'Días con dolor')}
</div>

<h2>Gráficos</h2>
${barChartSvg('Episodios registrados por tramo', report.buckets.map((b) => ({ label: b.label, value: b.episodes })))}
${lineChartSvg('Intensidad media por tramo (0–10)', report.buckets.map((b) => ({ label: b.label, value: b.avgIntensity })))}
${barChartSvg('Episodios por intensidad máxima', report.intensityDistribution.map((d) => ({ label: d.label, value: d.count })))}

<h2>Episodios</h2>
${
  report.rows.length
    ? `<table><thead><tr>${REPORT_COLUMNS.map((c) => `<th>${e(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
<p class="muted">El tipo de episodio es el que eligió el paciente al registrarlo, no un diagnóstico.</p>`
    : '<p>No hay episodios registrados en este período.</p>'
}

<h2>Medicación registrada</h2>
${
  report.medication.doses
    ? `<table><thead><tr><th>Medicamento</th><th>Tomas</th><th>Con respuesta anotada</th><th>Con alivio parcial o completo</th></tr></thead><tbody>${byName}</tbody></table>`
    : '<p>No hay tomas registradas en este período.</p>'
}
${report.unlinkedMedication.length ? `<p><b>Tomas sin episodio vinculado</b></p><ul>${report.unlinkedMedication.map((m) => `<li>${e(m)}</li>`).join('')}</ul>` : ''}
<p class="muted">Registro del paciente. NeuroTrack no recomienda iniciar, suspender ni cambiar ningún tratamiento.</p>

<h2>Observaciones</h2>
${observations ? `<ul>${observations}</ul>` : '<p>Sin observaciones para este período.</p>'}
<p class="muted">${e(report.observationsFooter)}</p>
</body></html>`;
}
