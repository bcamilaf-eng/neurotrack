/** Menú de registro. Episodio y síntomas ya funcionan; el resto llega en los próximos hitos. */
import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Card, ComingSoon, ListRow, Screen } from '../../ui/components';

const UPCOMING = [
  ['Sueño', 'Horas, calidad, despertares e insomnio.'],
  ['Hidratación', 'Cantidad de agua, vasos y progreso del día.'],
  ['Medicación', 'Nombre, dosis, hora, motivo y respuesta.'],
  ['Alimentación', 'Comidas, horarios y ayuno.'],
  ['Estado diario', 'Estrés, ansiedad, ánimo y carga laboral.'],
] as const;

export default function RegisterScreen() {
  return (
    <Screen>
      <AppText variant="title">Registrar</AppText>
      <Card>
        <ListRow
          title="Episodio"
          subtitle="Fecha, horas, intensidad 0–10, localización, características, síntomas y posibles desencadenantes."
          onPress={() => router.push('/episodio/nuevo')}
        />
        <ListRow
          title="Síntomas"
          subtitle="Empieza el registro directamente en síntomas y aura."
          onPress={() => router.push({ pathname: '/episodio/nuevo', params: { paso: '2' } })}
        />
      </Card>
      <View style={{ gap: 12 }}>
        {UPCOMING.map(([title, description]) => (
          <ComingSoon key={title} title={title} description={description} />
        ))}
      </View>
    </Screen>
  );
}
