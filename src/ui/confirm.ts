import { Alert } from 'react-native';

/** Diálogo nativo de confirmación antes de acciones que no se pueden deshacer. */
export function confirmDestructive(options: {
  title: string;
  message: string;
  confirmLabel: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      options.title,
      options.message,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: options.confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
