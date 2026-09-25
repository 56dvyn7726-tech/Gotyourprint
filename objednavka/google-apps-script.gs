/**
 * GotYourPrint – ukládání objednávek triček do Google Tabulky.
 * Postup nasazení je v souboru NAVOD.md.
 */

// ZMĚŇTE! Tímto heslem se přihlásíte do "Správy objednávek".
const ADMIN_PASSWORD = 'ZMENTE-TOTO-HESLO';

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
      case 'cancel':
        removeOrder(req.id);
        return out({ ok: true });
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
  const price = Math.max(0, Math.min(1000000, Math.round(Number(o.price) || 0)));

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

  const itemsText = Object.keys(items).map(function (k) { return k + ' ×' + items[k]; }).join(', ');
  const sh = getSheet();
  const now = new Date();
  const rowNum = findRow(sh, o.id);
  const created = rowNum > 0 ? sh.getRange(rowNum, 2).getValue() : now;
  const row = [o.id, created, now, name, phone, email, safe(o.note, 500), itemsText, count, price, JSON.stringify(items)];

  if (rowNum > 0) sh.getRange(rowNum, 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);

  return { ok: true, updated: now.toISOString() };
}

function removeOrder(id) {
  if (!validId(id)) return;
  const sh = getSheet();
  const rowNum = findRow(sh, id);
  if (rowNum > 0) sh.deleteRow(rowNum);
}

function listOrders() {
  const sh = getSheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, HEADER.length).getValues().map(function (r) {
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
  });
}
