# Objednávka triček – návod

Stránka `index.html` v této složce slouží k hromadné objednávce triček s daným potiskem.
Zákazník vybere střih (FIT nebo EVERYDAY), barvu, velikost a počet kusů, vidí tabulku rozměrů a vyplní jméno, příjmení, telefon a e-mail.
Stránka si jeho volby pamatuje, takže když se na odkaz vrátí, může objednávku upravit nebo zrušit.

Vy pod odkazem **Správa objednávek** (dole na stránce, nebo adresa končící `#sprava`) zadáte heslo a uvidíte:
- souhrn pro výrobu (kolik kusů které barvy a velikosti),
- seznam všech objednávek se jménem, telefonem, e-mailem, poznámkou a cenou,
- kolik peněz celkem vybrat,
- tlačítka **Kopírovat seznam** (text do e-mailu nebo zprávy) a **Stáhnout pro Excel (CSV)**,
- možnost smazat objednávku.

Bez napojení na Google běží stránka v **ukázkovém režimu**: objednávky se ukládají jen v prohlížeči
a heslo do správy je `tricka`. Pro ostrý provoz udělejte kroky níže.

## 1. Napojení na Google Tabulku (zdarma, asi 5 minut)

1. Na [sheets.new](https://sheets.new) založte novou Google Tabulku (třeba „Objednávky CLS“).
2. V menu **Rozšíření → Apps Script**.
3. Smažte ukázkový kód a vložte celý obsah souboru `google-apps-script.gs`.
4. Na začátku kódu změňte `ADMIN_PASSWORD` na vlastní heslo. Tím heslem se pak přihlásíte do správy.
5. Klikněte na **Nasadit → Nové nasazení**, typ **Webová aplikace**:
   - *Spustit jako:* **Já**
   - *Kdo má přístup:* **Kdokoli**
6. Klikněte na **Nasadit** a povolte přístup k účtu Google.
7. Zkopírujte **URL webové aplikace**. Vypadá jako `https://script.google.com/macros/s/…/exec`.
8. V `index.html` najděte `scriptUrl: ""` a URL vložte mezi uvozovky.

Objednávky se od té chvíle ukládají do listu **Objednávky** ve vaší tabulce. Najdete je tam i bez stránky.

> Když později kód v Apps Scriptu změníte, nasaďte ho znovu přes **Nasadit → Spravovat nasazení → upravit → Nová verze**.
> URL zůstane stejná.

## 2. Úpravy

Vše je v `index.html` v bloku `CONFIG`:
- `title`: název (potisk) nahoře na stránce,
- `deadline`: text s termínem uzávěrky (např. „Objednávky do 15. 10.“),
- `variants`: barvy a fotky (`img/cerna.jpg`, `img/oliva.jpg`),
- `cuts`: střihy (teď **FIT** a **EVERYDAY**, obojí za 479 Kč). Každý má vlastní cenu (`price`), popis (`specs`), obrázek tabulky (`chart`)
  a velikosti s rozměry A, B a C. Další střih přidáte zkopírováním jednoho bloku.

## 3. Zveřejnění

Nahrajte složku `objednavka` (tedy `index.html` a složku `img`) na svůj hosting nebo zapněte GitHub Pages.
Odkaz pak rozešlete lidem. Do stávajícího webu stránku vložíte přes `<iframe>`.

## Bezpečnost

Heslo se kontroluje na straně Googlu. Seznam objednávek tak bez hesla nikdo nestáhne,
ani když si prohlédne kód stránky. Heslo je uložené jen ve vašem Apps Scriptu. Do `index.html` ho nepište.
