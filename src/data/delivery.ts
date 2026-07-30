import type { DeliveryZone } from '../types';

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    name: 'Centrum / Śródmieście / Niebuszewo',
    minOrder: 50,
    fee: 8,
    freeFrom: 120,
    eta: '35–50 min',
  },
  {
    name: 'Prawobrzeże (blisko) / Podjuchy',
    minOrder: 50,
    fee: 8,
    freeFrom: 120,
    eta: '40–55 min',
  },
  {
    name: 'Dąbie / Zdroje / Słoneczne',
    minOrder: 60,
    fee: 10,
    freeFrom: 120,
    eta: '45–60 min',
  },
  {
    name: 'Warszewo / Pogodno / Gumieńce',
    minOrder: 80,
    fee: 14,
    eta: '50–70 min',
  },
  {
    name: 'Bezrzecze / Mierzyn / Osów',
    minOrder: 100,
    fee: 18,
    eta: '55–75 min',
  },
];

export const FREE_DELIVERY_FROM = 120;

export const RESTAURANT = {
  name: 'Sushi Smok',
  street: 'ul. Pomarańczowa 7',
  city: 'Szczecin',
  phone: '+48 880 503 760',
  phoneHref: 'tel:+48880503760',
  instagram: 'https://www.instagram.com/sushismok_s/',
  hours: [
    { days: 'Nd – Cz', time: '12:00 – 21:00' },
    { days: 'Pt – Sb', time: '12:00 – 22:00' },
  ],
  pickupDiscount: 10,
};

export const PICKUP_SLOTS = [
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
];

export const FAQ = [
  {
    q: 'Jak długo czekam na zamówienie?',
    a: 'Średnio 40–60 minut w zależności od dzielnicy i godziny. W piątek i sobotę po 18:00 czas może wydłużyć się do 75 minut. Kurier dzwoni przed przyjazdem.',
  },
  {
    q: 'Czy mogę zapłacić kartą przy odbiorze?',
    a: 'Tak. Kurier ma terminal, przyjmujemy karty i BLIK. Przy odbiorze osobistym płacisz na miejscu — kartą, BLIK-iem lub gotówką.',
  },
  {
    q: 'Kiedy dostawa jest darmowa?',
    a: `Od ${FREE_DELIVERY_FROM} zł w dzielnicach Centrum, Śródmieście, Niebuszewo, Podjuchy, Dąbie, Zdroje i Słoneczne. W pozostałych strefach obowiązuje stała opłata.`,
  },
  {
    q: 'Czy dowozicie pod adres poza listą dzielnic?',
    a: 'Zadzwoń na +48 880 503 760 — ustalimy indywidualną opłatę. Dowozimy w promieniu ok. 12 km od ul. Pomarańczowej 7.',
  },
  {
    q: 'Czy da się zamówić na konkretną godzinę?',
    a: 'Tak. W komentarzu do zamówienia wpisz preferowaną godzinę, a przy odbiorze osobistym wybierz ją z listy. Zamówienia na wieczór przyjmujemy do 2 dni wcześniej.',
  },
  {
    q: 'Mam alergię — co robić?',
    a: 'Wpisz to w komentarzu i zadzwoń do nas. Pełna lista alergenów jest dostępna w lokalu i telefonicznie. Uwaga: pracujemy z rybami, skorupiakami, sezamem, soją i glutenem.',
  },
];
