import { AppText, ComingSoon, Screen } from '../../ui/components';

export default function CalendarScreen() {
  return (
    <Screen>
      <AppText variant="title">Calendario</AppText>
      <ComingSoon
        title="Calendario neurológico"
        description="Cada día mostrará si hubo síntomas, cefalea, migraña, episodio intenso o medicación, con el detalle al tocarlo."
      />
    </Screen>
  );
}
