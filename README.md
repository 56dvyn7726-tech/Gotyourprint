# GotYourPrint – návrhář a objednávka triček s potiskem

Jednoduchá webová aplikace (čisté HTML, CSS a JavaScript, bez serveru a knihoven), kde si zákazník:

1. vybere **typ trička** (klasické, oversize, dlouhý rukáv, tílko),
2. vybere **barvu** a **velikost** (XS–3XL, s tabulkou velikostí),
3. **nahraje obrázek** (kliknutím nebo přetažením) pro **přední i zadní stranu** a hned ho vidí na tričku,
4. obrázek **posune** myší/prstem, **zvětší** (kolečko myši, posuvník, na mobilu roztažením dvěma prsty) a **otočí**,
5. vidí **cenu** (včetně příplatku za větší velikosti, potisku a množstevní slevy),
6. vyplní **objednávkový formulář**.

Aplikace upozorní, pokud má obrázek na zvolenou velikost příliš nízké rozlišení.

## Soubory

| Soubor       | Obsah                                   |
|--------------|-----------------------------------------|
| `index.html` | struktura stránky a objednávkový formulář |
| `style.css`  | vzhled                                  |
| `app.js`     | logika; **nastavení je v objektu `CONFIG` na začátku souboru** |

## Úpravy (ceny, barvy, velikosti, e-mail)

Otevřete `app.js` a upravte `CONFIG`:

- `types` – typy triček a jejich ceny,
- `colors` – názvy a barvy (hex kód),
- `sizes` – velikosti, rozměry do tabulky a příplatky,
- `printPricePerSide` – cena potisku jedné strany,
- `quantityDiscounts` – množstevní slevy,
- `orderEmail` / `orderEndpoint` – kam chodí objednávky (viz níže).

## Jak k vám dorazí objednávka

- **Bez nastavení (výchozí):** po odeslání se zákazníkovi otevře e-mail s vyplněnou objednávkou
  na adresu `orderEmail` a stáhnou se mu náhledy a původní obrázky, které přiloží.
- **Doporučeno:** nastavte `orderEndpoint` na adresu formulářové služby
  (např. [Formspree](https://formspree.io), [Getform](https://getform.io), [Basin](https://usebasin.com))
  nebo vlastního backendu. Formulář se odešle jako `multipart/form-data` a obsahuje:
  kontaktní údaje, typ, barvu, velikost, počet kusů, cenu, náhled (`preview`, `preview_front`, `preview_back`),
  původní obrázky (`original_front`, `original_back`) a umístění potisku (`placement_front`, `placement_back`).
  Pozor: některé služby mají přílohy jen v placeném tarifu.

## Umístění na web

- **Samostatná stránka:** nahrajte všechny tři soubory na hosting (nebo zapněte GitHub Pages
  v nastavení repozitáře → *Pages* → větev a složka `/`).
- **Vložení do existujícího webu** (WordPress, Webnode, Wix…) přes blok „HTML/Embed“:

  ```html
  <iframe src="https://VASE-ADRESA/index.html" style="width:100%;height:1300px;border:0" title="Návrhář triček"></iframe>
  ```

Pro vyzkoušení stačí otevřít `index.html` v prohlížeči.
