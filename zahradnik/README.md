# 🌱 Zahradník

Mobilní aplikace pro iOS a Android (Expo / React Native), která ti každý den poradí, jak se starat o rostliny na zahradě.

## Co umí

- **Katalog rostlin** – 30 běžných rostlin českých zahrad (zelenina, ovoce, bylinky, okrasné, trávník) s péčí po měsících, tipy a zajímavostmi.
- **Moje zahrada** – název, rozloha, poloha (GPS nebo vyhledání obce). U každé rostliny umístění (záhon / květináč / skleník), slunce, plocha a počet kusů.
- **Počasí** – teplota, srážky za posledních 7 dní, předpověď na týden a výpar (evapotranspirace) z [Open-Meteo](https://open-meteo.com) (zdarma, bez registrace).
- **Denní rada k zálivce** – pro každou rostlinu spočítá vodní bilanci za posledních 5 dní:
  výpar × nárok rostliny × oslunění − účinné srážky − tvoje zálivka. Podle hloubky kořenů pak řekne
  *zalij X litrů*, *zkontroluj půdu prstem*, *počkej, bude pršet* nebo *nezalévej*. Ve skleníku nepočítá s deštěm,
  u květináčů počítá s rychlejším vysycháním.
- **Varování** – mráz (podle odolnosti rostliny), horko, silný vítr.
- **Roční období a úkoly měsíce** – co na zahradě dělat právě teď, obecně i pro každou rostlinu.
- **Tip dne a zajímavost dne** – vybírané hlavně z rostlin, které máš.
- **Poradna s fotkou** – vyfoť nemocnou rostlinu a AI (Claude) řekne, co jí je, proč a co s tím dělat.
  Do dotazu automaticky přidá roční období a počasí za poslední týden.
- **Denní připomínka** – ranní oznámení v nastavenou hodinu.

## Spuštění

```bash
cd zahradnik
npm install
npx expo start
```

Pak naskenuj QR kód aplikací **Expo Go** (iOS: fotoaparát, Android: aplikace Expo Go) – aplikace se spustí přímo v telefonu.

Pro instalovatelnou aplikaci (APK / App Store) použij EAS Build:

```bash
npx eas-cli@latest build --platform android   # nebo ios
```

## Poradna s fotkou – API klíč

Rozpoznání problému z fotky volá Claude API. V aplikaci otevři **Nastavení → Poradna s fotkou** a vlož API klíč
z [console.anthropic.com](https://console.anthropic.com). Klíč zůstává jen v telefonu. Každá diagnóza stojí zlomek
koruny až pár korun podle velikosti fotky.

> Pokud bys aplikaci chtěl zveřejnit pro další lidi, přesuň volání Claude API na vlastní server (aby klíč nebyl
> v aplikaci) – stačí upravit `src/lib/diagnose.ts`.

## Struktura

```
src/
  app/                 obrazovky (Expo Router)
    (tabs)/index.tsx   Dnes – počasí, rady k zálivce, tip dne
    (tabs)/zahrada.tsx Moje zahrada
    (tabs)/diagnoza.tsx Poradna s fotkou
    (tabs)/nastaveni.tsx Poloha, rozloha, připomínky, API klíč
    katalog.tsx        výběr rostliny
    pridat/[plantId]   přidání rostliny na zahradu
    rostlina/[uid]     detail rostliny, kalendář péče
  data/plants.ts       databáze rostlin
  lib/advice.ts        výpočet zálivky a varování
  lib/weather.ts       Open-Meteo (počasí + vyhledávání obcí)
  lib/diagnose.ts      diagnóza z fotky (Claude)
  lib/season.ts        roční období, úkoly měsíce
  lib/store.tsx        ukládání dat v telefonu
```

Rostlinu přidáš do databáze doplněním záznamu do `src/data/plants.ts`.
