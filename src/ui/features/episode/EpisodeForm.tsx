/**
 * Formulario de episodio en 5 pasos. Solo el primero es obligatorio (cuándo y cuánto
 * duele): se puede guardar desde cualquier paso para registrar una crisis en segundos
 * y completar el resto más tarde.
 */
import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  AURA_TYPES,
  EPISODE_TYPES,
  PAIN_LOCATIONS,
  PAIN_QUALITIES,
  SYMPTOMS,
  TRIGGERS,
} from '../../../domain/catalogs';
import { type EpisodeInput, isLongEpisode } from '../../../domain/entities/episode';
import { DuplicateError, ValidationError } from '../../../domain/errors';
import { draftEnd, draftToInput, type EpisodeDraft, toggle, toggleTrigger } from '../../../domain/usecases/episodeDraft';
import { combineDateAndTime, formatDuration, HH_MM, isIsoDate, minutesBetween } from '../../../utils/time';
import {
  AppText,
  Banner,
  Button,
  ChipGroup,
  DateTimeField,
  OptionGroup,
  Screen,
  SwitchRow,
  TextField,
} from '../../components';
import { spacing } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';
import { HeadMap } from './HeadMap';
import { PainScale } from './PainScale';

export const STEPS = ['Cuándo y cuánto', 'Cómo es el dolor', 'Síntomas', 'Desencadenantes', 'Medicación y notas'] as const;

const FIELD_STEP: Record<string, number> = {
  date: 0, startTime: 0, endDate: 0, endTime: 0, startedAt: 0, endedAt: 0, intensity: 0, ongoing: 0,
  type: 1, typeOther: 1, locations: 1, locationOther: 1, qualities: 1, qualityOther: 1,
  symptoms: 2, aura: 2, 'aura.types': 2, 'aura.durationMin': 2,
  triggers: 3,
  notes: 4,
};

/** Los errores del dominio hablan de instantes; el formulario muestra fecha y horas. */
const FIELD_ALIAS: Record<string, string> = { startedAt: 'startTime', endedAt: 'endTime', 'aura.types': 'aura', 'aura.durationMin': 'auraDuration' };

export interface SaveRequest {
  input: EpisodeInput;
  allowOverlap: boolean;
}

export interface EpisodeFormProps {
  initialDraft: EpisodeDraft;
  initialStep?: number;
  submitLabel: string;
  /** Guarda y devuelve el id del episodio. Puede lanzar `DuplicateError`. */
  onSave: (request: SaveRequest) => Promise<string>;
  /** `addMedication`: el usuario quiere registrar ahora la medicación de este episodio. */
  onSaved: (id: string, options: { addMedication: boolean }) => void;
  onOpenExisting?: (id: string) => void;
  /** Muestra la opción de registrar la medicación al guardar (solo en episodios nuevos). */
  offerMedication?: boolean;
}

function previewDuration(draft: EpisodeDraft): string | null {
  if (draft.ongoing || !isIsoDate(draft.date) || !HH_MM.test(draft.startTime) || !HH_MM.test(draft.endTime)) return null;
  const start = combineDateAndTime(draft.date, draft.startTime);
  if (draft.endDate && !isIsoDate(draft.endDate)) return null;
  const end = draftEnd(draft, start);
  const minutes = minutesBetween(start.toISOString(), end.toISOString());
  if (minutes <= 0) return null;
  const crosses = !draft.endDate && end.getDate() !== start.getDate();
  return `Duración: ${formatDuration(minutes)}${crosses ? ' (termina al día siguiente)' : ''}`;
}

function confirm(title: string, message: string, options: { ok: string; cancel?: string; extra?: { label: string; onPress: () => void } }) {
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      ...(options.extra ? [{ text: options.extra.label, onPress: () => { options.extra!.onPress(); resolve(false); } }] : []),
      { text: options.cancel ?? 'Cancelar', style: 'cancel' as const, onPress: () => resolve(false) },
      { text: options.ok, onPress: () => resolve(true) },
    ]);
  });
}

