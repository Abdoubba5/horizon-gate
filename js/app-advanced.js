/**
 * app-advanced.js — Real-Time Orchestrator v4
 * بوابة الأفق | محرك المزامنة الفورية
 * Abdelilah Sidiali © 2026
 */

const syncChannel = new BroadcastChannel("horizon_gate_pipeline_v3");

const HorizonApp = (() => {
  let _currentPage    = null;
  let _searchQuery    = "";
  let _activeFilter   = "الكل";
  let _renderCallback = null;

  // BroadcastChannel
  syncChannel.onmessage = (event) => {
    if (event.data === "update_ui" && typeof _renderCallback === "function")
      _renderCallback();
  };

  function registerPage(pageName, renderFn) {
    _currentPage    = pageName;
    _renderCallback = renderFn;
  }

  function broadcastUpdate() {
    syncChannel.postMessage("update_ui");
    if (typeof _renderCallback === "function") _renderCallback();
  }

  // ─── Deadline Utils ──────────────────────────────────────────
  function isExpired(d) {
    if (!d) return false;
    const dl = new Date(d); dl.setHours(0,0,0,0);
    const td = new Date();  td.setHours(0,0,0,0);
    return dl < td;
  }

  function getCountdown(d) {
    if (!d) return "—";
    const dl   = new Date(d); dl.setHours(0,0,0,0);
    const td   = new Date();  td.setHours(0,0,0,0);
    const diff = Math.round((dl - td) / 86400000);
    if (diff < 0)  return "منتهية";
    if (diff === 0) return "آخر يوم!";
    if (diff === 1) return "باقي يوم واحد";
    if (diff <= 3)  return `باقي ${diff} أيام ⚠️`;
    return `باقي ${diff} يوم`;
  }

  function getCountdownClass(d) {
    if (!d) return "";
    const dl   = new Date(d); dl.setHours(0,0,0,0);
    const td   = new Date();  td.setHours(0,0,0,0);
    const diff = Math.round((dl - td) / 86400000);
    if (diff < 0)  return "expired";
    if (diff <= 3) return "urgent";
    if (diff <= 7) return "soon";
    return "active";
  }

  function daysUntil(d) {
    if (!d) return null;
    const dl = new Date(d); dl.setHours(0,0,0,0);
    const td = new Date();  td.setHours(0,0,0,0);
    return Math.round((dl - td) / 86400000);
  }

  // ─── Filter/Search ───────────────────────────────────────────
  function setSearchQuery(q)  { _searchQuery  = (q||"").trim().toLowerCase(); }
  function setActiveFilter(f) { _activeFilter = f || "الكل"; }
  function getSearchQuery()   { return _searchQuery; }
  function getActiveFilter()  { return _activeFilter; }

  function applyFilters(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(item => {
      if (!item) return false;
      const mf = _activeFilter === "الكل" || item.type === _activeFilter;
      if (!mf) return false;
      if (!_searchQuery) return true;
      const hay = [item.title,item.type,item.country,item.desc,item.funding]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(_searchQuery);
    });
  }

  // ─── Colors / Badges ────────────────────────────────────────
  const CATEGORY_COLORS = {
    "منحة دراسية":"#fbbf24","تدريب مهني":"#3b82f6","مسابقة":"#a855f7",
    "مؤتمر":"#06b6d4","برنامج تطوعي":"#10b981","فرصة بحثية":"#f97316",
    "برنامج قيادي":"#ec4899","أخرى":"#9ca3af"
  };
  function getCategoryColor(t) { return CATEGORY_COLORS[t] || "#9ca3af"; }

  function getFundingBadge(f) {
    if (!f) return "";
    if (f==="ممولة بالكامل") return `<span class="badge-funded-full">ممولة بالكامل ✦</span>`;
    if (f==="ممولة جزئياً")  return `<span class="badge-funded-partial">ممولة جزئياً</span>`;
    return `<span class="badge-funded-other">${f}</span>`;
  }

  // ─── Sanitize / Format ──────────────────────────────────────
  function sanitize(str) {
    if (typeof str !== "string") return "";
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("ar-DZ",
        { year:"numeric", month:"long", day:"numeric" });
    } catch { return dateStr; }
  }

  // ─── Export / Import ─────────────────────────────────────────
  async function exportJSON() {
    try {
      const data = await HorizonDB.getAll();
      const BOM  = "\ufeff";
      const blob = new Blob([BOM + JSON.stringify(data,null,2)],
        { type:"application/json;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `horizon_gate_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      return true;
    } catch { return false; }
  }

  async function importJSON(file) {
    return new Promise((resolve, reject) => {
      if (!file || (!file.type.includes("json") && !file.name.endsWith(".json"))) {
        reject(new Error("يرجى اختيار ملف JSON صالح")); return;
      }
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let text = e.target.result;
          if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) { reject(new Error("الملف لا يحتوي على مصفوفة")); return; }
          const added = await HorizonDB.importBulk(parsed);
          broadcastUpdate();
          resolve(added);
        } catch (err) { reject(new Error("فشل القراءة: "+err.message)); }
      };
      reader.onerror = () => reject(new Error("فشل قراءة الملف"));
      reader.readAsText(file,"utf-8");
    });
  }

  // ─── Theme ───────────────────────────────────────────────────
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    HorizonDB.setTheme(theme);
  }

  function initTheme() {
    const saved = HorizonDB.getTheme();
    document.documentElement.setAttribute("data-theme", saved);
    return saved;
  }

  function toggleTheme() {
    const current = HorizonDB.getTheme();
    const next    = current === "dark" ? "light" : "dark";
    applyTheme(next);
    return next;
  }

  // ─── Share ───────────────────────────────────────────────────
  function shareWhatsApp(item) {
    const text = `✦ ${item.title}\n🌍 ${item.country} | ${item.type}\n📅 آخر موعد: ${formatDate(item.deadline)}\n🔗 ${item.url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function shareTelegram(item) {
    const text = `✦ ${item.title}\n🌍 ${item.country} | ${item.type}\n📅 آخر موعد: ${formatDate(item.deadline)}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(item.url)}&text=${encodeURIComponent(text)}`, "_blank");
  }

  function copyLink(item) {
    const text = `${item.title} — ${item.url}`;
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  // ─── Reminder badge updater ───────────────────────────────────
  function updateReminderBadge() {
    const count = HorizonDB.getReminderCount();
    document.querySelectorAll(".reminder-badge").forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? "flex" : "none";
    });
  }

  return {
    registerPage, broadcastUpdate,
    isExpired, getCountdown, getCountdownClass, daysUntil,
    setSearchQuery, setActiveFilter, getSearchQuery, getActiveFilter, applyFilters,
    getCategoryColor, getFundingBadge, sanitize, formatDate,
    exportJSON, importJSON,
    applyTheme, initTheme, toggleTheme,
    shareWhatsApp, shareTelegram, copyLink,
    updateReminderBadge
  };
})();

