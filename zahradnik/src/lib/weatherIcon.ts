import { IconName } from '../components/ui';

/** WMO kód počasí → ikona Ionicons. */
export function weatherIcon(code: number): IconName {
  if (code === 0) return 'sunny';
  if (code <= 2) return 'partly-sunny';
  if (code === 3) return 'cloudy';
  if (code <= 48) return 'cloud';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rainy';
  if (code <= 86) return 'snow';
  return 'thunderstorm';
}

export function shortDay(date: string, index: number): string {
  if (index === 0) return 'Dnes';
  const d = new Date(`${date}T12:00:00`);
  return ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'][d.getDay()];
}

export function dayNumber(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 10) return 'Dobré ráno';
  if (h < 18) return 'Dobrý den';
  return 'Dobrý večer';
}

export function plural(n: number, one: string, few: string, many: string): string {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
}

export function fmt1(n: number): string {
  return (Math.round(n * 10) / 10).toString().replace('.', ',');
}
