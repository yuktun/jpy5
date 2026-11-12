window.JPY5ReadingExam = ({state, questions, save, render, prompt, option, thresholds, shuffle = false}) => {
  function optionOrder(question) {
    const indices = question.options.map((_, index) => index);
    return state.examOrder?.[question.id] ?? indices;
  }

  function prepare() {
    if (!shuffle || state.examOrder) return;
    const choiceCount = questions[0].options.length;
    const positions = JPY5.shuffle(questions.map((_, index) => index % choiceCount));
    state.examOrder = Object.fromEntries(questions.map((question, index) => {
      const otherOptions = JPY5.shuffle(question.options.map((_, choice) => choice)
        .filter(choice => choice !== question.answer));
      otherOptions.splice(positions[index], 0, question.answer);
      return [question.id, otherOptions];
    }));
    save();
  }

  const answeredCount = () => questions.filter(question => optionOrder(question)
    .includes(state.examAnswers[question.id])).length;
  const status = () => `已答 ${answeredCount()} / ${questions.length}`;

  function content() {
    prepare();
    const result = state.examResult;
    const items = questions.map((question, index) => {
      const choices = optionOrder(question).map(choice => {
        const checked = state.examAnswers[question.id] === choice ? " checked" : "";
        return `<label><input type="radio" name="${question.id}" value="${choice}"${checked}${result ? " disabled" : ""}> ${option(question, question.options[choice])}</label>`;
      }).join("");
      return `<article><span>${String(index + 1).padStart(2, "0")}</span><h3>${prompt(question)}</h3><div>${choices}</div></article>`;
    }).join("");
    const [strong, review] = thresholds;
    const message = result?.score >= strong ? "掌握得很好！"
      : result?.score >= review ? "再重溫幾個段落。" : "先回原文找答案。";
    const feedback = result ? `<strong>${Number(result.score)} / ${Number(result.total)}</strong><h2>${message}</h2><p>錯題已自動加入「錯題重溫」。</p>` : "";
    const action = result
      ? '<button type="button" class="primary-button" id="restart-reading-exam">重新開始 →</button>'
      : '<button type="button" class="primary-button" id="submit-reading-exam">提交試卷 →</button>';
    return `<div class="exam-list">${items}</div><div class="exam-submit"><p id="exam-status">${status()}</p>${action}</div><section class="reading-result" tabindex="-1"${result ? "" : " hidden"}>${feedback}</section>`;
  }

  function bind(stage) {
    const statusNode = stage.querySelector("#exam-status");
    stage.querySelectorAll(".exam-list input").forEach(input => {
      input.onchange = () => {
        state.examAnswers[input.name] = Number(input.value);
        save();
        statusNode.textContent = status();
      };
    });
    stage.querySelector("#submit-reading-exam")?.addEventListener("click", () => {
      if (state.examResult) return;
      if (answeredCount() !== questions.length) {
        statusNode.textContent = "請先完成全部題目。";
        return;
      }
      const wrong = new Set(state.wrong);
      const results = questions.map(question => {
        const ok = state.examAnswers[question.id] === question.answer;
        if (ok) wrong.delete(question.id);
        else wrong.add(question.id);
        return {id: question.id, ok};
      });
      const score = results.filter(result => result.ok).length;
      state.wrong = [...wrong];
      state.examResult = {score, total: questions.length};
      state.attempts.push({date: new Date().toISOString(), ...state.examResult, results});
      save();
      render();
      stage.querySelector(".reading-result").focus();
    });
    stage.querySelector("#restart-reading-exam")?.addEventListener("click", () => {
      state.examAnswers = {};
      state.examResult = null;
      delete state.examOrder;
      save();
      render();
      stage.querySelector(".exam-list input").focus();
    });
  }

  return {content, bind};
};
