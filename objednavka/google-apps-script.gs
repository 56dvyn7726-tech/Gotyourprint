/**
 * GotYourPrint – ukládání objednávek triček do Google Tabulky.
 * Postup nasazení je v souboru NAVOD.md.
 */

// ZMĚŇTE! Tímto heslem se přihlásíte do "Správy objednávek".
const ADMIN_PASSWORD = 'ZMENTE-TOTO-HESLO';

// ---- Potvrzovací e-maily zákazníkům (odcházejí z vašeho účtu Google) ----
const SEND_CONFIRMATION = true;              // false = e-maily neposílat
const SHOP_NAME = 'GotYourPrint';            // jméno odesílatele
const ORDER_TITLE = 'Combat Life Saver';     // co se objednává
const OWNER_EMAIL = '';                      // váš e-mail: dostanete kopii každého potvrzení (prázdné = ne)
const PAGE_URL = '';                         // odkaz na objednávkovou stránku (vloží se do e-mailu)
// Doplňující text do e-mailu, např. jak a kdy platit a kde si trička vyzvednout. Každý řádek zvlášť.
const EMAIL_INFO = [
  // 'Platbu 479 Kč za kus prosím pošlete na účet 123456789/0100, do zprávy uveďte své jméno.',
  // 'Trička budou k vyzvednutí přibližně 3 týdny po uzávěrce objednávek.',
];

// Ceny za kus podle střihu (první slovo položky, např. "FIT Černá M")
const PRICES = { FIT: 479, EVERYDAY: 479 };

const SHEET_NAME = 'Objednávky';
const HEADER = ['ID', 'Vytvořeno', 'Upraveno', 'Jméno', 'Telefon', 'E-mail', 'Poznámka', 'Položky', 'Kusů', 'Cena (Kč)', 'Data (nemazat)'];
const COL_DATA = HEADER.length; // poslední sloupec s položkami ve formátu JSON

