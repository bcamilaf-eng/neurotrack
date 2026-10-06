/** Apariencia: tema claro, oscuro o del sistema, y tamaño del texto. */
import { useState } from 'react';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Card, OptionGroup, Screen } from '../../../ui/components';
import { TEXT_SCALES } from '../../../ui/theme';

const THEMES = [
  { code: 'system', label: 'Como el sistema' },
  { code: 'light', label: 'Claro' },
  { code: 'dark', label: 'Oscuro' },
] as const;

export default function AppearanceScreen() {
  const { settings, updatePreferences } = useSession();
  const [error, setError] = useState<string | null>(null);

  const save = (patch: Parameters<typeof updatePreferences>[0]) => {
    setError(null);
    updatePreferences(patch).catch(() => setError('No se pudo guardar el cambio.'));
  };

  const scale = TEXT_SCALES.find((s) => Number(s.code) === settings?.textScale)?.code ?? '1';

  return (
    <Screen edges={['left', 'right']}>
      {error ? <Banner tone="danger" message={error} /> : null}
      <OptionGroup label="Tema" options={THEMES} value={settings?.theme ?? 'system'} onChange={(theme) => theme && save({ theme })} />
      <OptionGroup label="Tamaño del texto" options={TEXT_SCALES} value={scale} onChange={(v) => v && save({ textScale: Number(v) })} />
      <Card>
        <AppText variant="heading">Vista previa</AppText>
        <AppText>Así se leen tus registros con este tamaño de texto.</AppText>
        <AppText variant="caption" muted>
          El tamaño de letra del teléfono también se aplica.
        </AppText>
      </Card>
    </Screen>
  );
}
