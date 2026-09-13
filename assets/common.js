window.JPY5 = (() => {
  const prefix = "jpy5.chapter13.";
  const sources = Object.freeze({
    home: "https://ttrw.jp/",
    textbooks: Object.freeze({
      13: "https://ttrw.jp/static/textbook//1027/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC13%E8%AF%BE.pdf",
      14: "https://ttrw.jp/static/textbook//1028/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC14%E8%AF%BE.pdf",
      15: "https://ttrw.jp/static/textbook//1029/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC15%E8%AF%BE.pdf",
      16: "https://ttrw.jp/static/textbook//1030/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC16%E8%AF%BE.pdf"
    })
  });
  const read = (key, fallback) => { try { const v = localStorage.getItem(prefix + key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(prefix + key, JSON.stringify(value)); } catch {} };
  const remove = key => { try { localStorage.removeItem(prefix + key); } catch {} };
  const shuffle = values => { const a = [...values]; for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  function bindSwipe(element, {next, previous, threshold=60}={}) {
    if (!element) return () => {};
    let gesture=null, suppressClickUntil=0;
    // Keep vertical scrolling and browser pinch zoom; horizontal movement is
    // left to this handler for card navigation.
    element.style.touchAction="pan-y pinch-zoom";
    const onPointerDown=event=>{if(event.pointerType==="mouse"||event.isPrimary===false)return;gesture={id:event.pointerId,x:event.clientX,y:event.clientY}};
    const onPointerUp=event=>{if(!gesture||event.pointerId!==gesture.id)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;if(Math.abs(dx)<threshold||Math.abs(dx)<=Math.abs(dy)*1.25)return;suppressClickUntil=Date.now()+500;(dx<0?next:previous)?.()};
    const onPointerCancel=()=>{gesture=null};
    const onClick=event=>{if(Date.now()>=suppressClickUntil)return;event.preventDefault();event.stopImmediatePropagation()};
    element.addEventListener("pointerdown",onPointerDown);
    element.addEventListener("pointerup",onPointerUp);
    element.addEventListener("pointercancel",onPointerCancel);
    element.addEventListener("click",onClick,true);
    return ()=>{element.removeEventListener("pointerdown",onPointerDown);element.removeEventListener("pointerup",onPointerUp);element.removeEventListener("pointercancel",onPointerCancel);element.removeEventListener("click",onClick,true)};
  }
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
  function initSources() {
    document.querySelectorAll("[data-textbook-lesson]").forEach(link => {
      const url=sources.textbooks[link.dataset.textbookLesson]; if(url)link.href=url;
    });
    const footer=document.querySelector("body > footer");
    if(footer&&!footer.querySelector(".source-credit")){
      footer.append(document.createTextNode(" · 教材來源："));
      const credit=document.createElement("a"); credit.className="source-credit"; credit.href=sources.home; credit.target="_blank"; credit.rel="noopener"; credit.textContent="ttrw.jp"; footer.append(credit);
    }
  }
  document.addEventListener("DOMContentLoaded", () => { initTheme(); initIcons(); initSources(); });
  return { read, write, remove, shuffle, bindSwipe, setTheme, sources };
})();
