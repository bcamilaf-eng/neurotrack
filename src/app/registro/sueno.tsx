/**
 * Sueño de una noche. Se registra con el día en que te levantas; las horas dormidas
 * se calculan solas, también si te acostaste antes de medianoche.
 */
import { router } from 'expo-router';
import { SLEEP_QUALITY_LABELS } from '../../domain/catalogs';
import type { SleepData } from '../../domain/entities/habits';
import { emptySleepDraft, previewSleepHours, type SleepDraft, sleepDraftToInput, sleepToDraft } from '../../domain/usecases/habitDrafts';
import {
  AppText,
  Banner,
  Button,
  DateTimeField,
  OptionGroup,
  ScaleField,
  Screen,
  SwitchRow,
  TextField,
} from '../../ui/components';
import { type DayFormConfig, useDayForm } from '../../ui/features/habits/useDayForm';
import { useDayParam } from '../../ui/hooks/useDayParam';

const RESTORATIVE = [
  { code: 'yes', label: 'Sí' },
  { code: 'no', label: 'No' },
] as const;

const SLEEP_FORM: DayFormConfig<SleepDraft, SleepData> = {
  empty: emptySleepDraft,
  load: (repos, userId, date) => repos.sleep.getByDate(userId, date),
  toDraft: sleepToDraft,
  unsavedMessage: 'Tienes cambios sin guardar en el registro de sueño.',
};

export default function SleepScreen() {
  const initialDate = useDayParam();
  const form = useDayForm(SLEEP_FORM, initialDate);
  const { draft, set, errors } = form;
  const hours = previewSleepHours(draft);

  const save = async () => {
    const ok = await form.submit((repos, userId, d) => repos.sleep.upsertForDay(userId, sleepDraftToInput(d)));
    if (ok) router.back();
  };

  return (
    <Screen edges={['left', 'right']} footer={<Button label="Guardar sueño" onPress={save} loading={form.saving} disabled={form.loading} testID="sleep-save" />}>
      {form.formError ? <Banner tone="danger" message={form.formError} /> : null}
      <DateTimeField label="Día en que te levantaste" mode="date" value={draft.date} onChange={(v) => set('date', v)} maximumDate={new Date()} error={errors.date} />
      {form.exists ? <AppText variant="caption" muted>Ya habías registrado esta noche: estás editando ese registro.</AppText> : null}
      <DateTimeField label="Hora de acostarte" mode="time" value={draft.bedtime} onChange={(v) => set('bedtime', v)} error={errors.bedtime ?? errors.bedtimeAt} testID="sleep-bedtime" />
      <DateTimeField label="Hora de levantarte" mode="time" value={draft.wakeTime} onChange={(v) => set('wakeTime', v)} error={errors.wakeTime ?? errors.wakeAt} testID="sleep-wake" />
      <AppText accessibilityLiveRegion="polite">
        {hours === null ? 'Elige las dos horas para calcular cuánto dormiste.' : `Horas de sueño: ${hours.toLocaleString('es-ES')} h`}
      </AppText>
      <ScaleField label="Calidad del sueño" min={1} max={5} labels={SLEEP_QUALITY_LABELS} value={draft.quality} onChange={(v) => set('quality', v)} error={errors.quality} testID="sleep-quality" />
      <TextField
        label="Despertares durante la noche"
        value={draft.awakenings}
        onChangeText={(v) => set('awakenings', v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        error={errors.awakenings}
        testID="sleep-awakenings"
      />
      <SwitchRow label="Tuve insomnio" description="Me costó dormirme o volver a dormirme." value={draft.insomnia} onChange={(v) => set('insomnia', v)} />
      <OptionGroup
        label="¿Fue un sueño reparador?"
        options={RESTORATIVE}
        value={draft.restorative === undefined ? undefined : draft.restorative ? 'yes' : 'no'}
        onChange={(v) => set('restorative', v === undefined ? undefined : v === 'yes')}
        allowClear
      />
      <TextField label="Notas (opcional)" value={draft.notes} onChangeText={(v) => set('notes', v)} error={errors.notes} multiline />
    </Screen>
  );
}
