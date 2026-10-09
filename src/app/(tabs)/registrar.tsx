/** Menú de registro: episodio, síntomas, medicación y hábitos del día. */
import { router } from 'expo-router';
import { AppText, Card, ListRow, Screen } from '../../ui/components';

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
        <ListRow
          title="Medicación"
          subtitle="Nombre, dosis, hora, motivo y respuesta. También ves tus últimas tomas."
          onPress={() => router.push('/registro/medicacion')}
        />
      </Card>
      <AppText variant="heading">Tu día</AppText>
      <Card>
        <ListRow title="Sueño" subtitle="Horas, calidad, despertares e insomnio." onPress={() => router.push('/registro/sueno')} />
        <ListRow title="Hidratación" subtitle="Vasos de agua, cantidad y progreso del día." onPress={() => router.push('/registro/hidratacion')} />
        <ListRow title="Alimentación" subtitle="Comidas, horarios y ayuno." onPress={() => router.push('/registro/alimentacion')} />
        <ListRow
          title="Estado del día"
          subtitle="Estrés, ansiedad, ánimo, carga laboral y día sin dolor."
          onPress={() => router.push('/registro/estado')}
        />
      </Card>
    </Screen>
  );
}
