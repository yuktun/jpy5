(() => {
  "use strict";
  if (typeof HTMLDialogElement === "undefined" || typeof HTMLDialogElement.prototype.showModal !== "function") return;

  document.querySelectorAll(".reader-article").forEach((reader, readerIndex) => {
    let dialog, heading, content, close, opener;
    const ensureDialog = () => {
      if (dialog) return;
      dialog = document.createElement("dialog");
      dialog.className = "article-answer-dialog";
      dialog.lang = "zh-Hant";
      heading = document.createElement("h2");
      heading.id = `article-answer-heading-${readerIndex + 1}`;
      dialog.setAttribute("aria-labelledby", heading.id);
      const header = document.createElement("div");
      header.className = "article-answer-header";
      close = document.createElement("button");
      close.type = "button";
      close.className = "article-answer-close";
      close.textContent = "關閉";
      close.addEventListener("click", () => dialog.close());
      header.append(heading, close);
      content = document.createElement("div");
      content.className = "article-answer-content";
      content.tabIndex = 0;
      content.setAttribute("aria-label", "答案內容");
      dialog.append(header, content);
      dialog.addEventListener("close", () => {
        content.replaceChildren();
        heading.textContent = "";
        const previous = opener;
        opener = null;
        if (previous?.isConnected) previous.focus({ preventScroll: true });
      });
      reader.append(dialog);
    };
    const questions = [...reader.querySelectorAll("[data-article-question]")];
    questions.forEach(question => {
      const number = question.dataset.articleQuestion;
      const answerId = question.dataset.answerId;
      if (!/^[1-9]\d*$/.test(number) || !answerId || questions.filter(node => node.dataset.articleQuestion === number || node.dataset.answerId === answerId).length !== 1) return;
      const matches = [...document.querySelectorAll("[id]")].filter(node => node.id === answerId);
      const answer = matches[0];
      if (matches.length !== 1 || !reader.contains(answer) || !answer.hasAttribute("data-article-answer") || answer === question || question.contains(answer)) return;
      const blanks = [...question.querySelectorAll("[data-answer-blank]")];
      const createControl = (blank, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.lang = "zh-Hant";
        button.className = blank ? "article-answer-blank" : "article-answer-button";
        button.textContent = blank ? blank.textContent : "答案與解釋";
        button.setAttribute("aria-label", `第 ${number} 題${blanks.length > 1 ? `，第 ${index + 1} 個空格` : blank ? "空格" : ""}，查看答案與解釋`);
        button.setAttribute("aria-haspopup", "dialog");
        button.addEventListener("click", () => {
          ensureDialog();
          opener = button;
          heading.textContent = `第 ${number} 題答案與解釋`;
          const clone = answer.cloneNode(true);
          clone.removeAttribute("id");
          clone.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
          content.replaceChildren(...clone.childNodes);
          dialog.showModal();
          close.focus({ preventScroll: true });
        });
        if (blank) blank.replaceChildren(button);
        else question.append(" ", button);
      };
      if (blanks.length) blanks.forEach(createControl);
      else createControl(null, 0);
    });
  });
})();
