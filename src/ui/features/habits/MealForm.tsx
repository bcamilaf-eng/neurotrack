/**
 * Formulario de una comida o de un ayuno. Los alimentos se añaden como etiquetas para
 * poder buscar después posibles asociaciones, nunca para señalar una causa.
 */
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MEAL_TYPES } from '../../../domain/catalogs';
import type { MealInput } from '../../../domain/entities/habits';
import { ValidationError } from '../../../domain/errors';
import { addFoods, type MealDraft, mealDraftToInput } from '../../../domain/usecases/habitDrafts';
import { FOOD_NOTICE } from '../../../i18n/es';
import { AppText, Banner, Button, DateTimeField, OptionGroup, Screen, SwitchRow, TextField } from '../../components';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { MIN_TOUCH, radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';

export interface MealFormProps {
  initialDraft: MealDraft;
  submitLabel: string;
  onSave: (input: MealInput) => Promise<void>;
  onSaved: () => void;
  onDelete?: () => void;
}

export function MealForm({ initialDraft, submitLabel, onSave, onSaved, onDelete }: MealFormProps) {
  const { colors } = useAppTheme();
  const [draft, setDraft] = useState(initialDraft);
  const [foodText, setFoodText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);
  const saved = useRef(false);
  useUnsavedChangesGuard(dirty, saved, 'Tienes cambios sin guardar en esta comida.');

  const set = <K extends keyof MealDraft>(key: K, value: MealDraft[K]) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const { [key as string]: _drop, ...rest } = e;
      return rest;
    });
  };

  const commitFoods = (text = foodText) => {
    if (!text.trim()) return draft.foods;
    const foods = addFoods(draft.foods, text);
    set('foods', foods);
    setFoodText('');
    return foods;
  };

  const save = async () => {
    setFormError(null);
    setSaving(true);
    try {
      // Lo que quedó escrito sin pulsar «Añadir» también cuenta.
      const foods = commitFoods();
      await onSave(mealDraftToInput({ ...draft, foods }));
      saved.current = true;
      onSaved();
    } catch (error) {
      if (error instanceof ValidationError) setErrors(error.fields);
      else setFormError(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <Button label={submitLabel} onPress={save} loading={saving} testID="meal-save" />
          {onDelete ? <Button label="Eliminar comida" variant="danger" onPress={onDelete} disabled={saving} /> : null}
        </>
      }
    >
      {formError ? <Banner tone="danger" message={formError} /> : null}
      <OptionGroup label="Comida" options={MEAL_TYPES} value={draft.mealType} onChange={(v) => set('mealType', v)} error={errors.mealType} />
      <DateTimeField label="Día" mode="date" value={draft.date} onChange={(v) => set('date', v)} maximumDate={new Date()} error={errors.date} />
      <SwitchRow label="Hice ayuno" description="No comí en este horario." value={draft.fasting} onChange={(v) => set('fasting', v)} />
      {draft.fasting ? (
        <TextField
          label="Horas de ayuno"
          value={draft.fastingHours}
          onChangeText={(v) => set('fastingHours', v.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          error={errors.fastingHours}
          testID="meal-fasting-hours"
        />
      ) : (
        <>
          <DateTimeField label="Hora" mode="time" value={draft.time} onChange={(v) => set('time', v)} error={errors.time} />
          <View style={styles.section}>
            <TextField
              label="Alimentos"
              help="Escribe uno o varios separados por comas."
              value={foodText}
              onChangeText={setFoodText}
              onSubmitEditing={() => commitFoods()}
              returnKeyType="done"
              error={errors.foods}
              testID="meal-food-input"
            />
            <Button label="Añadir alimento" variant="secondary" onPress={() => commitFoods()} disabled={!foodText.trim()} testID="meal-food-add" />
            <View style={styles.chips}>
              {draft.foods.map((food) => (
                <Pressable
                  key={food}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${food}`}
                  onPress={() => set('foods', draft.foods.filter((f) => f !== food))}
                  style={[styles.chip, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
                >
                  <AppText variant="label" color={colors.primary}>
                    {food} ✕
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}
      <TextField label="Notas (opcional)" value={draft.notes} onChangeText={(v) => set('notes', v)} error={errors.notes} multiline />
      <AppText variant="caption" muted>
        {FOOD_NOTICE}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: MIN_TOUCH, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1.5, justifyContent: 'center' },
});
