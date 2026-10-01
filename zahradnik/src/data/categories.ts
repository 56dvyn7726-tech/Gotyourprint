import { Category } from '../types';

/** Průsvitné pastelové podklady avatarů podle kategorie rostliny (prosvítá jimi pozadí). */
export const CATEGORY_TINT: Record<Category, string> = {
  zelenina: 'rgba(255,190,140,0.32)',
  ovoce: 'rgba(255,150,170,0.28)',
  bylinky: 'rgba(120,210,140,0.28)',
  okrasné: 'rgba(200,150,240,0.28)',
  trávník: 'rgba(170,220,110,0.30)',
};
