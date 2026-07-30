# Sushi Smok — ordering website (Szczecin)

Działający sklep do zamawiania sushi online: menu, koszyk, checkout, strefy dostawy, program lojalnościowy. React 18 + TypeScript + Vite + Tailwind. Mobile-first, cały interfejs po polsku.

## Uruchomienie

```bash
npm install
```

```bash
npm run dev
```

Dev: http://localhost:5173 — API (`/api/*`) i symulator płatności (`/mock-pay/*`) są zamontowane w serwerze Vite, więc płatności działają z jednego procesu.

Produkcyjnie (API + zbudowany frontend pod jednym originem):

```bash
npm run build && npm start
```

Testy backendu płatności:

```bash
npm test
```

`npm run build` = `tsc --noEmit && vite build`. `npm start` uruchamia `server/standalone.ts` przez `tsx`.

## Płatności

Pięć metod, dwie klasy:

| Metoda | Klasa | Opis |
| --- | --- | --- |
| Karta online | online | Zapłać bezpiecznie kartą online |
| BLIK | online | Wpisz kod BLIK i potwierdź w aplikacji banku |
| Przelewy24 | online | Szybki przelew bankowy |
| Gotówka przy odbiorze | przy odbiorze | Zapłać kurierowi przy odbiorze |
| Karta przy odbiorze | przy odbiorze | Zapłać terminalem przy dostawie lub odbiorze |

**Zasada bezpieczeństwa:** dane karty i BLIK NIE są zbierane ani przechowywane na tej
stronie. Płatności online przechodzą przez hosted checkout operatora (Stripe / PayU /
Przelewy24) — u nas nie ma żadnego pola na numer karty. W trybie demo rolę operatora gra
symulator (`/mock-pay/:id`), który również nie zbiera danych karty — tylko wybierasz wynik,
a on wysyła **podpisany webhook** dokładnie jak prawdziwy provider.

### Flow

1. Klient dodaje pozycje → wybiera Dostawa/Odbiór → dane kontaktowe → metodę płatności.
2. Przycisk zmienia się w zależności od metody:
   - online → **„Przejdź do płatności”**,
   - gotówka / karta przy odbiorze → **„Złóż zamówienie”**.
3. `POST /api/orders` tworzy zamówienie. **Ceny liczy serwer** z własnego katalogu — payload
   klienta zawiera tylko `id` + `quantity`, więc nie da się podmienić kwoty.
4. Płatność przy odbiorze → status od razu `confirmed`, ekran sukcesu.
5. Płatność online → `POST /api/payments/create-session` → redirect na secure checkout
   operatora. Zamówienie ma `paymentStatus: pending` — nie pokazujemy „opłacone”.
6. Operator wysyła `POST /api/payments/webhook`. **Dopiero zweryfikowany webhook** (podpis +
   zgodność kwoty) ustawia `paid` i `status: confirmed`.
7. Klient wraca na `/zamowienie/status?orderId=…`, strona odpytuje status i pokazuje:
   sukces, „płatność w toku” (czeka na webhook), albo błąd z przyciskiem **„Spróbuj ponownie”**.

### Stany płatności

`not_started` → `pending` → `paid` | `failed` | `cancelled`. Punkty Smok Club naliczają się
**wyłącznie** po `paid` (online) lub od razu przy płatności przy odbiorze — nigdy w stanie
pending.

### API

| Endpoint | Metoda | Rola |
| --- | --- | --- |
| `/api/config` | GET | provider + klucz publiczny dla frontendu |
| `/api/orders` | POST | utworzenie zamówienia (walidacja + ceny z serwera) |
| `/api/orders/:id?token=` | GET | status zamówienia (chroniony tokenem HMAC) |
| `/api/payments/create-session` | POST | sesja u operatora, ustawia `pending` |
| `/api/payments/webhook` | POST | **jedyne** miejsce ustawiające `paid` |

### Konfiguracja providera

`.env` (wzór w `.env.example`). Bez kluczy działa tryb `mock`. Wybór providera bez jego
kluczy → automatyczny fallback na mock, więc demo nigdy się nie wywala.

