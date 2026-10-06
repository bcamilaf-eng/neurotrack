/** Agua del día: se suma vaso a vaso o se escribe la cantidad, con el progreso hacia tu objetivo. */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { HYDRATION_LEVEL_LABELS } from '../../domain/catalogs';
import { DEFAULT_GLASS_ML, type HydrationData } from '../../domain/entities/habits';
import { addGlasses, emptyHydrationDraft, type HydrationDraft, hydrationDraftToInput, hydrationToDraft } from '../../domain/usecases/habitDrafts';
import { AppText, Banner, Button, Card, DateTimeField, ProgressRing, ScaleField, Screen, TextField } from '../../ui/components';
import { confirmDestructive } from '../../ui/confirm';
import type { StoredRecord } from '../../data/repositories/recordRepository';
import { type DayFormConfig, useDayForm } from '../../ui/features/habits/useDayForm';
import { useDayParam } from '../../ui/hooks/useDayParam';
import { spacing } from '../../ui/theme';
import { parseOptionalNumber } from '../../utils/parse';

const valid = (n: number | undefined) => (n === undefined || Number.isNaN(n) ? 0 : n);

const HYDRATION_FORM: DayFormConfig<HydrationDraft, StoredRecord<HydrationData>> = {
  empty: emptyHydrationDraft,
  load: (repos, userId, date) => repos.hydration.getByDate(userId, date),
  toDraft: hydrationToDraft,
  remove: (repos, userId, id) => repos.hydration.remove(userId, id),
  unsavedMessage: 'Tienes cambios sin guardar en la hidratación.',
};

export default function HydrationScreen() {
  const initialDate = useDayParam();
  const form = useDayForm(HYDRATION_FORM, initialDate);
  const { draft, set, errors } = form;
  const amount = valid(parseOptionalNumber(draft.amountMl));
  const goal = valid(parseOptionalNumber(draft.goalMl));
  const progress = goal > 0 ? amount / goal : 0;

  const save = async () => {
    const ok = await form.submit((repos, userId, d) => repos.hydration.upsertForDay(userId, hydrationDraftToInput(d)));
    if (ok) router.back();
  };

  const remove = async () => {
    const ok = await confirmDestructive({
      title: '¿Eliminar este registro?',
      message: 'Se borrará la hidratación de ese día.',
      confirmLabel: 'Eliminar',
    });
    if (ok && (await form.remove())) router.back();
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <Button label="Guardar hidratación" onPress={save} loading={form.saving} disabled={form.loading} testID="hydration-save" />
          {form.exists ? <Button label="Eliminar registro" variant="danger" onPress={remove} disabled={form.saving} /> : null}
        </>
      }
    >
      {form.formError ? <Banner tone="danger" message={form.formError} /> : null}
      <DateTimeField label="Día" mode="date" value={draft.date} onChange={(v) => set('date', v)} maximumDate={new Date()} error={errors.date} />

      <Card>
        <ProgressRing
          progress={progress}
          label="Progreso de hidratación"
          caption={`${(amount / 1000).toLocaleString('es-ES')} de ${(goal / 1000).toLocaleString('es-ES')} l`}
        />
        <AppText variant="label" style={styles.center} accessibilityLiveRegion="polite">
          {draft.glasses} {draft.glasses === 1 ? 'vaso' : 'vasos'} de {DEFAULT_GLASS_ML} ml
        </AppText>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button label="− Quitar vaso" variant="secondary" onPress={() => form.update((d) => addGlasses(d, -1))} disabled={draft.glasses === 0} testID="glass-remove" />
          </View>
          <View style={styles.flex}>
            <Button label="+ Añadir vaso" onPress={() => form.update((d) => addGlasses(d, 1))} testID="glass-add" />
          </View>
        </View>
      </Card>

      <TextField
        label="Cantidad total (ml)"
        help="Puedes escribirla si bebiste en botella o en otros recipientes."
        value={draft.amountMl}
        onChangeText={(v) => set('amountMl', v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        error={errors.amountMl}
        testID="hydration-amount"
      />
      <TextField label="Objetivo diario (ml)" value={draft.goalMl} onChangeText={(v) => set('goalMl', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" error={errors.goalMl} />
      <ScaleField
        label="¿Cómo de hidratado/a te sientes?"
        min={1}
        max={5}
        labels={HYDRATION_LEVEL_LABELS}
        value={draft.perceived}
        onChange={(v) => set('perceived', v)}
        allowClear
        error={errors.perceived}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
});
