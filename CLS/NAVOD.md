# Objednávka triček – návod

Stránka `index.html` v této složce slouží k hromadné objednávce triček s daným potiskem.
Zákazník vybere střih (FIT nebo EVERYDAY), barvu, velikost a počet kusů, vidí tabulku rozměrů a vyplní jméno, příjmení, telefon, e-mail a domovský útvar (tam se trička doručí).
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
3. Skript má dva soubory ve složce `apps-script`:
   - **Kod**: smažte ukázkový kód v souboru `Kód.gs` a vložte celý obsah `apps-script/Kod.gs`,
   - **Nastaveni**: vlevo u „Soubory“ klikněte na **+ → Skript**, pojmenujte ho `Nastaveni` a vložte obsah `apps-script/Nastaveni.gs`.
     Tady vyplníte své údaje.

   Při pozdějších aktualizacích se vyměňuje **jen soubor Kod**, vaše nastavení zůstane.
4. V souboru Nastaveni změňte `ADMIN_PASSWORD` na vlastní heslo. Tím heslem se pak přihlásíte do správy.
5. Klikněte na **Nasadit → Nové nasazení**, typ **Webová aplikace**:
   - *Spustit jako:* **Já**
   - *Kdo má přístup:* **Kdokoli**
6. Klikněte na **Nasadit** a povolte přístup k účtu Google.
7. Zkopírujte **URL webové aplikace**. Vypadá jako `https://script.google.com/macros/s/…/exec`.
8. V `index.html` najděte `scriptUrl: ""` a URL vložte mezi uvozovky.

Objednávky se od té chvíle ukládají do listu **Objednávky** ve vaší tabulce. Najdete je tam i bez stránky.

### Platba převodem

Na začátku skriptu vyplňte `BANK_ACCOUNT` (např. `'123456789/0100'`). Každá objednávka pak dostane
vlastní **variabilní symbol** (1001, 1002, …; nikdy se neopakuje). Zákazník hned po objednání uvidí
na stránce i v e-mailu číslo účtu, částku, VS a **QR Platbu** pro mobilní bankovnictví.

Když vám přijde platba, najděte ve správě objednávku se stejným VS a klikněte na **Označit jako zaplaceno**.
Zákazníkovi přijde e-mail „Platba přijata“ a zaplacenou objednávku už nemůže sám změnit ani zrušit.
Ve správě vidíte, kolik je zaplaceno a kolik čeká na platbu, a můžete filtrovat nezaplacené.

Další nastavení: `PAYMENT_MESSAGE` (zpráva pro příjemce), `VS_START` (první VS), `PAYMENT_DAYS` (splatnost).

### Potvrzovací e-maily

Zákazník po odeslání, úpravě i zrušení objednávky dostane e-mail se shrnutím a cenou. E-mail odchází
z vašeho účtu Google (uvidíte ho v Gmailu v Odeslané poště). Nastavení je na začátku skriptu:

- `SEND_CONFIRMATION`: `true` e-maily posílá, `false` je vypne,
- `SHOP_NAME`: jméno odesílatele a podpis. Prázdné = odesílatelem bude jméno vašeho účtu Google a e-mail nebude mít podpis.
- `OWNER_EMAIL`: váš e-mail. Dostanete skrytou kopii každého potvrzení a odpovědi zákazníků půjdou vám.
- `PAGE_URL`: odkaz na objednávkovou stránku, vloží se do e-mailu kvůli úpravám,
- `EMAIL_INFO`: vlastní řádky textu, např. číslo účtu pro platbu nebo informace o vyzvednutí.

Při prvním nasazení s e-maily Google požádá o povolení **odesílat e-maily vaším jménem**. Povolte ho.
Běžný účet Gmail zvládne asi **100 e-mailů denně** (s kopií pro vás se každé potvrzení počítá dvakrát).

> Když později kód v Apps Scriptu změníte, nasaďte ho znovu přes **Nasadit → Spravovat nasazení → upravit → Nová verze**.
> URL zůstane stejná.

### Uzávěrka

Objednávky se samy zavřou v okamžiku `ORDERS_CLOSE_AT` (teď 15. 10. 2026 ve 23:59). Zavřít je hned jde
přepsáním `ORDERS_OPEN = true` na `false` a nasazením nové verze. Stránka pak ukáže
„Objednávky jsou už uzavřené“ a nové objednávky ani změny nepřijme. Správa objednávek funguje dál.

### Kontrola nastavení

Otevřete adresu skriptu (končí `/exec`) v prohlížeči. Ukáže verzi skriptu a jestli je v pořádku platba,
e-maily, heslo a jestli jsou objednávky otevřené.

## 2. Úpravy

Vše je v `index.html` v bloku `CONFIG`:
- `title`: název (potisk) nahoře na stránce,
- `deadline`: text s termínem uzávěrky (např. „Objednávky do 15. 10.“),
- `variants`: barvy a fotky (`img/cerna.jpg`, `img/oliva.jpg`),
- `cuts`: střihy (teď **FIT** a **EVERYDAY**, obojí za 479 Kč). Každý má vlastní cenu (`price`), popis (`specs`), obrázek tabulky (`chart`)
  a velikosti s rozměry A, B a C. Další střih přidáte zkopírováním jednoho bloku.

## 3. Zveřejnění

Stránka běží na GitHub Pages: **https://56dvyn7726-tech.github.io/Gotyourprint/CLS/** (správa: `…/CLS/#sprava`).
Stará adresa `…/objednavka/` automaticky přesměruje sem. Na vlastní hosting nahrajte složku `CLS` (`index.html`, `qrcode.js` a složku `img`).
Odkaz pak rozešlete lidem. Do stávajícího webu stránku vložíte přes `<iframe>`.

## Bezpečnost

- Heslo do správy se kontroluje u Googlu, v kódu stránky ani na GitHubu není. Musí mít aspoň 8 znaků
  a nesmí zůstat výchozí, jinak je správa zablokovaná. Po 10 špatných pokusech se správa na 15 minut zamkne.
- Ochrana proti zneužití: nejvýš 5 nových objednávek na jeden e-mail a 300 celkem za 6 hodin,
  skryté pole proti robotům. Limity jdou změnit na začátku skriptu (`LIMIT_…`).
- Skript přijme jen trička z nabídky (`CATALOG`, `COLORS`) a cenu počítá sám, nevěří ceně ze stránky.
- Text, který by tabulka nebo Excel spustily jako vzorec, se ukládá jako obyčejný text.
- Zákazník musí zaškrtnout souhlas se zpracováním údajů. Po vyřízení objednávek data z tabulky smažte.
- Google Tabulku nesdílejte s nikým, kdo k objednávkám nemá mít přístup.