export function EpisodeForm({ initialDraft, initialStep = 0, submitLabel, onSave, onSaved, onOpenExisting, offerMedication }: EpisodeFormProps) {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const [draft, setDraft] = useState(initialDraft);
  const [step, setStep] = useState(initialStep);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addMedication, setAddMedication] = useState(false);
  const dirty = useRef(false);
  const saved = useRef(false);

  // Evita perder un registro a medias al salir de la pantalla.
  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      if (!dirty.current || saved.current) return;
      event.preventDefault();
      Alert.alert('¿Descartar el registro?', 'Tienes cambios sin guardar en este episodio.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
      ]);
    });
  }, [navigation]);

  const set = <K extends keyof EpisodeDraft>(key: K, value: EpisodeDraft[K]) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const { [key as string]: _drop, ...rest } = e;
      return rest;
    });
  };

  const showErrors = (fields: Record<string, string>) => {
    const mapped: Record<string, string> = {};
    for (const [key, message] of Object.entries(fields)) mapped[FIELD_ALIAS[key] ?? key] = message;
    setErrors(mapped);
    const steps = Object.keys(fields).map((k) => FIELD_STEP[k] ?? 0);
    setStep(Math.min(...steps));
  };

  const save = async (allowOverlap = false) => {
    setFormError(null);
    let input: EpisodeInput;
    try {
      input = draftToInput(draft);
    } catch (error) {
      if (error instanceof ValidationError) showErrors(error.fields);
      return;
    }
    if (!allowOverlap && input.endedAt && isLongEpisode({ startedAt: input.startedAt, endedAt: input.endedAt })) {
      const ok = await confirm('Episodio muy largo', 'Este episodio dura más de 72 horas. ¿Los datos son correctos?', {
        ok: 'Sí, guardar',
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const id = await onSave({ input, allowOverlap });
      saved.current = true;
      onSaved(id, { addMedication });
    } catch (error) {
      if (error instanceof ValidationError) showErrors(error.fields);
      else if (error instanceof DuplicateError) {
        const ok = await confirm('Posible registro duplicado', error.message, {
          ok: 'Guardar igualmente',
          extra: onOpenExisting ? { label: 'Ver el existente', onPress: () => onOpenExisting(error.existingId) } : undefined,
        });
        if (ok) {
          setSaving(false);
          await save(true);
          return;
        }
      } else setFormError(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const duration = previewDuration(draft);
  const isLast = step === STEPS.length - 1;

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <View style={styles.nav}>
            {step > 0 ? (
              <View style={styles.navButton}>
                <Button label="Atrás" variant="secondary" onPress={() => setStep(step - 1)} />
              </View>
            ) : null}
            {!isLast ? (
              <View style={styles.navButton}>
                <Button label="Siguiente" variant="secondary" onPress={() => setStep(step + 1)} testID="episode-next" />
              </View>
            ) : null}
          </View>
          <Button label={submitLabel} onPress={() => save()} loading={saving} testID="episode-save" />
        </>
      }
    >
      <View accessibilityRole="progressbar" accessibilityLabel={`Paso ${step + 1} de ${STEPS.length}: ${STEPS[step]}`}>
        <AppText variant="caption" muted>
          Paso {step + 1} de {STEPS.length}
        </AppText>
        <AppText variant="title">{STEPS[step]}</AppText>
        <View style={styles.progress}>
          {STEPS.map((name, i) => (
            <View key={name} style={[styles.segment, { backgroundColor: i <= step ? colors.primary : colors.border }]} />
          ))}
        </View>
      </View>
      {formError ? <Banner tone="danger" message={formError} /> : null}

      {step === 0 ? (
        <>
          <DateTimeField label="Fecha" mode="date" value={draft.date} onChange={(v) => set('date', v)} maximumDate={new Date()} error={errors.date} testID="episode-date" />
          <DateTimeField label="Hora de inicio" mode="time" value={draft.startTime} onChange={(v) => set('startTime', v)} error={errors.startTime} testID="episode-start" />
          <SwitchRow label="¿El episodio continúa ahora?" description="Podrás añadir cómo evoluciona y cerrarlo después." value={draft.ongoing} onChange={(v) => set('ongoing', v)} />
          {!draft.ongoing ? (
            <>
              <DateTimeField label="Hora de término" mode="time" value={draft.endTime} onChange={(v) => set('endTime', v)} error={errors.endTime} testID="episode-end" />
              <DateTimeField
                label="Fecha de término (si no fue el mismo día o el siguiente)"
                mode="date"
                value={draft.endDate}
                onChange={(v) => set('endDate', v)}
                maximumDate={new Date()}
                error={errors.endDate}
              />
            </>
          ) : null}
          {duration ? <AppText muted>{duration}</AppText> : null}
          <PainScale value={draft.intensity} onChange={(v) => set('intensity', v)} error={errors.intensity} label="Intensidad máxima" />
        </>
      ) : null}

      {step === 1 ? (
        <>
          <OptionGroup label="Tipo de episodio" options={EPISODE_TYPES} value={draft.type} onChange={(v) => set('type', v ?? 'unspecified')} error={errors.type} />
          <AppText variant="caption" muted>
            Es la categoría con la que tú lo registras, no un diagnóstico.
          </AppText>
          {draft.type === 'other' ? <TextField label="¿Qué tipo?" value={draft.typeOther} onChangeText={(v) => set('typeOther', v)} error={errors.typeOther} /> : null}
          <HeadMap selected={draft.locations} onToggle={(code) => set('locations', toggle(draft.locations, code))} />
          <ChipGroup label="Localización" options={PAIN_LOCATIONS} selected={draft.locations} onToggle={(code) => set('locations', toggle(draft.locations, code))} error={errors.locations} />
          {draft.locations.includes('other') ? <TextField label="Otra localización" value={draft.locationOther} onChangeText={(v) => set('locationOther', v)} error={errors.locationOther} /> : null}
          <ChipGroup label="Características del dolor" options={PAIN_QUALITIES} selected={draft.qualities} onToggle={(code) => set('qualities', toggle(draft.qualities, code))} error={errors.qualities} />
          {draft.qualities.includes('other') ? <TextField label="Otra característica" value={draft.qualityOther} onChangeText={(v) => set('qualityOther', v)} error={errors.qualityOther} /> : null}
        </>
      ) : null}

      {step === 2 ? (
        <>
          <ChipGroup label="Síntomas asociados" hint="Marca todos los que notaste." options={SYMPTOMS} selected={draft.symptoms} onToggle={(code) => set('symptoms', toggle(draft.symptoms, code))} error={errors.symptoms} testID="symptoms" />
          {draft.symptoms.includes('aura') ? (
            <>
              <ChipGroup label="Tipo de aura" options={AURA_TYPES} selected={draft.auraTypes} onToggle={(code) => set('auraTypes', toggle(draft.auraTypes, code))} error={errors.aura} />
              <TextField label="Duración del aura (minutos)" value={draft.auraDuration} onChangeText={(v) => set('auraDuration', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" error={errors.auraDuration} />
            </>
          ) : null}
        </>
      ) : null}

      {step === 3 ? (
        <>
          <ChipGroup
            label="¿Qué pudo haber desencadenado este episodio?"
            hint="Son posibilidades que anotas tú; la app no afirma que causen el episodio."
            options={TRIGGERS}
            selected={draft.triggers}
            onToggle={(code) => set('triggers', toggleTrigger(draft.triggers, code))}
            error={errors.triggers}
            testID="triggers"
          />
          {draft.triggers.includes('specific_food') ? <TextField label="¿Qué alimentos?" value={draft.foodDetail} onChangeText={(v) => set('foodDetail', v)} /> : null}
          {draft.triggers.includes('other') ? <TextField label="Otro desencadenante" value={draft.triggerOther} onChangeText={(v) => set('triggerOther', v)} /> : null}
        </>
      ) : null}

      {step === 4 ? (
        <>
          {offerMedication ? (
            <SwitchRow
              label="Tomé medicación para este episodio"
              description="Al guardar el episodio se abrirá el registro de la toma, ya vinculada."
              value={addMedication}
              onChange={setAddMedication}
            />
          ) : (
            <AppText variant="caption" muted>
              Las tomas de medicación de este episodio se registran desde su detalle.
            </AppText>
          )}
          <TextField label="Notas" help="Cualquier detalle que quieras recordar en la consulta." value={draft.notes} onChangeText={(v) => set('notes', v)} error={errors.notes} multiline />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', gap: spacing.sm },
  navButton: { flex: 1 },
  progress: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  segment: { flex: 1, height: 4, borderRadius: 2 },
});
