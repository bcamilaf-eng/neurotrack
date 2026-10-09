/**
 * Perfil opcional y contacto de emergencia. Nada es obligatorio: se explica para qué sirve
 * cada dato y se guarda solo lo que el usuario escribe.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { SEX_OPTIONS, type Sex } from '../../../domain/catalogs';
import { ValidationError } from '../../../domain/errors';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Button, OptionGroup, Screen, SwitchRow, TextField } from '../../../ui/components';
import { useForm } from '../../../ui/hooks/useForm';
import { optionalString, parseOptionalNumber } from '../../../utils/parse';

const EMPTY = {
  name: '',
  birthDate: '',
  sex: undefined as Sex | undefined,
  weightKg: '',
  heightCm: '',
  country: '',
  trackingNotes: '',
  pregnantOrPostpartum: false,
  contactName: '',
  contactPhone: '',
  contactRelationship: '',
};

export default function ProfileDataScreen() {
  const user = useSession((s) => s.user);
  const form = useForm(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const repos = await getRepositories();
      const [profile, contact] = await Promise.all([
        repos.account.getProfile(user.id),
        repos.account.getEmergencyContact(user.id),
      ]);
      form.setValues({
        name: profile?.name ?? '',
        birthDate: profile?.birthDate ?? '',
        sex: profile?.sex,
        weightKg: profile?.weightKg?.toString() ?? '',
        heightCm: profile?.heightCm?.toString() ?? '',
        country: profile?.country ?? '',
        trackingNotes: profile?.trackingNotes ?? '',
        pregnantOrPostpartum: profile?.pregnantOrPostpartum ?? false,
        contactName: contact?.name ?? '',
        contactPhone: contact?.phone ?? '',
        contactRelationship: contact?.relationship ?? '',
      });
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onSave = () =>
    form.submit(async (v) => {
      if (!user) return;
      const repos = await getRepositories();
      await repos.account.updateProfile(user.id, {
        name: optionalString(v.name),
        birthDate: optionalString(v.birthDate),
        sex: v.sex,
        weightKg: parseOptionalNumber(v.weightKg),
        heightCm: parseOptionalNumber(v.heightCm),
        country: optionalString(v.country),
        trackingNotes: optionalString(v.trackingNotes),
        pregnantOrPostpartum: v.pregnantOrPostpartum || undefined,
      });
      const hasContact = optionalString(v.contactName) || optionalString(v.contactPhone);
      if (hasContact) {
        try {
          await repos.account.saveEmergencyContact(user.id, {
            name: v.contactName,
            phone: v.contactPhone,
            relationship: optionalString(v.contactRelationship),
          });
        } catch (error) {
          if (error instanceof ValidationError) {
            const fields: Record<string, string> = {};
            if (error.fields.name) fields.contactName = error.fields.name;
            if (error.fields.phone) fields.contactPhone = error.fields.phone;
            throw new ValidationError(fields);
          }
          throw error;
        }
      } else {
        await repos.account.removeEmergencyContact(user.id);
      }
      setSaved(true);
      router.back();
    });

  if (!loaded) return <Screen edges={['left', 'right']}>{null}</Screen>;

  return (
    <Screen
      edges={['left', 'right']}
      footer={<Button label="Guardar" onPress={onSave} loading={form.submitting} />}
    >
      <AppText muted>
        Todos los datos son opcionales. Sirven para dar contexto a tu informe médico y nunca se comparten sin tu acción.
      </AppText>
      {form.formError && !saved ? <Banner tone="danger" message={form.formError} /> : null}
      <TextField label="Nombre" value={form.values.name} onChangeText={(t) => form.setField('name', t)} error={form.errors.name} autoComplete="name" />
      <TextField
        label="Fecha de nacimiento"
        help="Formato AAAA-MM-DD, por ejemplo 1990-04-23."
        value={form.values.birthDate}
        onChangeText={(t) => form.setField('birthDate', t)}
        error={form.errors.birthDate}
        keyboardType="numbers-and-punctuation"
        autoComplete="birthdate-full"
      />
      <OptionGroup label="Sexo" options={SEX_OPTIONS} value={form.values.sex} onChange={(v) => form.setField('sex', v)} allowClear error={form.errors.sex} />
      <TextField label="Peso (kg)" value={form.values.weightKg} onChangeText={(t) => form.setField('weightKg', t)} error={form.errors.weightKg} keyboardType="decimal-pad" />
      <TextField label="Altura (cm)" value={form.values.heightCm} onChangeText={(t) => form.setField('heightCm', t)} error={form.errors.heightCm} keyboardType="decimal-pad" />
      <TextField label="País" value={form.values.country} onChangeText={(t) => form.setField('country', t)} error={form.errors.country} autoComplete="country" />
      <SwitchRow
        label="Embarazo o puerperio actual"
        description="Ayuda a señalar un dolor intenso nuevo que conviene consultar con urgencia."
        value={form.values.pregnantOrPostpartum}
        onChange={(v) => form.setField('pregnantOrPostpartum', v)}
      />
      <TextField
        label="Información relevante para el seguimiento"
        help="Por ejemplo, antecedentes que quieras recordar en la consulta."
        value={form.values.trackingNotes}
        onChangeText={(t) => form.setField('trackingNotes', t)}
        error={form.errors.trackingNotes}
        multiline
      />
      <AppText variant="heading">Contacto de emergencia</AppText>
      <AppText variant="caption" muted>
        Opcional. Se mostrará para llamar rápido si un registro contiene una señal de alarma.
      </AppText>
      <TextField label="Nombre del contacto" value={form.values.contactName} onChangeText={(t) => form.setField('contactName', t)} error={form.errors.contactName} />
      <TextField label="Teléfono" value={form.values.contactPhone} onChangeText={(t) => form.setField('contactPhone', t)} error={form.errors.contactPhone} keyboardType="phone-pad" />
      <TextField label="Relación (opcional)" value={form.values.contactRelationship} onChangeText={(t) => form.setField('contactRelationship', t)} />
    </Screen>
  );
}
