/**
 * Formulario de una toma de medicación: qué, cuánto y cuándo, si fue indicada por un
 * profesional y, cuando se sepa, cómo respondiste. La respuesta se puede completar más tarde.
 */
import { addDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DOSE_UNITS, labelOf, MEDICATION_RESPONSES } from '../../../domain/catalogs';
import type { MedicationData, MedicationInput } from '../../../domain/entities/medication';
import { ValidationError } from '../../../domain/errors';
import {
  type MedicationDraft,
  medicationDraftToInput,
  medicationFieldErrors,
} from '../../../domain/usecases/medicationDraft';
import type { EpisodeRecord } from '../../../data/repositories/episodeRepository';
import { MEDICATION_NOTICE } from '../../../i18n/es';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { isIsoDate } from '../../../utils/time';
import {
  AppText,
  Banner,
  Button,
  DateTimeField,
  OptionGroup,
  Screen,
  SwitchRow,
  TextField,
} from '../../components';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { MIN_TOUCH, radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';

type Recent = Pick<MedicationData, 'name' | 'doseValue' | 'doseUnit'>;

const NO_EPISODE = 'none';

export interface MedicationFormProps {
  initialDraft: MedicationDraft;
  submitLabel: string;
  onSave: (input: MedicationInput) => Promise<void>;
  onSaved: () => void;
  onDelete?: () => void;
}

const episodeLabel = (e: EpisodeRecord) =>
  `${format(parseISO(e.startedAt), "EEE d, HH:mm", { locale: es })}${e.ongoing ? ' (en curso)' : ''} · ${e.maxIntensity}/10`;

export function MedicationForm({ initialDraft, submitLabel, onSave, onSaved, onDelete }: MedicationFormProps) {
  const { colors } = useAppTheme();
  const user = useSession((s) => s.user);
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeRecord[]>([]);
  const dirty = useRef(false);
  const saved = useRef(false);
  useUnsavedChangesGuard(dirty, saved, 'Tienes cambios sin guardar en esta toma.');

  useEffect(() => {
    if (!user) return;
    getRepositories()
      .then((repos) => repos.medications.recentNames(user.id))
      .then(setRecent)
      .catch(() => undefined);
  }, [user]);

  // Episodios del día de la toma y del anterior, para poder vincularla.
  useEffect(() => {
    if (!user || !isIsoDate(draft.date)) return;
    const from = format(addDays(parseISO(draft.date), -1), 'yyyy-MM-dd');
    getRepositories()
      .then((repos) => repos.episodes.listBetween(user.id, from, draft.date))
      .then((list) => setEpisodes([...list].sort((a, b) => b.startedAt.localeCompare(a.startedAt))))
      .catch(() => undefined);
  }, [user, draft.date]);

  const set = <K extends keyof MedicationDraft>(key: K, value: MedicationDraft[K]) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const { [key as string]: _drop, ...rest } = e;
      return rest;
    });
  };

  const pickRecent = (r: Recent) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, name: r.name, doseValue: String(r.doseValue).replace('.', ','), doseUnit: r.doseUnit }));
    setErrors({});
  };

  const save = async () => {
    setFormError(null);
    setSaving(true);
    try {
      await onSave(medicationDraftToInput(draft));
      saved.current = true;
      onSaved();
    } catch (error) {
      if (error instanceof ValidationError) setErrors(medicationFieldErrors(error.fields));
      else setFormError(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const linkOptions = [
    { code: NO_EPISODE, label: 'Ninguno' },
    ...episodes.map((e) => ({ code: e.id, label: episodeLabel(e) })),
  ];
  const linkedMissing = draft.episodeId && !episodes.some((e) => e.id === draft.episodeId);

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <Button label={submitLabel} onPress={save} loading={saving} testID="medication-save" />
          {onDelete ? <Button label="Eliminar toma" variant="danger" onPress={onDelete} disabled={saving} /> : null}
        </>
      }
    >
      <Banner tone="info" message={MEDICATION_NOTICE} />
      {formError ? <Banner tone="danger" message={formError} /> : null}

      {recent.length > 0 && !draft.name ? (
        <View style={styles.section}>
          <AppText variant="label">Usados antes</AppText>
          <View style={styles.chips}>
            {recent.map((r) => (
              <Pressable
                key={r.name}
                accessibilityRole="button"
                accessibilityLabel={`Usar ${r.name}, ${r.doseValue} ${labelOf(DOSE_UNITS, r.doseUnit)}`}
                onPress={() => pickRecent(r)}
                style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <AppText variant="label">
                  {r.name} · {String(r.doseValue).replace('.', ',')} {labelOf(DOSE_UNITS, r.doseUnit)}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <TextField
        label="Medicamento"
        value={draft.name}
        onChangeText={(v) => set('name', v)}
        error={errors.name}
        placeholder="Nombre comercial o principio activo"
        autoCapitalize="sentences"
        testID="medication-name"
      />
      <TextField
        label="Dosis"
        value={draft.doseValue}
        onChangeText={(v) => set('doseValue', v.replace(/[^0-9.,]/g, ''))}
        keyboardType="decimal-pad"
        error={errors.doseValue}
        testID="medication-dose"
      />
      <OptionGroup label="Unidad" options={DOSE_UNITS} value={draft.doseUnit} onChange={(v) => set('doseUnit', v)} error={errors.doseUnit} />
      <DateTimeField label="Fecha" mode="date" value={draft.date} onChange={(v) => set('date', v)} maximumDate={new Date()} error={errors.date} />
      <DateTimeField label="Hora de la toma" mode="time" value={draft.time} onChange={(v) => set('time', v)} error={errors.time} />
      <TextField label="Motivo (opcional)" value={draft.reason} onChangeText={(v) => set('reason', v)} error={errors.reason} placeholder="Ej.: dolor 7/10 al despertar" />
      <SwitchRow
        label="Indicado por un profesional de salud"
        value={draft.prescribedByProfessional}
        onChange={(v) => set('prescribedByProfessional', v)}
      />

      <OptionGroup
        label="¿Corresponde a un episodio?"
        options={linkOptions}
        value={draft.episodeId ?? NO_EPISODE}
        onChange={(v) => set('episodeId', !v || v === NO_EPISODE ? undefined : v)}
        error={errors.episodeId}
      />
      {linkedMissing ? (
        <AppText variant="caption" muted>
          Está vinculada a un episodio de otro día. Elige «Ninguno» para desvincularla.
        </AppText>
      ) : null}

      <View style={styles.section}>
        <AppText variant="heading">Respuesta</AppText>
        <AppText variant="caption" muted>
          Puedes completarla más tarde, cuando sepas cómo te sentó.
        </AppText>
      </View>
      <OptionGroup
        label="¿Cómo respondiste?"
        options={MEDICATION_RESPONSES}
        value={draft.response}
        onChange={(v) => {
          set('response', v);
          if (v === 'none') set('minutesToRelief', '');
        }}
        allowClear
        error={errors.response}
      />
      {draft.response && draft.response !== 'none' ? (
        <TextField
          label="Minutos hasta notar alivio"
          value={draft.minutesToRelief}
          onChangeText={(v) => set('minutesToRelief', v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          error={errors.minutesToRelief}
          testID="medication-relief"
        />
      ) : null}
      <TextField
        label="Efectos adversos (opcional)"
        value={draft.adverseEffects}
        onChangeText={(v) => set('adverseEffects', v)}
        error={errors.adverseEffects}
        multiline
        placeholder="Ej.: somnolencia, náuseas"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: MIN_TOUCH, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
});
