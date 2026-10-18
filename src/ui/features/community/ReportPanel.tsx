/** Elegir el motivo de un reporte. Tras reportar, ese contenido deja de verse para quien reporta. */
import { useState } from 'react';
import { REPORT_HIDE_THRESHOLD, REPORT_REASONS, type ReportReason } from '../../../domain/community';
import { AppText, Button, Card, OptionGroup } from '../../components';

export function ReportPanel({
  what,
  onSubmit,
  onCancel,
}: {
  what: string;
  onSubmit: (reason: ReportReason) => Promise<void>;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | undefined>();
  const [sending, setSending] = useState(false);
  return (
    <Card>
      <AppText variant="heading">Reportar {what}</AppText>
      <OptionGroup label="¿Qué problema tiene?" options={REPORT_REASONS} value={reason} onChange={setReason} />
      <AppText variant="caption" muted>
        Dejarás de verlo. Si {REPORT_HIDE_THRESHOLD} personas lo reportan, se oculta para todos hasta revisarlo.
      </AppText>
      <Button
        label="Enviar reporte"
        variant="danger"
        disabled={!reason}
        loading={sending}
        onPress={async () => {
          if (!reason) return;
          setSending(true);
          try {
            await onSubmit(reason);
          } finally {
            setSending(false);
          }
        }}
      />
      <Button label="Cancelar" variant="ghost" onPress={onCancel} />
    </Card>
  );
}
