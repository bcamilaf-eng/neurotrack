/** Abrir un tema nuevo en la comunidad. */
import { router } from 'expo-router';
import { useState } from 'react';
import { COMMUNITY_CATEGORIES, COMMUNITY_RULES, type CommunityCategory } from '../../domain/community';
import { ValidationError } from '../../domain/errors';
import { getCommunity } from '../../state/services';
import { useSession } from '../../state/sessionStore';
import { AppText, Banner, Button, Card, OptionGroup, Screen, TextField } from '../../ui/components';

export default function NewPostScreen() {
  const user = useSession((s) => s.user);
  const [category, setCategory] = useState<CommunityCategory | undefined>();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onPublish = async () => {
    if (!user) return;
    setSaving(true);
    setErrors({});
    setError(null);
    try {
      const community = await getCommunity();
      const post = await community.createPost(user.id, { category: category as CommunityCategory, title, body });
      router.replace({ pathname: '/comunidad/[id]', params: { id: post.id } });
    } catch (e) {
      if (e instanceof ValidationError) setErrors(e.fields);
      else setError(e instanceof Error ? e.message : 'No se pudo publicar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const description = COMMUNITY_CATEGORIES.find((c) => c.code === category)?.description;

  return (
    <Screen
      edges={['left', 'right']}
      footer={<Button label="Publicar" onPress={onPublish} loading={saving} testID="community-publish" />}
    >
      {error ? <Banner tone="danger" message={error} /> : null}
      <OptionGroup label="Categoría" options={COMMUNITY_CATEGORIES} value={category} onChange={setCategory} error={errors.category} />
      {description ? (
        <AppText variant="caption" muted>
          {description}
        </AppText>
      ) : null}
      <TextField label="Título" value={title} onChangeText={setTitle} maxLength={120} error={errors.title} testID="community-title" />
      <TextField
        label="Tu mensaje"
        value={body}
        onChangeText={setBody}
        maxLength={4000}
        multiline
        textAlignVertical="top"
        numberOfLines={6}
        error={errors.body}
        help="Cuenta tu experiencia. No incluyas nombres reales, emails ni teléfonos."
        testID="community-body"
      />
      <Card>
        <AppText variant="label">Recuerda</AppText>
        <AppText variant="caption">• {COMMUNITY_RULES[0]}</AppText>
        <AppText variant="caption">• {COMMUNITY_RULES[2]}</AppText>
      </Card>
    </Screen>
  );
}
