/** Calendario neurológico: un mes con la marca de cada día y, al tocar un día, todo lo registrado. */
import { addMonths, format, isSameMonth, parseISO, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Banner, Button, Card, Screen } from '../../ui/components';
import { DayDetail } from '../../ui/features/calendar/DayDetail';
import { CalendarLegend, NeuroCalendar } from '../../ui/features/calendar/NeuroCalendar';
import { useCalendar } from '../../ui/features/calendar/useCalendar';
import { spacing } from '../../ui/theme';
import { clock } from '../../utils/clock';
import { toLocalDate } from '../../utils/time';

export default function CalendarScreen() {
  const now = clock.now();
  const today = toLocalDate(now);
  const [month, setMonth] = useState(() => startOfMonth(now));
  const [selected, setSelected] = useState<string | null>(today);
  const { marks, blanks, day, error } = useCalendar(month, selected);
  const isCurrentMonth = isSameMonth(month, now);

  const move = (delta: number) => {
    const next = addMonths(month, delta);
    setMonth(next);
    setSelected(isSameMonth(next, now) ? today : null);
  };

  const painDays = marks?.filter((m) => m.episodes > 0).length ?? 0;
  const painFree = marks?.filter((m) => m.category === 'painFree').length ?? 0;
  const medicationDays = marks?.filter((m) => m.medication).length ?? 0;
  const title = format(month, "MMMM 'de' yyyy", { locale: es });

  return (
    <Screen>
      <AppText variant="title">Calendario</AppText>
      {error ? <Banner tone="danger" message={error} /> : null}
      <Card>
        <View style={styles.header}>
          <View style={styles.nav}>
            <Button label="‹" variant="ghost" onPress={() => move(-1)} hint="Mes anterior" testID="month-prev" />
          </View>
          <AppText variant="heading" style={styles.title} accessibilityRole="header">
            {title.charAt(0).toUpperCase() + title.slice(1)}
          </AppText>
          <View style={styles.nav}>
            <Button label="›" variant="ghost" onPress={() => move(1)} disabled={isCurrentMonth} hint="Mes siguiente" testID="month-next" />
          </View>
        </View>
        {marks ? <NeuroCalendar marks={marks} blanks={blanks} selected={selected} today={today} onSelect={setSelected} /> : <AppText muted>Cargando…</AppText>}
        {marks ? (
          <AppText variant="caption" muted accessibilityLiveRegion="polite">
            {painDays} {painDays === 1 ? 'día con dolor' : 'días con dolor'} · {painFree} marcados sin síntomas · {medicationDays} con medicación
          </AppText>
        ) : null}
      </Card>
      {day && selected && marks && isSameMonth(parseISO(selected), month) ? <DayDetail day={day} /> : null}
      {!selected ? <AppText muted>Toca un día para ver lo que registraste.</AppText> : null}
      <Card>
        <AppText variant="label">Leyenda</AppText>
        <CalendarLegend />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nav: { width: 56 },
  title: { flex: 1, textAlign: 'center' },
});
