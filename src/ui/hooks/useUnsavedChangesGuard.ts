/**
 * Pide confirmación antes de salir de un formulario con cambios sin guardar.
 * `dirty` y `saved` son refs para que el listener vea siempre el valor actual.
 */
import { useNavigation } from 'expo-router';
import { type RefObject, useEffect } from 'react';
import { Alert } from 'react-native';

export function useUnsavedChangesGuard(dirty: RefObject<boolean>, saved: RefObject<boolean>, message: string) {
  const navigation = useNavigation();
  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      if (!dirty.current || saved.current) return;
      event.preventDefault();
      Alert.alert('¿Descartar los cambios?', message, [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
      ]);
    });
  }, [navigation, dirty, saved, message]);
}
