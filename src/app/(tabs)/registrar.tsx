/** Menú de registro. Los formularios se incorporan en las próximas versiones. */
import { AppText, ComingSoon, Screen } from '../../ui/components';

const SECTIONS = [
  ['Episodio', 'Fecha, horas, tipo, intensidad 0–10, localización en el mapa de la cabeza y características.'],
  ['Síntomas', 'Síntomas asociados y detalle del aura.'],
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
      {SECTIONS.map(([title, description]) => (
        <ComingSoon key={title} title={title} description={description} />
      ))}
    </Screen>
  );
}
