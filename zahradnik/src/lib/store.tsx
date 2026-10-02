import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Garden, GardenPlant, Settings, Weather } from '../types';
import { fetchWeather } from './weather';

const GARDEN_KEY = 'zahradnik.garden.v1';
const SETTINGS_KEY = 'zahradnik.settings.v1';
const WEATHER_KEY = 'zahradnik.weather.v1';

/** Počasí obnovujeme nejdřív po 30 minutách, jinak použijeme uložené. */
const WEATHER_TTL_MS = 30 * 60 * 1000;

const DEFAULT_GARDEN: Garden = { name: 'Moje zahrada', areaM2: 200, plants: [] };
const DEFAULT_SETTINGS: Settings = { apiKey: '', notifyHour: 7, notifyEnabled: false };

interface Store {
  ready: boolean;
  garden: Garden;
  settings: Settings;
  weather: Weather | null;
  weatherError: string | null;
  weatherLoading: boolean;
  updateGarden: (patch: Partial<Garden>) => void;
  addPlant: (p: Omit<GardenPlant, 'uid' | 'addedAt'>) => string;
  updatePlant: (uid: string, patch: Partial<GardenPlant>) => void;
  removePlant: (uid: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  refreshWeather: (force?: boolean) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [garden, setGarden] = useState<Garden>(DEFAULT_GARDEN);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [g, s, w] = await AsyncStorage.multiGet([GARDEN_KEY, SETTINGS_KEY, WEATHER_KEY]);
        if (g[1]) setGarden({ ...DEFAULT_GARDEN, ...JSON.parse(g[1]) });
        if (s[1]) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s[1]) });
        if (w[1]) setWeather(JSON.parse(w[1]));
      } catch {
        // Poškozená data – začneme s výchozími hodnotami.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const mutateGarden = useCallback((fn: (prev: Garden) => Garden) => {
    setGarden((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(GARDEN_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const updateGarden = useCallback(
    (patch: Partial<Garden>) => mutateGarden((prev) => ({ ...prev, ...patch })),
    [mutateGarden],
  );

  const addPlant = useCallback(
    (p: Omit<GardenPlant, 'uid' | 'addedAt'>) => {
      const gp: GardenPlant = {
        ...p,
        uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        addedAt: new Date().toISOString(),
      };
      mutateGarden((prev) => ({ ...prev, plants: [...prev.plants, gp] }));
      return gp.uid;
    },
    [mutateGarden],
  );

  const updatePlant = useCallback(
    (uid: string, patch: Partial<GardenPlant>) =>
      mutateGarden((prev) => ({
        ...prev,
        plants: prev.plants.map((p) => (p.uid === uid ? { ...p, ...patch } : p)),
      })),
    [mutateGarden],
  );

  const removePlant = useCallback(
    (uid: string) => mutateGarden((prev) => ({ ...prev, plants: prev.plants.filter((p) => p.uid !== uid) })),
    [mutateGarden],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const refreshWeather = useCallback(
    async (force = false) => {
      const loc = garden.location;
      if (!loc) return;
      if (
        !force &&
        weather &&
        Date.now() - new Date(weather.fetchedAt).getTime() < WEATHER_TTL_MS &&
        weather.today.date === localDate()
      ) {
        return;
      }
      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const w = await fetchWeather(loc);
        setWeather(w);
        AsyncStorage.setItem(WEATHER_KEY, JSON.stringify(w)).catch(() => {});
      } catch (e: any) {
        setWeatherError(e?.message ?? 'Počasí se nepodařilo načíst.');
      } finally {
        setWeatherLoading(false);
      }
    },
    [garden.location, weather],
  );

  // Při změně polohy načti počasí znovu.
  useEffect(() => {
    if (ready && garden.location) refreshWeather(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, garden.location?.lat, garden.location?.lon]);

  return (
    <Ctx.Provider
      value={{
        ready,
        garden,
        settings,
        weather,
        weatherError,
        weatherLoading,
        updateGarden,
        addPlant,
        updatePlant,
        removePlant,
        updateSettings,
        refreshWeather,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore musí být uvnitř StoreProvider');
  return ctx;
}
