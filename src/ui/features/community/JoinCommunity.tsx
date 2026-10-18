/**
 * Primera visita a la comunidad: normas y elección de seudónimo.
 * Nadie participa sin aceptar las normas, y nunca con su email.
 */
import { useState } from 'react';
import { COMMUNITY_NOTICE, COMMUNITY_RULES, type CommunityProfile, type JoinCommunityInput } from '../../../domain/community';
import { ValidationError } from '../../../domain/errors';
import { getCommunity } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Button, Card, Checkbox, TextField } from '../../components';

export function JoinCommunity({ onJoined }: { onJoined: (profile: CommunityProfile) => void }) {
  const user = useSession((s) => s.user);
  const [alias, setAlias] = useState('');
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onJoin = async () => {
    if (!user) return;
    setSaving(true);
    setErrors({});
    setError(null);
    try {
      const community = await getCommunity();
      onJoined(await community.join(user.id, { alias, acceptedRules } as JoinCommunityInput));
    } catch (e) {
      if (e instanceof ValidationError) setErrors(e.fields);
      else setError(e instanceof Error ? e.message : 'No se pudo completar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppText variant="title">Comunidad</AppText>
      <AppText muted>
        Un espacio para compartir consejos y experiencias con otras personas que viven con migraña.
      </AppText>
      <Card>
        <AppText variant="heading">Normas de la comunidad</AppText>
        {COMMUNITY_RULES.map((rule) => (
          <AppText key={rule} variant="caption">
            • {rule}
          </AppText>
        ))}
      </Card>
      <Banner tone="info" message={COMMUNITY_NOTICE} />
      {error ? <Banner tone="danger" message={error} /> : null}
      <TextField
        label="Tu seudónimo"
        value={alias}
        onChangeText={setAlias}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={24}
        error={errors.alias}
        help="Es lo único que verán los demás. No uses tu nombre real ni tu email."
        testID="community-alias"
      />
      <Checkbox
        label="Acepto las normas de la comunidad"
        checked={acceptedRules}
        onChange={setAcceptedRules}
        required
        testID="community-rules"
      />
      {errors.acceptedRules ? <Banner tone="warning" message={errors.acceptedRules} /> : null}
      <Button
        label="Unirme a la comunidad"
        onPress={onJoin}
        loading={saving}
        disabled={!acceptedRules || alias.trim().length === 0}
        hint={acceptedRules ? undefined : 'Acepta las normas y elige un seudónimo para continuar'}
        testID="community-join"
      />
    </>
  );
}
