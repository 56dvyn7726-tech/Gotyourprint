/**
 * NASTAVENÍ objednávek triček CLS.
 * Tady měňte své údaje. Program je v souboru „Kod“ – při aktualizaci se vyměňuje jen ten,
 * tento soubor zůstává. Po každé změně: Uložit → Nasadit → Spravovat nasazení → tužka → Nová verze → Nasadit.
 */

// ZMĚŇTE! Tímto heslem se přihlásíte do "Správy objednávek". Aspoň 8 znaků, nepoužívejte heslo od e-mailu.
// Dokud tu zůstane výchozí nebo krátké heslo, správa objednávek se neotevře.
const ADMIN_PASSWORD = 'ZMENTE-TOTO-HESLO';

// Přijímání objednávek: false = zavřít hned (a nasadit novou verzi).
const ORDERS_OPEN = true;
// Uzávěrka: po tomto okamžiku se objednávky zavřou samy (prázdné = bez automatické uzávěrky).
const ORDERS_CLOSE_AT = '2026-10-15T23:59:59+02:00';

// ---- Platba převodem ----
const BANK_ACCOUNT = '';                     // číslo účtu, např. '123456789/0100', '19-123456789/0800' nebo IBAN 'CZ65 0800 …' (prázdné = platbu nezobrazovat)
const PAYMENT_MESSAGE = 'CLS tricko';        // zpráva pro příjemce, doplní se jméno zákazníka
const VS_START = 1001;                       // první variabilní symbol, další objednávky dostanou 1002, 1003…
const PAYMENT_DAYS = 7;                      // do kolika dní zaplatit (0 = neuvádět)

// ---- Potvrzovací e-maily zákazníkům (odcházejí z vašeho účtu Google) ----
const SEND_CONFIRMATION = true;              // false = e-maily neposílat
const SHOP_NAME = '';                        // jméno odesílatele a podpis v e-mailu (prázdné = jméno vašeho účtu Google, bez podpisu)
const ORDER_TITLE = 'Combat Life Saver';     // co se objednává
const OWNER_EMAIL = '';                      // váš e-mail: dostanete kopii každého potvrzení (prázdné = ne)
const PAGE_URL = 'https://56dvyn7726-tech.github.io/Gotyourprint/CLS/'; // odkaz na objednávkovou stránku (vloží se do e-mailu)
// Doplňující text do e-mailu, např. kde si trička vyzvednout. Každý řádek zvlášť.
const EMAIL_INFO = [
  'Objednávky přijímáme do 15. 10. 2026. Trička vám doručíme na váš domovský útvar.',
];

// Nabídka: ceny za kus, barvy a velikosti podle střihu. Musí odpovídat stránce.
const CATALOG = {
  FIT:      { price: 479, sizes: ['S', 'M', 'L', 'XL', '2XL'] },
  EVERYDAY: { price: 479, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] },
};
const COLORS = ['Černá', 'Oliva'];

// Ochrana proti zneužití (za 6 hodin)
const LIMIT_NEW_PER_EMAIL = 5;     // nových objednávek na jeden e-mail
const LIMIT_NEW_TOTAL = 300;       // nových objednávek celkem
const LIMIT_SAVES_PER_ORDER = 30;  // úprav jedné objednávky
