/** Estado del día: estrés, ansiedad, ánimo, carga laboral o académica y «día sin dolor». */
import { router } from 'expo-router';
import { MOOD_LABELS, WORKLOAD_LABELS } from '../../domain/catalogs';
import { ValidationError } from '../../domain/errors';
import type { DailyRecordData } from '../../domain/entities/habits';
import { type DailyDraft, dailyDraftToInput, dailyToDraft, emptyDailyDraft } from '../../domain/usecases/habitDrafts';
import { SUBJECTIVE_NOTICE } from '../../i18n/es';
import { Banner, Button, DateTimeField, ScaleField, Screen, SwitchRow, TextField } from '../../ui/components';
import { type DayFormConfig, useDayForm } from '../../ui/features/habits/useDayForm';
import { useDayParam } from '../../ui/hooks/useDayParam';

const DAILY_FORM: DayFormConfig<DailyDraft, DailyRecordData> = {
  empty: emptyDailyDraft,
  load: (repos, userId, date) => repos.daily.getByDate(userId, date),
  toDraft: dailyToDraft,
  unsavedMessage: 'Tienes cambios sin guardar en el estado del día.',
};

export default function DailyStateScreen() {
  const initialDate = useDayParam();
  const form = useDayForm(DAILY_FORM, initialDate);
  const { draft, set, errors } = form;

  const save = async () => {
    const ok = await form.submit(async (repos, userId, d) => {
      const input = dailyDraftToInput(d);
      if (input.painFree) {
        const episodes = await repos.episodes.listBetween(userId, input.date, input.date);
        if (episodes.length > 0) {
          throw new ValidationError({ painFree: 'Ese día tiene un episodio registrado, así que no puede marcarse sin dolor.' });
        }
      }
      await repos.daily.upsertForDay(userId, input);
    });
    if (ok) router.back();
  };

  return (
    <Screen edges={['left', 'right']} footer={<Button label="Guardar estado del día" onPress={save} loading={form.saving} disabled={form.loading} testID="daily-save" />}>
      <Banner tone="info" message={SUBJECTIVE_NOTICE} />
      {form.formError ? <Banner tone="danger" message={form.formError} /> : null}
      <DateTimeField label="Día" mode="date" value={draft.date} onChange={(v) => set('date', v)} maximumDate={new Date()} error={errors.date} />
      <ScaleField label="Nivel de estrés" min={1} max={10} hint="1 nada de estrés · 10 el máximo que imaginas" value={draft.stress} onChange={(v) => set('stress', v)} allowClear error={errors.stress} testID="daily-stress" />
      <ScaleField label="Ansiedad percibida" min={1} max={10} hint="1 nada · 10 máxima" value={draft.anxiety} onChange={(v) => set('anxiety', v)} allowClear error={errors.anxiety} testID="daily-anxiety" />
      <ScaleField label="Estado de ánimo" min={1} max={5} labels={MOOD_LABELS} value={draft.mood} onChange={(v) => set('mood', v)} allowClear error={errors.mood} testID="daily-mood" />
      <ScaleField label="Carga laboral o académica" min={1} max={5} labels={WORKLOAD_LABELS} value={draft.workload} onChange={(v) => set('workload', v)} allowClear error={errors.workload} testID="daily-workload" />
      <TextField
        label="Situaciones estresantes (opcional)"
        value={draft.stressfulSituations}
        onChangeText={(v) => set('stressfulSituations', v)}
        error={errors.stressfulSituations}
        multiline
        placeholder="Ej.: entrega de un trabajo, discusión, viaje"
      />
      <SwitchRow label="Día sin dolor" description="Marca este día como libre de dolor de cabeza." value={draft.painFree} onChange={(v) => set('painFree', v)} />
      {errors.painFree ? <Banner tone="danger" message={errors.painFree} /> : null}
      <TextField label="Notas (opcional)" value={draft.notes} onChangeText={(v) => set('notes', v)} error={errors.notes} multiline />
    </Screen>
  );
}
