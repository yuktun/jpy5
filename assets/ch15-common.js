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
  function setTheme(theme){document.documentElement.dataset.theme=theme;write("theme",theme);document.querySelectorAll("[data-theme-select]").forEach(node=>node.value=theme)}
  document.addEventListener("DOMContentLoaded",()=>{
    const theme=read("theme","auto");document.documentElement.dataset.theme=theme;
    document.querySelectorAll("[data-theme-select]").forEach(node=>{node.value=theme;node.addEventListener("change",()=>setTheme(node.value))});
    document.querySelectorAll("[data-ch15-textbook], [data-textbook-lesson]").forEach(node=>node.href=sources.textbook);
  });
  return {read,write,remove,shuffle,bindSwipe,setTheme,sources};
})();
