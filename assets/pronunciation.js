window.JPY5Pronunciation = (() => {
  const speakerIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zm-2.5-8.7v2.06a7 7 0 0 1 0 13.28v2.06a9 9 0 0 0 0-17.4z"/></svg>';

  function getPronunciationText(item) {
    let text = String(item?.kana || "").trim();
    if (!text) return "";

    // Keep the lexical reading only: join する, remove supplied context, then
    // choose the dictionary form before a slash and discard affix placeholders.
    text = text
      .replace(/[\[［〔]\s*する\s*[\]］〕]/g, "する")
      .replace(/[（(][^）)]*[）)]/g, "")
      .replace(/\[[^\]]*\]|［[^］]*］|〔[^〕]*〕/g, "")
      .split(/[／/]/, 1)[0]
      .replace(/[～〜~]/g, "")
      .replace(/\s+/g, "")
      .trim();

    // Kana is the source of truth. Refuse leftover Latin text or kanji rather
    // than guessing how a study annotation or foreign original should sound.
    return text && !/[A-Za-z\u3400-\u9fff]/.test(text) ? text : "";
  }

  function speak(item) {
    const text = getPronunciationText(item);
    if (!text || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.86;
    const voice = window.speechSynthesis.getVoices().find(candidate => candidate.lang.toLowerCase().startsWith("ja"));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function escapeAttribute(value) {
    return String(value).replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
  }

  function button(item, className, dataAttribute = "") {
    const text = getPronunciationText(item);
    const label = text ? `播放「${text}」發音` : "此詞彙暫無可安全播放的讀音";
    return `<button class="pronunciation-button ${className}" type="button" ${dataAttribute} aria-label="${escapeAttribute(label)}" title="${escapeAttribute(label)}"${text ? "" : " disabled"}>${speakerIcon}</button>`;
  }

  return { getPronunciationText, speak, button };
})();
