window.JPY5 = (() => {
  const prefix = "jpy5.chapter13.";
  const read = (key, fallback) => { try { const v = localStorage.getItem(prefix + key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(prefix + key, JSON.stringify(value)); } catch {} };
  const remove = key => { try { localStorage.removeItem(prefix + key); } catch {} };
  const shuffle = values => { const a = [...values]; for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    write("theme", theme);
    document.querySelectorAll("[data-theme-select]").forEach(s => s.value = theme);
  }
  function initTheme() {
    const theme = read("theme", "auto");
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll("[data-theme-select]").forEach(s => { s.value=theme; s.addEventListener("change", () => setTheme(s.value)); });
  }
  function initIcons() {
    if (!document.querySelector('link[rel="icon"]')) {
      const icon = document.createElement("link"); icon.rel = "icon"; icon.href = "assets/app-icon.png"; document.head.append(icon);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const touch = document.createElement("link"); touch.rel = "apple-touch-icon"; touch.href = "assets/app-icon.png"; document.head.append(touch);
    }
  }
  document.addEventListener("DOMContentLoaded", () => { initTheme(); initIcons(); });
  return { read, write, remove, shuffle, setTheme };
})();
