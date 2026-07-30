/** Nd–Cz 12:00–21:00, Pt–Sb 12:00–22:00 (czas lokalny przeglądarki). */
const SCHEDULE: Record<number, { open: number; close: number }> = {
  0: { open: 12, close: 21 }, // niedziela
  1: { open: 12, close: 21 },
  2: { open: 12, close: 21 },
  3: { open: 12, close: 21 },
  4: { open: 12, close: 21 },
  5: { open: 12, close: 22 }, // piątek
  6: { open: 12, close: 22 }, // sobota
};

export type OpenStatus = {
  isOpen: boolean;
  label: string;
};

export const openStatus = (now = new Date()): OpenStatus => {
  const day = SCHEDULE[now.getDay()];
  const hours = now.getHours() + now.getMinutes() / 60;

  if (hours >= day.open && hours < day.close) {
    const closesIn = day.close - hours;
    return {
      isOpen: true,
      label:
        closesIn <= 1
          ? `Otwarte — zamykamy o ${day.close}:00`
          : `Otwarte teraz · do ${day.close}:00`,
    };
  }

  if (hours < day.open) {
    return { isOpen: false, label: `Zamknięte — otwieramy o ${day.open}:00` };
  }

  return { isOpen: false, label: 'Zamknięte — otwieramy o 12:00' };
};
