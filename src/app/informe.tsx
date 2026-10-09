/**
 * «Generar informe» (§17): elige el período, revisa la vista previa y exporta en PDF o
 * CSV con la hoja de compartir del sistema. Nada sale del teléfono sin ese paso.
 */
import { addDays, format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ValidationError } from '../domain/errors';
import { reportToCsv, reportToHtml } from '../domain/report/formats';
import { type Report, REPORT_PERIODS, reportFileName, type ReportPeriod, reportRange } from '../domain/report/report';
import { sharePdf, shareCsv } from '../services/export/fileExport';
import { useSession } from '../state/sessionStore';
import { AppText, Banner, Button, Card, DateTimeField, Disclaimer, OptionGroup, Screen } from '../ui/components';
import { loadReport } from '../ui/features/report/loadReport';
import { spacing } from '../ui/theme';
import { clock } from '../utils/clock';

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

export default function ReportScreen() {
  const user = useSession((s) => s.user);
  const [period, setPeriod] = useState<ReportPeriod>('30d');
  const [custom, setCustom] = useState(() => {
    const now = clock.now();
    return { from: format(addDays(now, -29), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
  });
  const [loaded, setLoaded] = useState<{ key: string; report: Report | null } | null>(null);
  const [message, setMessage] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);

  const { range, errors } = useMemo(() => {
    try {
      return { range: reportRange(period, clock.now(), custom), errors: {} as Record<string, string> };
    } catch (error) {
      if (error instanceof ValidationError) return { range: null, errors: error.fields };
      throw error;
    }
  }, [period, custom]);
  const key = range ? `${range.from}_${range.to}` : null;

  useEffect(() => {
    if (!user || !range) return;
    let active = true;
    const id = `${range.from}_${range.to}`;
    loadReport(user.id, range)
      .then((report) => active && setLoaded({ key: id, report }))
      .catch(() => active && setLoaded({ key: id, report: null }));
    return () => {
      active = false;
    };
  }, [user, range]);

  const current = loaded && loaded.key === key ? loaded : null;
  const report = current?.report ?? null;

  const exportAs = async (kind: 'pdf' | 'csv') => {
    if (!report) return;
    setMessage(null);
    setBusy(kind);
    try {
      const name = reportFileName(report.range);
      if (kind === 'pdf') await sharePdf(reportToHtml(report), name);
      else await shareCsv(reportToCsv(report), name);
      setMessage({ tone: 'info', text: 'Listo. El archivo temporal se borró del teléfono.' });
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : 'No se pudo exportar el informe.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen edges={['left', 'right']}>
      <AppText muted>
        Un resumen de tus registros para llevar a la consulta. Revisa la vista previa antes de compartirlo.
      </AppText>
      <OptionGroup label="Período" options={REPORT_PERIODS} value={period} onChange={(v) => v && setPeriod(v)} />
      {period === 'custom' ? (
        <>
          <DateTimeField
            label="Desde"
            mode="date"
            value={custom.from}
            onChange={(from) => setCustom((c) => ({ ...c, from }))}
            maximumDate={clock.now()}
            error={errors.from}
            testID="report-from"
          />
          <DateTimeField
            label="Hasta"
            mode="date"
            value={custom.to}
            onChange={(to) => setCustom((c) => ({ ...c, to }))}
            maximumDate={clock.now()}
            error={errors.to}
            testID="report-to"
          />
        </>
      ) : null}

      {message ? <Banner tone={message.tone} message={message.text} /> : null}
      {current && !report ? <Banner tone="danger" message="No se pudo preparar el informe." /> : null}

      {report ? (
        <>
          <Card>
            <AppText variant="label">{report.periodLabel}</AppText>
            <View style={styles.metrics}>
              <Metric value={String(report.summary.episodes)} label="Episodios" />
              <Metric value={report.summary.avgIntensity} label="Intensidad media" />
            </View>
            <View style={styles.metrics}>
              <Metric value={report.summary.avgDuration} label="Duración media" />
              <Metric value={`${report.summary.painDays} de ${report.summary.days}`} label="Días con dolor" />
            </View>
          </Card>

          <View style={styles.section}>
            <AppText variant="heading">Episodios ({report.rows.length})</AppText>
            {report.rows.length === 0 ? <AppText muted>No hay episodios registrados en este período.</AppText> : null}
            {report.rows.slice(0, 5).map((r) => (
              <Card key={r.episodeId}>
                <AppText variant="label">
                  {r.date} · {r.time} · {r.intensity}
                </AppText>
                <AppText muted>
                  {r.type} · {r.duration}
                </AppText>
                <AppText variant="caption">Síntomas: {r.symptoms}</AppText>
                <AppText variant="caption">Tratamiento: {r.treatment}</AppText>
              </Card>
            ))}
            {report.rows.length > 5 ? (
              <AppText variant="caption" muted>
                Y {report.rows.length - 5} más en el archivo exportado.
              </AppText>
            ) : null}
          </View>

          {report.observations.length ? (
            <View style={styles.section}>
              <AppText variant="heading">Observaciones</AppText>
              {report.observations.map((o) => (
                <View key={`${o.title}-${o.text}`} style={styles.observation}>
                  <AppText variant="caption" muted>
                    {o.label.toUpperCase()}
                  </AppText>
                  <AppText>{o.text}</AppText>
                </View>
              ))}
            </View>
          ) : null}

          <Banner
            tone="info"
            title="Tus datos, tu decisión"
            message="El archivo se crea en este teléfono y solo sale de él si eliges dónde compartirlo. Al cerrar la hoja de compartir se borra."
          />
          <Button label="Exportar PDF" onPress={() => exportAs('pdf')} loading={busy === 'pdf'} disabled={!!busy} testID="report-pdf" />
          <Button
            label="Exportar CSV (hoja de cálculo)"
            variant="secondary"
            onPress={() => exportAs('csv')}
            loading={busy === 'csv'}
            disabled={!!busy}
            testID="report-csv"
          />
        </>
      ) : range && !current ? (
        <AppText muted>Preparando la vista previa…</AppText>
      ) : null}
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', gap: spacing.lg },
  metric: { flex: 1, gap: 2 },
  section: { gap: spacing.sm },
  observation: { gap: 2 },
});