```env
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_...    # albo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

Dodanie kolejnego operatora = jedna klasa implementująca `PaymentProvider`
(`server/providers/`). Stripe, PayU i Przelewy24 są już zaimplementowane (register sesji +
weryfikacja podpisu webhooka); podłączenie to uzupełnienie kluczy w `.env`.

### Struktura backendu

```
server/
├── config.ts              # env + wybór providera + fallback na mock
├── api.ts                 # handler /api/* i /mock-pay/* (bez zależności)
├── orders.ts              # walidacja + wyliczenie cen z katalogu serwera
├── store.ts               # OrderStore (plikowy; podmiana na DB = 1 klasa)
├── standalone.ts          # produkcyjny serwer (API + dist/)
├── vite-plugin-api.ts     # montaż API w dev serverze Vite
├── env.ts                 # loader .env bez zależności
├── providers/
│   ├── types.ts           # interfejs PaymentProvider
│   ├── mock.ts  stripe.ts  payu.ts  przelewy24.ts
│   └── index.ts           # fabryka providera
└── __tests__/run.ts       # 18 testów (webhook-only-paid, podpisy, kwoty, walidacja)
```

## Struktura plików

```
sushismok/
├── index.html                  # meta/OG, fonty (Inter + Bebas Neue)
├── package.json
├── tailwind.config.js          # paleta marki, radius max 8px
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts
├── public/favicon.svg
└── src/
    ├── main.tsx                # BrowserRouter
    ├── App.tsx                 # routing + layout + drawer/toast/sticky bar
    ├── index.css               # Tailwind + klasy .btn/.card/.chip/.clamp-*
    ├── types.ts                # Product, CartItem, DeliveryZone, PlacedOrder…
    ├── data/
    │   ├── menu.ts             # 44 pozycje w 8 kategoriach + zdjęcia
    │   ├── delivery.ts         # 5 stref, dane lokalu, godziny, slots, FAQ
    │   └── promos.ts           # promocje + poziomy Smok Club
    ├── lib/
    │   ├── pricing.ts          # calcTotals — jedyne źródło prawdy dla kwot
    │   ├── format.ts           # pln(), walidacja telefonu/e-maila, nr zamówienia
    │   ├── hours.ts            # "Otwarte teraz / Zamknięte"
    │   └── storage.ts          # localStorage (koszyk, klub, ostatnie zamówienie)
    ├── context/
    │   └── CartContext.tsx     # useReducer + persystencja + toast + drawer
    ├── components/
    │   ├── Header.tsx  Footer.tsx  Logo.tsx  SectionHead.tsx
    │   ├── ProductCard.tsx  BadgePill.tsx  QtyStepper.tsx  SafeImage.tsx
    │   ├── CartDrawer.tsx      # bottom sheet (mobile) / panel (desktop)
    │   ├── CartAside.tsx       # koszyk obok menu na desktopie (≥1024px)
    │   ├── StickyCartBar.tsx   # pływający pasek koszyka na mobile
    │   ├── ReorderBlock.tsx    # "Zamów ponownie ulubione zestawy"
    │   └── Toast.tsx           # feedback po dodaniu do koszyka
    └── pages/
        ├── Home.tsx            # hero + promocje + popularne sety + przewagi
        ├── Menu.tsx            # kategorie, szukajka, siatka, koszyk obok
        ├── Checkout.tsx        # formularz + podsumowanie + order success
        ├── Delivery.tsx        # strefy, mapa, odbiór osobisty, FAQ
        └── Loyalty.tsx         # Smok Club, punkty, kod, zapis na promocje
```

## Trasy

| Ścieżka | Ekran |
| --- | --- |
| `/` | Home — CTA „Zamów teraz" / „Sprawdź dostawę" |
| `/menu` | Menu z filtrami i wyszukiwaniem (`/menu?kategoria=uramaki`) |
| `/zamowienie` | Koszyk + checkout + ekran sukcesu |
| `/dostawa` | Strefy, koszty, mapa, FAQ |
| `/smok-club` | Program lojalnościowy |

## Model danych (gotowy pod panel admina)

```ts
type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;      // PLN
  image: string;
  badges?: string[];  // Bestseller | Ostre | Nowość | Wege | Bez ryby
  portion?: string;   // "32 szt.", "0,5 l"
};

type CartItem = Product & { quantity: number };