function doGet() {
  return out({ ok: true, message: 'Objednávky GotYourPrint běží.' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return out({ ok: false, error: 'bad_request' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    switch (req.action) {
      case 'save':
        return out(saveOrder(req.order));
      case 'cancel': {
        const removed = removeOrder(req.id);
        if (removed) sendMail('cancel', removed);
        return out({ ok: true });
      }
      case 'list':
      case 'delete':
        if (req.password !== ADMIN_PASSWORD) return out({ ok: false, error: 'bad_password' });
        if (req.action === 'delete') removeOrder(req.id);
        return out({ ok: true, orders: listOrders() });
      default:
        return out({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return out({ ok: false, error: 'invalid', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADER);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADER.length).setFontWeight('bold');
  }
  return sh;
}

function findRow(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return -1;
}

// Text, který začíná = + - @, by tabulka brala jako vzorec.
function safe(v, max) {
  const s = String(v == null ? '' : v).trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function validId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id);
}

function saveOrder(o) {
  if (!o || !validId(o.id)) throw new Error('bad id');
  const name = safe(o.name, 100);
  const phone = safe(o.phone, 30);
  const email = safe(o.email, 120);
  if (!name || !phone || !email) throw new Error('missing name/phone/email');

  const items = {};
  let count = 0;
  Object.keys(o.items || {}).slice(0, 50).forEach(function (k) {
    const q = Math.floor(Number(o.items[k]));
    if (k.length <= 40 && q > 0 && q <= 99) {
      items[k] = q;
      count += q;
    }
  });
  if (!count) throw new Error('no items');
  const price = orderPrice(items);

  const itemsText = Object.keys(items).map(function (k) { return k + ' ×' + items[k]; }).join(', ');
  const sh = getSheet();
  const now = new Date();
  const rowNum = findRow(sh, o.id);
  const old = rowNum > 0 ? sh.getRange(rowNum, 1, 1, HEADER.length).getValues()[0] : null;
  const created = old ? old[1] : now;
  const row = [o.id, created, now, name, phone, email, safe(o.note, 500), itemsText, count, price, JSON.stringify(items)];

  // beze změny = nic neukládat ani neposílat (ochrana proti opakovanému klikání)
  const changed = !old || [3, 4, 5, 6, 10].some(function (i) { return String(old[i]) !== String(row[i]); });
  if (!changed) return { ok: true, updated: new Date(old[2]).toISOString(), emailSent: false };

  if (old) sh.getRange(rowNum, 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);

  const emailSent = sendMail(old ? 'update' : 'new', rowToOrder(row));
  return { ok: true, updated: now.toISOString(), emailSent: emailSent };
}

function orderPrice(items) {
  return Object.keys(items).reduce(function (sum, k) {
    return sum + items[k] * (PRICES[k.split(' ')[0]] || 0);
  }, 0);
}

function removeOrder(id) {
  if (!validId(id)) return;
  const sh = getSheet();
  const rowNum = findRow(sh, id);
  if (rowNum < 0) return null;
  const order = rowToOrder(sh.getRange(rowNum, 1, 1, HEADER.length).getValues()[0]);
  sh.deleteRow(rowNum);
  return order;
}

function rowToOrder(r) {
  let items = {};
  try { items = JSON.parse(r[COL_DATA - 1]); } catch (err) { /* poškozený řádek */ }
  const strip = function (v) { return String(v).replace(/^'/, ''); };
  return {
    id: r[0],
    created: r[1] instanceof Date ? r[1].toISOString() : String(r[1]),
    updated: r[2] instanceof Date ? r[2].toISOString() : String(r[2]),
    name: strip(r[3]),
    phone: strip(r[4]),
    email: strip(r[5]),
    note: strip(r[6]),
    items: items,
  };
}

function listOrders() {
  const sh = getSheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, HEADER.length).getValues().map(rowToOrder);
}

/* ---------- Potvrzovací e-mail ---------- */

function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

function kc(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Kč';
}

// kind: 'new' | 'update' | 'cancel'. Vrací true, když e-mail odešel.
function sendMail(kind, o) {
  if (!SEND_CONFIRMATION || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.email)) return false;
  try {
    const keys = Object.keys(o.items);
    const count = keys.reduce(function (a, k) { return a + o.items[k]; }, 0);
    const total = orderPrice(o.items);
    const heading = {
      new: 'Děkujeme za objednávku',
      update: 'Vaše objednávka byla upravena',
      cancel: 'Vaše objednávka byla zrušena',
    }[kind];
    const subject = {
      new: 'Potvrzení objednávky – ',
      update: 'Úprava objednávky – ',
      cancel: 'Zrušení objednávky – ',
    }[kind] + ORDER_TITLE;
    const intro = kind === 'cancel'
      ? 'potvrzujeme zrušení vaší objednávky. Pokud jste ji zrušili omylem, stačí ji na stránce vyplnit znovu.'
      : kind === 'update'
        ? 'vaši objednávku jsme upravili. Platí tento aktuální stav:'
        : 'vaši objednávku jsme přijali. Tady je její shrnutí:';

    const rows = keys.map(function (k) {
      const unit = PRICES[k.split(' ')[0]] || 0;
      return '<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">' + esc(k) + '</td>' +
        '<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">' + o.items[k] + ' ks</td>' +
        '<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">' + kc(unit * o.items[k]) + '</td></tr>';
    }).join('');
    const table = kind === 'cancel' ? '' :
      '<table style="border-collapse:collapse;width:100%;max-width:520px;margin:12px 0">' + rows +
      '<tr><td style="padding:8px 10px;font-weight:bold">Celkem</td>' +
      '<td style="padding:8px 10px;text-align:right;font-weight:bold">' + count + ' ks</td>' +
      '<td style="padding:8px 10px;text-align:right;font-weight:bold">' + kc(total) + '</td></tr></table>';
    const contact = kind === 'cancel' ? '' :
      '<p style="margin:12px 0;color:#555">Kontakt: ' + esc(o.name) + ', ' + esc(o.phone) + ', ' + esc(o.email) +
      (o.note ? '<br>Poznámka: ' + esc(o.note) : '') + '</p>';
    const info = kind === 'cancel' ? '' : EMAIL_INFO.map(function (t) { return '<p style="margin:8px 0">' + esc(t) + '</p>'; }).join('');
    const link = PAGE_URL && kind !== 'cancel'
      ? '<p style="margin:12px 0">Objednávku můžete upravit nebo zrušit na <a href="' + esc(PAGE_URL) + '">stránce objednávky</a> (otevřete ji ve stejném prohlížeči, ve kterém jste objednávali).</p>'
      : '';

    const html = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;line-height:1.5">' +
      '<h2 style="margin:0 0 8px">' + esc(heading) + '</h2>' +
      '<p style="margin:0 0 8px">Dobrý den, ' + esc(o.name) + ',<br>' + intro + '</p>' +
      table + contact + info + link +
      '<p style="margin:16px 0 0;color:#777">' + esc(SHOP_NAME) + '</p></div>';

    const text = heading + '\n\n' + 'Dobrý den, ' + o.name + ',\n' + intro + '\n\n' +
      (kind === 'cancel' ? '' : keys.map(function (k) { return k + ': ' + o.items[k] + ' ks'; }).join('\n') +
        '\nCelkem: ' + count + ' ks, ' + kc(total) + '\n\n' + EMAIL_INFO.join('\n') + '\n') +
      (PAGE_URL && kind !== 'cancel' ? '\nÚprava objednávky: ' + PAGE_URL + '\n' : '') + '\n' + SHOP_NAME;

    const mail = { to: o.email, subject: subject, htmlBody: html, body: text, name: SHOP_NAME };
    if (OWNER_EMAIL) {
      mail.bcc = OWNER_EMAIL;
      mail.replyTo = OWNER_EMAIL;
    }
    MailApp.sendEmail(mail);
    return true;
  } catch (err) {
    console.error('E-mail se nepodařilo odeslat: ' + err);
    return false;
  }
}
