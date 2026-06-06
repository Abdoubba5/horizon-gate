/**
 * HorizonDB — Local Storage Engine v4
 * بوابة الأفق | محرك قاعدة البيانات المحلية
 * Abdelilah Sidiali © 2026
 */

const HorizonDB = (() => {
  const STORAGE_KEY   = "horizon_gate_v3_data";
  const SAVED_KEY     = "horizon_gate_saved_v1";
  const REMINDED_KEY  = "horizon_gate_reminders_v1";
  const THEME_KEY     = "horizon_gate_theme_v1";

  // ─── Internal ────────────────────────────────────────────────
  function _readRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch { return []; }
  }

  function _writeRaw(data) {
    if (!Array.isArray(data)) throw new TypeError("HorizonDB: data must be an array");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function _generateId() {
    return `hzn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function _validateItem(item) {
    if (!item || typeof item !== "object") return false;
    const req = ["title","url","type","funding","country","deadline","desc"];
    return req.every(f => typeof item[f] === "string" && item[f].trim() !== "");
  }

  // ─── Opportunities CRUD ───────────────────────────────────────
  async function getAll() {
    return new Promise((resolve, reject) => {
      try { resolve(_readRaw()); }
      catch (err) { reject(err); }
    });
  }

  async function getById(id) {
    const data = await getAll();
    return data.find(r => r.id === id) || null;
  }

  async function save(item) {
    return new Promise((resolve, reject) => {
      try {
        if (!_validateItem(item)) {
          reject(new Error("HorizonDB.save: validation failed")); return;
        }
        const data = _readRaw();
        const now  = new Date().toISOString();
        if (!item.id) {
          const newItem = { ...item, id: _generateId(), createdAt: now };
          data.unshift(newItem);
          _writeRaw(data);
          resolve(newItem);
        } else {
          const idx = data.findIndex(r => r.id === item.id);
          if (idx === -1) {
            const newItem = { ...item, createdAt: item.createdAt || now };
            data.unshift(newItem);
            _writeRaw(data);
            resolve(newItem);
          } else {
            data[idx] = { ...data[idx], ...item };
            _writeRaw(data);
            resolve(data[idx]);
          }
        }
      } catch (err) {
        if (err.name === "QuotaExceededError")
          reject(new Error("تجاوز حد التخزين المحلي."));
        else reject(err);
      }
    });
  }

  async function deleteById(id) {
    return new Promise((resolve, reject) => {
      try {
        if (!id) { reject(new Error("invalid id")); return; }
        const data     = _readRaw();
        const filtered = data.filter(r => r.id !== id);
        _writeRaw(filtered);
        resolve(filtered.length !== data.length);
      } catch (err) { reject(err); }
    });
  }

  async function importBulk(items) {
    return new Promise((resolve, reject) => {
      try {
        if (!Array.isArray(items)) { reject(new Error("must be array")); return; }
        const data = _readRaw();
        const ids  = new Set(data.map(r => r.id));
        let added  = 0;
        const now  = new Date().toISOString();
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          if (!item.id) item.id = _generateId();
          if (ids.has(item.id)) continue;
          if (!item.createdAt) item.createdAt = now;
          data.unshift(item);
          ids.add(item.id);
          added++;
        }
        _writeRaw(data);
        resolve(added);
      } catch (err) { reject(err); }
    });
  }

  async function count()    { return (await getAll()).length; }
  async function clearAll() {
    return new Promise((resolve, reject) => {
      try { localStorage.removeItem(STORAGE_KEY); resolve(); }
      catch(err) { reject(err); }
    });
  }

  // ─── Saved / Bookmarks ───────────────────────────────────────
  function getSavedIds() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); }
    catch { return []; }
  }
  function toggleSaved(id) {
    const ids = getSavedIds();
    const idx = ids.indexOf(id);
    if (idx === -1) ids.push(id); else ids.splice(idx, 1);
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
    return idx === -1; // true = now saved
  }
  function isSaved(id) { return getSavedIds().includes(id); }
  async function getSavedItems() {
    const ids  = getSavedIds();
    const all  = await getAll();
    return all.filter(i => ids.includes(i.id));
  }

  // ─── Reminders ───────────────────────────────────────────────
  function getReminderIds() {
    try { return JSON.parse(localStorage.getItem(REMINDED_KEY) || "[]"); }
    catch { return []; }
  }
  function toggleReminder(id) {
    const ids = getReminderIds();
    const idx = ids.indexOf(id);
    if (idx === -1) ids.push(id); else ids.splice(idx, 1);
    localStorage.setItem(REMINDED_KEY, JSON.stringify(ids));
    return idx === -1;
  }
  function isReminded(id)     { return getReminderIds().includes(id); }
  function getReminderCount() { return getReminderIds().length; }

  // ─── Theme ───────────────────────────────────────────────────
  function getTheme()      { return localStorage.getItem(THEME_KEY) || "dark"; }
  function setTheme(theme) { localStorage.setItem(THEME_KEY, theme); }

  return {
    getAll, getById, save, delete: deleteById, importBulk, count, clearAll,
    // saved
    getSavedIds, toggleSaved, isSaved, getSavedItems,
    // reminders
    getReminderIds, toggleReminder, isReminded, getReminderCount,
    // theme
    getTheme, setTheme
  };
})();

