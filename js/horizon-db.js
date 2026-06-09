/**
 * HorizonDB — Supabase Engine v5
 * بوابة الأفق | قاعدة البيانات المشتركة
 * Abdelilah Sidiali © 2026
 */

const HorizonDB = (() => {

  // ══════════════════════════════════════════════════════════
  // CONFIG
  // ══════════════════════════════════════════════════════════
  const SUPABASE_URL      = "https://xhzjpccmaevzyvpcsbwa.supabase.co";
  const SUPABASE_ANON     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoempwY2NtYWV2enl2cGNzYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mjk3OTYsImV4cCI6MjA5NjMwNTc5Nn0.mB1Wgzn9A3SukK3fQdEP3CjmoDcpvs_XIbXaXkbUp5s";
  const SUPABASE_SERVICE  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoempwY2NtYWV2enl2cGNzYndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDcyOTc5NiwiZXhwIjoyMDk2MzA1Nzk2fQ.9Hsj6EHqWJuUz4ibdLOSEs32FautbMCy5DTAIl8e5-A";
  const TABLE             = "opportunities";
  const BASE              = `${SUPABASE_URL}/rest/v1/${TABLE}`;

  // ── مفتاح الكتابة — يُفعَّل من الأدمن بعد تسجيل الدخول
  let _writeKey = SUPABASE_ANON; // القيمة الافتراضية للقراءة فقط

  function setAdminKey()  { _writeKey = SUPABASE_SERVICE; }
  function clearAdminKey(){ _writeKey = SUPABASE_ANON; }
  function isAdmin()      { return _writeKey === SUPABASE_SERVICE; }

  // ══════════════════════════════════════════════════════════
  // HTTP HELPERS
  // ══════════════════════════════════════════════════════════
  function hdrs(write = false) {
    const key = write ? _writeKey : SUPABASE_ANON;
    return {
      "Content-Type":  "application/json",
      "apikey":        key,
      "Authorization": `Bearer ${key}`,
      "Prefer":        write ? "return=representation" : "",
    };
  }

  async function req(url, opts = {}) {
    const res  = await fetch(url, opts);
    const text = await res.text();
    if (!res.ok) {
      let msg = text;
      try { msg = JSON.parse(text).message || text; } catch {}
      throw new Error(msg);
    }
    return text ? JSON.parse(text) : null;
  }

  // ══════════════════════════════════════════════════════════
  // ROW MAPPING
  // ══════════════════════════════════════════════════════════
  function toItem(row) {
    if (!row) return null;
    return {
      id:        row.id,
      title:     row.title,
      url:       row.url,
      type:      row.type,
      funding:   row.funding,
      country:   row.country,
      deadline:  row.deadline,
      desc:      row.desc,
      image:     row.image      || "",
      tags:      Array.isArray(row.tags) ? row.tags : [],
      createdAt: row.created_at || row.createdAt,
    };
  }

  function toRow(item) {
    const row = {
      title:    (item.title    || "").trim(),
      url:      (item.url      || "").trim(),
      type:     (item.type     || "").trim(),
      funding:  (item.funding  || "").trim(),
      country:  (item.country  || "").trim(),
      deadline:  item.deadline || "",
      desc:     (item.desc     || "").trim(),
      image:     item.image    || "",
      tags:      Array.isArray(item.tags) ? item.tags : [],
    };
    if (item.id)        row.id         = item.id;
    if (item.createdAt) row.created_at = item.createdAt;
    return row;
  }

  // ══════════════════════════════════════════════════════════
  // CACHE (30 ثانية)
  // ══════════════════════════════════════════════════════════
  let _cache   = null;
  let _cacheTs = 0;
  const TTL    = 30000;

  function invalidateCache() { _cache = null; _cacheTs = 0; }

  // ══════════════════════════════════════════════════════════
  // CRUD
  // ══════════════════════════════════════════════════════════

  async function getAll() {
    if (_cache && (Date.now() - _cacheTs) < TTL) return _cache;
    const data  = await req(`${BASE}?select=*&order=created_at.desc`, { headers: hdrs() });
    const items = (data || []).map(toItem);
    _cache   = items;
    _cacheTs = Date.now();
    return items;
  }

  async function getById(id) {
    if (_cache) {
      const hit = _cache.find(i => i.id === id);
      if (hit) return hit;
    }
    const data = await req(
      `${BASE}?id=eq.${encodeURIComponent(id)}&select=*`,
      { headers: hdrs() }
    );
    return data?.[0] ? toItem(data[0]) : null;
  }

  async function save(item) {
    invalidateCache();
    const row = toRow(item);

    if (!item.id) {
      // INSERT جديد
      const data = await req(BASE, {
        method:  "POST",
        headers: hdrs(true),
        body:    JSON.stringify(row),
      });
      return toItem(Array.isArray(data) ? data[0] : data);
    } else {
      // UPDATE موجود
      const data = await req(
        `${BASE}?id=eq.${encodeURIComponent(item.id)}`,
        { method: "PATCH", headers: hdrs(true), body: JSON.stringify(row) }
      );
      return toItem(Array.isArray(data) ? data[0] : data) || item;
    }
  }

  async function deleteById(id) {
    invalidateCache();
    await req(
      `${BASE}?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers: hdrs(true) }
    );
    return true;
  }

  async function importBulk(items) {
    invalidateCache();
    const rows = items.filter(i => i && typeof i === "object").map(toRow);
    const data = await req(BASE, {
      method:  "POST",
      headers: { ...hdrs(true), "Prefer": "resolution=ignore-duplicates,return=representation" },
      body:    JSON.stringify(rows),
    });
    return Array.isArray(data) ? data.length : 0;
  }

  async function count() {
    const res   = await fetch(`${BASE}?select=id`, {
      headers: { ...hdrs(), "Prefer": "count=exact" }
    });
    const range = res.headers.get("Content-Range") || "0/0";
    return parseInt(range.split("/")[1] || "0", 10);
  }

  async function clearAll() {
    invalidateCache();
    await req(`${BASE}?id=neq.NONE__ALL`, {
      method:  "DELETE",
      headers: hdrs(true),
    });
  }

  // ══════════════════════════════════════════════════════════
  // REALTIME — تحديث تلقائي فوري عبر WebSocket
  // ══════════════════════════════════════════════════════════
  let _ws = null;

  function subscribeRealtime(callback) {
    if (_ws) return;
    const wsBase = SUPABASE_URL.replace("https://","wss://");
    const url    = `${wsBase}/realtime/v1/websocket?apikey=${SUPABASE_ANON}&vsn=1.0.0`;

    function connect() {
      _ws = new WebSocket(url);

      _ws.onopen = () => {
        _ws.send(JSON.stringify({
          topic:   "realtime:public:opportunities",
          event:   "phx_join",
          payload: { config: { broadcast: { self: true } } },
          ref:     "1",
        }));
      };

      _ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (["INSERT","UPDATE","DELETE"].includes(msg?.payload?.type)) {
            invalidateCache();
            if (typeof callback === "function") callback(msg.payload);
          }
        } catch {}
      };

      _ws.onclose = () => { _ws = null; setTimeout(connect, 3000); };
      _ws.onerror = () => { _ws?.close(); };
    }

    connect();
  }

  // ══════════════════════════════════════════════════════════
  // LOCAL — محفوظات / تذكيرات / ثيم
  // ══════════════════════════════════════════════════════════
  const SAVED_KEY    = "horizon_gate_saved_v1";
  const REMINDED_KEY = "horizon_gate_reminders_v1";
  const THEME_KEY    = "horizon_gate_theme_v1";

  const _ls = (k, d="[]") => { try { return JSON.parse(localStorage.getItem(k)||d); } catch { return JSON.parse(d); } };
  const _lw = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  function getSavedIds()   { return _ls(SAVED_KEY); }
  function toggleSaved(id) {
    const ids = getSavedIds(), idx = ids.indexOf(id);
    idx === -1 ? ids.push(id) : ids.splice(idx,1);
    _lw(SAVED_KEY, ids); return idx === -1;
  }
  function isSaved(id)     { return getSavedIds().includes(id); }
  async function getSavedItems() {
    const ids = getSavedIds(), all = await getAll();
    return all.filter(i => ids.includes(i.id));
  }

  function getReminderIds()   { return _ls(REMINDED_KEY); }
  function toggleReminder(id) {
    const ids = getReminderIds(), idx = ids.indexOf(id);
    idx === -1 ? ids.push(id) : ids.splice(idx,1);
    _lw(REMINDED_KEY, ids); return idx === -1;
  }
  function isReminded(id)     { return getReminderIds().includes(id); }
  function getReminderCount() { return getReminderIds().length; }

  function getTheme()         { return localStorage.getItem(THEME_KEY) || "dark"; }
  function setTheme(t)        { localStorage.setItem(THEME_KEY, t); }

  // ══════════════════════════════════════════════════════════
  return {
    getAll, getById, save,
    delete:   deleteById,
    importBulk, count, clearAll,
    subscribeRealtime, invalidateCache,
    getSavedIds, toggleSaved, isSaved, getSavedItems,
    getReminderIds, toggleReminder, isReminded, getReminderCount,
    getTheme, setTheme,
    setAdminKey, clearAdminKey, isAdmin,
  };
})();

