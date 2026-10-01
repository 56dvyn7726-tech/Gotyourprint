# 🌱 Zahradník

Mobilní aplikace pro iOS a Android (Expo / React Native), která ti každý den poradí, jak se starat o rostliny na zahradě.

## Co umí

- **Katalog rostlin** – 31 běžných rostlin českých zahrad (zelenina, ovoce, bylinky, okrasné, trávník) s péčí po měsících, tipy a zajímavostmi.
- **Plán zahrady ze satelitu** – najdi zahradu podle adresy nebo GPS, obkresli její hranice (rozloha se spočítá sama)
  a na mapě označ, kde co roste. Záhony můžeš obkreslit také – jejich plocha se použije pro výpočet litrů vody.
  Značky na mapě mají barvu podle dnešní potřeby vody. Mapa se ovládá tažením, dvěma prsty (na počítači kolečkem)
  a tlačítkem G otevřeš stejné místo v Google Maps.
- **Moje rostliny** – u každé rostliny umístění (záhon / květináč / skleník), slunce, plocha a počet kusů.
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

Satelitní snímky jsou z Esri World Imagery a adresy z OpenStreetMap (Nominatim) – obojí zdarma a bez API klíče.
Přímo Google Maps by vyžadovaly vlastní API klíč s platební kartou, proto je Google jen jako odkaz.

## Vzhled

Design ve stylu iOS: průhledné „skleněné“ panely s rozmazáním (expo-blur, na webu CSS backdrop-filter),
barevné pozadí, které jimi prosvítá, systémové písmo (SF Pro na iPhonu), barvy systémové palety iOS,
skleněná plovoucí spodní lišta a widget s počasím podle barvy oblohy. Komponenty jsou v `src/components/ui.tsx`
(`Glass`, `Backdrop`, `Card`, `Button`…).

## Spuštění

```bash
cd zahradnik
npm install
npx expo start
```

Pak naskenuj QR kód aplikací **Expo Go** (iOS: fotoaparát, Android: aplikace Expo Go) – aplikace se spustí přímo v telefonu.

### Webová verze (odkaz do prohlížeče)

Stejná aplikace běží i v prohlížeči telefonu:
**https://56dvyn7726-tech.github.io/Gotyourprint/zahradnik-app/**
V Safari / Chrome ji přes *Sdílet → Přidat na plochu* uložíš jako ikonu. Na webu nejsou ranní oznámení
a data se ukládají jen v daném prohlížeči.

Webovou verzi znovu sestavíš a zkopíruješ do složky, kterou servíruje GitHub Pages:

```bash
node scripts/build-web.mjs /Gotyourprint/zahradnik-app ../zahradnik-app
```

### Instalovatelná aplikace

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
  app/                   obrazovky (Expo Router)
    (tabs)/index.tsx     Dnes – počasí, rady k zálivce, náhled plánu, tip dne
    (tabs)/plan.tsx      Plán zahrady – satelitní mapa, hranice, záhony, rostliny
    (tabs)/zahrada.tsx   Moje rostliny
    (tabs)/diagnoza.tsx  Poradna s fotkou
    (tabs)/nastaveni.tsx Nastavení
    poloha.tsx           výběr polohy zahrady (adresa, GPS, mapa)
    katalog.tsx          výběr rostliny
    pridat/[plantId].tsx přidání rostliny na zahradu
    rostlina.tsx         detail rostliny (?uid=…), kalendář péče
  components/
    SatelliteMap.tsx     vlastní satelitní mapa (posun, zoom, klepání, kreslení)
    ui.tsx               designový systém – sklo, pozadí, barvy, písmo, tlačítka, karty
  data/plants.ts         databáze rostlin
  lib/advice.ts          výpočet zálivky a varování
  lib/geo.ts             projekce mapy, výpočet plochy
  lib/geocode.ts         vyhledávání adres (OpenStreetMap)
  lib/weather.ts         počasí (Open-Meteo)
  lib/diagnose.ts        diagnóza z fotky (Claude)
  lib/store.tsx          ukládání dat v telefonu
```

Rostlinu přidáš do databáze doplněním záznamu do `src/data/plants.ts`.
