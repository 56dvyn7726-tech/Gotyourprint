import { useMemo } from 'react';
import { colors, IconName } from '../components/ui';
import { adviseForPlant, PlantAdvice, WaterVerdict } from './advice';
import { useStore } from './store';

export const VERDICT: Record<WaterVerdict, { color: string; soft: string; icon: IconName; label: string; order: number }> = {
  zalij: { color: colors.water, soft: colors.waterSoft, icon: 'water', label: 'Zalít', order: 0 },
  zkontroluj: { color: colors.sun, soft: colors.sunSoft, icon: 'hand-left', label: 'Zkontrolovat', order: 1 },
  nezalévej: { color: colors.primaryBright, soft: colors.primarySoft, icon: 'checkmark-circle', label: 'V pořádku', order: 2 },
  zalito: { color: colors.primaryBright, soft: colors.primarySoft, icon: 'checkmark-done-circle', label: 'Zalito', order: 3 },
  odpočívá: { color: colors.faint, soft: colors.surfaceAlt, icon: 'moon', label: 'Odpočívá', order: 4 },
};

/** Dnešní rady pro všechny rostliny na zahradě (podle uid). */
export function useAdvice(): { list: PlantAdvice[]; byUid: Record<string, PlantAdvice> } {
  const { garden, weather } = useStore();
  return useMemo(() => {
    const list = weather
      ? garden.plants
          .map((gp) => adviseForPlant(gp, weather, new Date()))
          .filter((a): a is PlantAdvice => a !== null)
          .sort((a, b) => VERDICT[a.verdict].order - VERDICT[b.verdict].order)
      : [];
    return { list, byUid: Object.fromEntries(list.map((a) => [a.gardenPlant.uid, a])) };
  }, [garden.plants, weather]);
}
