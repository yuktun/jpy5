window.JPY5 = (() => {
  const prefix = "jpy5.chapter16.";
  const sources = Object.freeze({
    home: "https://ttrw.jp/",
    textbook: "https://ttrw.jp/static/textbook/1030/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC16%E8%AF%BE.pdf"
  });
  const read=(key,fallback)=>{try{const value=localStorage.getItem(prefix+key);return value===null?fallback:JSON.parse(value)}catch{return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(prefix+key,JSON.stringify(value))}catch{}};
  const remove=key=>{try{localStorage.removeItem(prefix+key)}catch{}};
  const shuffle=values=>{const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result};
  function setTheme(theme){document.documentElement.dataset.theme=theme;write("theme",theme);document.querySelectorAll("[data-theme-select]").forEach(node=>node.value=theme)}
  document.addEventListener("DOMContentLoaded",()=>{
    const theme=read("theme","auto");document.documentElement.dataset.theme=theme;
    document.querySelectorAll("[data-theme-select]").forEach(node=>{node.value=theme;node.addEventListener("change",()=>setTheme(node.value))});
    document.querySelectorAll("[data-ch16-textbook], [data-textbook-lesson]").forEach(node=>node.href=sources.textbook);
  });
  return {read,write,remove,shuffle,setTheme,sources};
})();
