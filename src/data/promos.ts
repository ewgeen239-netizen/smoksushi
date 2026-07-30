export type Promo = {
  id: string;
  tag: string;
  title: string;
  text: string;
  code?: string;
  accent: 'fire' | 'gold' | 'ink';
};

export const PROMOS: Promo[] = [
  {
    id: 'first-order',
    tag: 'Pierwsze zamówienie',
    title: '-10% na start',
    text: 'Zamawiasz u nas pierwszy raz? Wpisz kod przy zamówieniu i odbierz rabat na całe menu.',
    code: 'SMOK10',
    accent: 'fire',
  },
  {
    id: 'wtorek',
    tag: 'Wtorek i środa',
    title: 'Zestaw + lemoniada za 1 zł',
    text: 'Do każdego zestawu powyżej 129 zł dorzucamy domową lemoniadę yuzu-mięta za złotówkę.',
    accent: 'gold',
  },
  {
    id: 'odbior',
    tag: 'Odbiór osobisty',
    title: '-10% przy odbiorze',
    text: 'Wpadasz na Pomarańczową 7? Zamówienia na odbiór osobisty są zawsze 10% taniej.',
    accent: 'ink',
  },
];

export const CLUB_TIERS = [
  {
    name: 'Smok',
    threshold: 0,
    perk: '1 punkt za każde 10 zł zamówienia',
  },
  {
    name: 'Ognisty Smok',
    threshold: 500,
    perk: 'Darmowa dostawa bez limitu kwoty',
  },
  {
    name: 'Złoty Smok',
    threshold: 1500,
    perk: '-15% na całe menu + priorytet w kuchni',
  },
];