type DeliveryZone = {
  name: string;
  minOrder: number;
  fee: number;
  freeFrom?: number;
  eta: string;
};
```

Edycja menu = edycja tablicy `PRODUCTS` w `src/data/menu.ts`. Edycja stref = `DELIVERY_ZONES` w `src/data/delivery.ts`. Nic innego nie trzeba ruszać.

## Logika kwot (`src/lib/pricing.ts`)

Wszystkie ekrany liczą kwoty tą samą funkcją `calcTotals`:

- `subtotal` = Σ `price × quantity`
- `deliveryFee` = `null` dopóki nie wybrano dzielnicy (UI pokazuje „wybierz dzielnicę", CTA nie kłamie o kwocie)
- darmowa dostawa gdy `subtotal >= zone.freeFrom` (strefy bez `freeFrom` nigdy nie zerują opłaty)
- `minOrder` blokuje złożenie zamówienia i pokazuje, ile brakuje
- odbiór osobisty: `fee = 0`, `minOrder = 0`, rabat 10%
- rabaty **nie łączą się** — brany jest wyższy (kod promocyjny vs. odbiór osobisty)
- progi (minimum, darmowa dostawa) liczone od `subtotal` przed rabatem

Strefy (mock, realistyczne):

| Dzielnica | Min. | Dostawa | Darmowa od | Czas |
| --- | --- | --- | --- | --- |
| Centrum / Śródmieście / Niebuszewo | 50 zł | 8 zł | 120 zł | 35–50 min |
| Prawobrzeże (blisko) / Podjuchy | 50 zł | 8 zł | 120 zł | 40–55 min |
| Dąbie / Zdroje / Słoneczne | 60 zł | 10 zł | 120 zł | 45–60 min |
| Warszewo / Pogodno / Gumieńce | 80 zł | 14 zł | — | 50–70 min |
| Bezrzecze / Mierzyn / Osów | 100 zł | 18 zł | — | 55–75 min |

Kody: `SMOK10` (−10%), `SMOKCLUB15` (−15%).

## Koszyk

- dodawanie, `+` / `−`, usuwanie pozycji, czyszczenie koszyka
- `−` przy ilości 1 usuwa pozycję (brak pozycji z `quantity: 0`), limit 30 szt./pozycja
- stan trzymany w `localStorage` (`smok.cart.v1`) — odświeżenie strony nie gubi zamówienia
- mobile: bottom sheet + pływający pasek z sumą; desktop: panel z prawej + stały koszyk obok menu
- empty state w drawerze i na `/zamowienie`
- toast po dodaniu pozycji ze skrótem do koszyka

## Checkout

Pola: Imię\*, Telefon\* (9 cyfr lub +48…), E-mail (opcjonalny, walidowany jeśli podany), sposób realizacji, płatność, zgoda\*.

- **Dostawa**: dzielnica\*, adres\*, komentarz dla kuriera; po wyborze strefy widać minimum, koszt/darmową dostawę i czas
- **Odbiór osobisty**: adres ul. Pomarańczowa 7, godziny otwarcia, telefon, wybór godziny odbioru\* (lub „jak najszybciej")
- walidacja przy submit + przewijanie do pierwszego błędnego pola
- `Złóż zamówienie` → ekran sukcesu z numerem `SM-RRMMDD-XXXX`, podsumowaniem, informacją o potwierdzeniu telefonicznym/SMS i punktami Smok Club
- dane kontaktowe zapisywane lokalnie i podstawiane przy kolejnym zamówieniu

## Smok Club

Punkty (1 pkt / 10 zł), licznik zamówień z progresem do 10., trzy poziomy, kod `SMOK10` na pierwsze zamówienie z kopiowaniem, zapis na promocje przez e-mail lub SMS, blok „Zamów ponownie" dokładający pozycje z ostatniego zamówienia do koszyka.

## Co podmienić przed publikacją

1. **Zdjęcia** — `PHOTOS` w `src/data/menu.ts` wskazuje na Unsplash (poglądowo). Wstaw własne zdjęcia z Instagrama/sesji do `public/` i podmień ścieżki. `SafeImage` trzyma proporcje i pokazuje fallback, więc brak pliku nie łamie layoutu.
2. **Klucze płatności** — ustaw `PAYMENT_PROVIDER` + klucze w `.env` (patrz sekcja Płatności). API zamówień i webhooków jest już gotowe.
3. **Baza zamówień** — `server/store.ts` używa pliku (`.data/orders.json`). Do produkcji podmień `FileOrderStore` na implementację `OrderStore` na Postgres/Prisma — reszta backendu bez zmian.
4. **Program lojalnościowy** — punkty liczone w `localStorage`; do produkcji podepnij konto po numerze telefonu.
5. **Zapis na promocje** — formularz w `src/pages/Loyalty.tsx` waliduje dane i pokazuje potwierdzenie; brakuje tylko strzału do CRM/newslettera.
6. **Analytics + regulamin/polityka prywatności** — linki i skrypty do dodania.

## Weryfikacja

- `npm run build` — czysty (typy + bundle)
- logika kwot pokryta testami jednostkowymi na `calcTotals` (12 przypadków: subtotal, brak strefy, opłata, darmowa dostawa, strefa bez darmowej, minimum, odbiór, kody, brak łączenia rabatów, pusty koszyk)
- flow przeklikany w przeglądarce: Home → Menu → Dodaj do koszyka → koszyk → checkout (walidacja + strefy) → `Złóż zamówienie` → ekran sukcesu → „Zamów ponownie" na Home
