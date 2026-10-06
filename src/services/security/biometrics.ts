/**
 * Bloqueo de la app con biometría (Face ID, huella) o, como respaldo, el código del dispositivo.
 */
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricService {
  isAvailable(): Promise<boolean>;
  authenticate(reason: string): Promise<boolean>;
}

export const biometrics: BiometricService = {
  async isAvailable() {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hardware && enrolled;
  },

  async authenticate(reason) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancelar',
      // Permite el código del dispositivo si la biometría falla varias veces.
      disableDeviceFallback: false,
    });
    return result.success;
  },
};
