import { AppText, ComingSoon, Screen } from '../../ui/components';

export default function EvolutionScreen() {
  return (
    <Screen>
      <AppText variant="title">Mi evolución</AppText>
      <ComingSoon title="Estadísticas" description="Frecuencia, intensidad, duración y respuesta al tratamiento por período." />
      <ComingSoon title="Patrones personales" description="Posibles asociaciones en tus registros, explicadas con prudencia." />
      <ComingSoon title="Generar informe" description="Informe PDF o CSV para llevar a tu consulta." />
    </Screen>
  );
}
