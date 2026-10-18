/**
 * Perfil personal: datos generales, ocupación, diagnósticos y contacto de emergencia.
 * Lo usan la primera entrada («Completa tu perfil») y Perfil › Mis datos. Nada es obligatorio.
 */
import { useEffect, useState } from 'react';
import { HEADACHE_DIAGNOSES, type HeadacheDiagnosis, SEX_OPTIONS, type Sex } from '../../../domain/catalogs';
import { ValidationError } from '../../../domain/errors';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { AppText, ChipGroup, OptionGroup, SwitchRow, TextField } from '../../components';
import { useForm } from '../../hooks/useForm';
import { optionalString, parseOptionalNumber } from '../../../utils/parse';

const EMPTY = {
  name: '',
  birthDate: '',
  sex: undefined as Sex | undefined,
  weightKg: '',
  heightCm: '',
  country: '',
  occupation: '',
  diagnoses: [] as HeadacheDiagnosis[],
  otherConditions: '',
  trackingNotes: '',
  pregnantOrPostpartum: false,
  contactName: '',
  contactPhone: '',
  contactRelationship: '',
};

/** Carga el perfil guardado y devuelve el formulario con su acción de guardar. */
export function useProfileForm() {
  const user = useSession((s) => s.user);
  const form = useForm(EMPTY);
  const [loaded, setLoaded] = useState(false);

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
        occupation: profile?.occupation ?? '',
        diagnoses: profile?.diagnoses ?? [],
        otherConditions: profile?.otherConditions ?? '',
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

  /** Guarda y devuelve `true` si todo fue bien; si no, los errores quedan en el formulario. */
  const save = (onSaved: () => void | Promise<void>) =>
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
        occupation: optionalString(v.occupation),
        diagnoses: v.diagnoses,
        otherConditions: optionalString(v.otherConditions),
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
      await onSaved();
    });

  return { form, loaded, save };
}

type ProfileFormState = ReturnType<typeof useProfileForm>['form'];

export function ProfileFields({ form }: { form: ProfileFormState }) {
  const { values, errors, setField } = form;
  const toggleDiagnosis = (code: HeadacheDiagnosis) =>
    setField('diagnoses', values.diagnoses.includes(code) ? values.diagnoses.filter((d) => d !== code) : [...values.diagnoses, code]);

  return (
    <>
      <AppText variant="heading">Sobre ti</AppText>
      <TextField label="Nombre" value={values.name} onChangeText={(t) => setField('name', t)} error={errors.name} autoComplete="name" />
      <TextField
        label="Fecha de nacimiento"
        help="Formato AAAA-MM-DD, por ejemplo 1990-04-23."
        value={values.birthDate}
        onChangeText={(t) => setField('birthDate', t)}
        error={errors.birthDate}
        keyboardType="numbers-and-punctuation"
        autoComplete="birthdate-full"
        testID="profile-birth-date"
      />
      <OptionGroup label="Sexo" options={SEX_OPTIONS} value={values.sex} onChange={(v) => setField('sex', v)} allowClear error={errors.sex} />
      <TextField label="Peso (kg)" value={values.weightKg} onChangeText={(t) => setField('weightKg', t)} error={errors.weightKg} keyboardType="decimal-pad" />
      <TextField label="Altura (cm)" value={values.heightCm} onChangeText={(t) => setField('heightCm', t)} error={errors.heightCm} keyboardType="decimal-pad" />
      <TextField label="País" value={values.country} onChangeText={(t) => setField('country', t)} error={errors.country} autoComplete="country" />
      <TextField
        label="Ocupación"
        help="Ayuda a entender tu ritmo diario, por ejemplo turnos o trabajo con pantallas."
        value={values.occupation}
        onChangeText={(t) => setField('occupation', t)}
        error={errors.occupation}
        testID="profile-occupation"
      />

      <AppText variant="heading">Tu salud</AppText>
      <ChipGroup
        label="Diagnósticos de cefalea"
        hint="Marca los que te haya indicado un profesional. Puedes elegir varios."
        options={HEADACHE_DIAGNOSES}
        selected={values.diagnoses}
        onToggle={toggleDiagnosis}
        error={errors.diagnoses}
        testID="profile-diagnoses"
      />
      <TextField
        label="Otras enfermedades diagnosticadas"
        help="Por ejemplo hipertensión, ansiedad o hipotiroidismo."
        value={values.otherConditions}
        onChangeText={(t) => setField('otherConditions', t)}
        error={errors.otherConditions}
        multiline
        testID="profile-other-conditions"
      />
      <SwitchRow
        label="Embarazo o puerperio actual"
        description="Ayuda a señalar un dolor intenso nuevo que conviene consultar con urgencia."
        value={values.pregnantOrPostpartum}
        onChange={(v) => setField('pregnantOrPostpartum', v)}
      />
      <TextField
        label="Información relevante para el seguimiento"
        help="Por ejemplo, antecedentes que quieras recordar en la consulta."
        value={values.trackingNotes}
        onChangeText={(t) => setField('trackingNotes', t)}
        error={errors.trackingNotes}
        multiline
      />

      <AppText variant="heading">Contacto de emergencia</AppText>
      <AppText variant="caption" muted>
        Opcional. Se mostrará para llamar rápido si un registro contiene una señal de alarma.
      </AppText>
      <TextField label="Nombre del contacto" value={values.contactName} onChangeText={(t) => setField('contactName', t)} error={errors.contactName} />
      <TextField label="Teléfono" value={values.contactPhone} onChangeText={(t) => setField('contactPhone', t)} error={errors.contactPhone} keyboardType="phone-pad" />
      <TextField label="Relación (opcional)" value={values.contactRelationship} onChangeText={(t) => setField('contactRelationship', t)} />
    </>
  );
}
