const plnFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 289 -> "289 zł", 8.5 -> "8,50 zł" */
export const pln = (value: number) => plnFormatter.format(round2(value));

export const round2 = (value: number) => Math.round(value * 100) / 100;

export const plural = (n: number, one: string, few: string, many: string) => {
  if (n === 1) return one;
  if (n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14)) return few;
  return many;
};

export const orderNumber = (date = new Date()) => {
  const y = String(date.getFullYear()).slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SM-${y}${m}${d}-${rand}`;
};

export const normalizePhone = (raw: string) => raw.replace(/[\s\-()]/g, '');

/** Akceptuje 9 cyfr lub +48 + 9 cyfr */
export const isValidPhone = (raw: string) => /^(\+?48)?\d{9}$/.test(normalizePhone(raw));

export const isValidEmail = (raw: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(raw.trim());
