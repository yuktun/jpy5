window.JPY5 = (() => {
  const prefix = "jpy5.chapter15.";
  const sources = Object.freeze({
    home: "https://ttrw.jp/",
    textbook: "https://drive.google.com/file/d/1UYaasmfp5cXbxcLxF8HXcyBz5_RcEIh7/view"
  });
  const read=(key,fallback)=>{try{const value=localStorage.getItem(prefix+key);return value===null?fallback:JSON.parse(value)}catch{return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(prefix+key,JSON.stringify(value))}catch{}};
  const remove=key=>{try{localStorage.removeItem(prefix+key)}catch{}};
  const shuffle=values=>{const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result};
  function bindSwipe(element,{next,previous,threshold=60}={}){if(!element)return()=>{};let gesture=null,suppressClickUntil=0;element.style.touchAction="pan-y pinch-zoom";const onPointerDown=event=>{if(event.pointerType==="mouse"||event.isPrimary===false)return;gesture={id:event.pointerId,x:event.clientX,y:event.clientY}};const onPointerUp=event=>{if(!gesture||event.pointerId!==gesture.id)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;if(Math.abs(dx)<threshold||Math.abs(dx)<=Math.abs(dy)*1.25)return;suppressClickUntil=Date.now()+500;(dx<0?next:previous)?.()};const onPointerCancel=()=>{gesture=null};const onClick=event=>{if(Date.now()>=suppressClickUntil)return;event.preventDefault();event.stopImmediatePropagation()};element.addEventListener("pointerdown",onPointerDown);element.addEventListener("pointerup",onPointerUp);element.addEventListener("pointercancel",onPointerCancel);element.addEventListener("click",onClick,true);return()=>{element.removeEventListener("pointerdown",onPointerDown);element.removeEventListener("pointerup",onPointerUp);element.removeEventListener("pointercancel",onPointerCancel);element.removeEventListener("click",onClick,true)}}
  function effectiveTheme(theme, hour=(new Date()).getHours()){return theme==="auto"?(hour>=18||hour<6?"dark":"light"):theme} function applyTheme(theme){document.documentElement.dataset.theme=effectiveTheme(theme);document.documentElement.dataset.themePreference=theme;document.querySelectorAll("[data-theme-select]").forEach(node=>node.value=theme)} function setTheme(theme){write("theme",theme);applyTheme(theme)}
  function initLessonSwitchers(){document.querySelectorAll(".module-lesson-switcher,.reading-controls .lesson-pills").forEach(nav=>{const module=(location.pathname.match(/chapter-(?:13|14|15|16|17|18)-([^./]+)\.html/)||[])[1];if(!module)return;const lesson=(location.pathname.match(/chapter-(\d+)-/)||[])[1];nav.innerHTML=[13,14,15,16,17,18].map(n=>`<a class="${String(n)===lesson?"active":""}" ${String(n)===lesson?"aria-current=\"page\"":""} href="chapter-${n}-${module}.html">第${n}課</a>`).join("")})} document.addEventListener("DOMContentLoaded",()=>{initLessonSwitchers();
    const theme=read("theme","auto");document.documentElement.dataset.theme=theme;
    document.querySelectorAll("[data-theme-select]").forEach(node=>{node.value=theme;node.addEventListener("change",()=>setTheme(node.value))});
    document.querySelectorAll("[data-ch15-textbook], [data-textbook-lesson]").forEach(node=>node.href=sources.textbook);
  });
  return {read,write,remove,shuffle,bindSwipe,setTheme,sources};
})();



