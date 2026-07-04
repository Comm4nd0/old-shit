import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type LocationState =
  | { status: 'loading' }
  | { status: 'granted'; lat: number; lng: number }
  | { status: 'denied' }
  | { status: 'error' };

export function useLocation() {
  const [state, setState] = useState<LocationState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setState({ status: 'denied' });
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setState({
        status: 'granted',
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch {
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { location: state, refresh };
}
