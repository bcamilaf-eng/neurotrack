/**
 * Exportación de archivos con datos clínicos (informe PDF y CSV).
 *
 * Privacidad: el archivo se crea en la caché privada de la app, solo sale del teléfono
 * si el usuario elige un destino en la hoja de compartir del sistema, y se borra al
 * cerrarla. Por si la app se cerrara a mitad, `cleanupExports` vacía la carpeta al
 * arrancar y antes de cada exportación.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const EXPORT_FOLDER = 'exportaciones';

export class ShareUnavailableError extends Error {
  constructor() {
    super('Este dispositivo no permite compartir archivos desde la app.');
    this.name = 'ShareUnavailableError';
  }
}

function exportDirectory(): Directory {
  const dir = new Directory(Paths.cache, EXPORT_FOLDER);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function safeDelete(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {
    // Si no se puede borrar ahora, `cleanupExports` lo intentará de nuevo.
  }
}

/** Borra cualquier exportación que haya quedado de una sesión anterior. */
export function cleanupExports(): void {
  try {
    const dir = new Directory(Paths.cache, EXPORT_FOLDER);
    if (dir.exists) dir.delete();
  } catch {
    // Carpeta en uso o inexistente: no impide seguir.
  }
}

async function share(file: File, mimeType: string, UTI: string, dialogTitle: string) {
  try {
    if (!(await Sharing.isAvailableAsync())) throw new ShareUnavailableError();
    await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle });
  } finally {
    safeDelete(file);
  }
}

/** Convierte el HTML en PDF, abre la hoja de compartir y borra el archivo al terminar. */
export async function sharePdf(html: string, baseName: string): Promise<void> {
  cleanupExports();
  const { uri } = await Print.printToFileAsync({ html });
  const printed = new File(uri);
  const target = new File(exportDirectory(), `${baseName}.pdf`);
  try {
    await printed.move(target);
  } catch (error) {
    safeDelete(printed);
    throw error;
  }
  await share(target, 'application/pdf', 'com.adobe.pdf', 'Compartir informe PDF');
}

/** Guarda el CSV, abre la hoja de compartir y borra el archivo al terminar. */
export async function shareCsv(csv: string, baseName: string): Promise<void> {
  cleanupExports();
  const target = new File(exportDirectory(), `${baseName}.csv`);
  target.create({ overwrite: true });
  target.write(csv);
  await share(target, 'text/csv', 'public.comma-separated-values-text', 'Compartir datos CSV');
}
