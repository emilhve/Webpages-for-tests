(() => {
  "use strict";

  const STORAGE_KEY = "foundations-ai-search-quiz:v1";
  const SESSION_VERSION = 1;
  const AUTO_TYPES = new Set(["single-choice", "numeric"]);
  const TOPICS = [
    { id: "3.1", name: "Problem solving" },
    { id: "3.2", name: "Problem types" },
    { id: "3.3", name: "Search mechanics" },
    { id: "3.4", name: "Uninformed search" },
    { id: "3.5", name: "Heuristic search" },
    { id: "3.6", name: "Heuristic design" }
  ];

  const data = window.QUIZ_DATA;
  const byId = new Map((data?.questions || []).map((question) => [question.id, question]));
  let state = null;
  let noticeTimer = null;

  const el = (id) => document.getElementById(id);
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function validateBank(bank) {
    if (!bank || bank.version !== 1 || !Array.isArray(bank.questions)) throw new Error("Question data is missing or has an unsupported version.");
    if (bank.questions.length !== 64) throw new Error(`Expected 64 questions; found ${bank.questions.length}.`);
    const ids = new Set();
    bank.questions.forEach((question) => {
      if (!/^Q\d{2}$/.test(question.id) || ids.has(question.id)) throw new Error(`Invalid or duplicate question ID: ${question.id}`);
      ids.add(question.id);
      if (!question.prompt || question.answer === undefined || !question.explanation) throw new Error(`${question.id} is missing required content.`);
      if (question.type === "single-choice") {
        if (!Array.isArray(question.options) || !question.options.some((option) => option.id === question.answer)) throw new Error(`${question.id} has an invalid answer key.`);
      } else if (question.type === "numeric") {
        if (typeof question.answer !== "number" || typeof question.tolerance !== "number") throw new Error(`${question.id} needs a numeric answer and tolerance.`);
      } else if (!Array.isArray(question.keyPoints) || !question.keyPoints.length) {
        throw new Error(`${question.id} needs a self-assessment checklist.`);
      }
    });
    for (let number = 1; number <= 64; number += 1) {
      const id = `Q${String(number).padStart(2, "0")}`;
      if (!ids.has(id)) throw new Error(`Missing ${id}.`);
    }
    return true;
  }

  function parseNumeric(raw) {
    const value = String(raw ?? "").trim();
    if (!value) return { kind: "empty" };
    if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(value)) return { kind: "invalid" };
    const number = Number(value.replace(",", "."));
    return Number.isFinite(number) ? { kind: "number", value: number } : { kind: "invalid" };
  }

  function gradeAutomatic(question, response) {
    if (question.type === "single-choice") {
      if (!response) return { status: "unanswered", correct: false };
      return { status: response === question.answer ? "correct" : "incorrect", correct: response === question.answer };
    }
    const parsed = parseNumeric(response);
    if (parsed.kind === "empty") return { status: "unanswered", correct: false };
    if (parsed.kind === "invalid") return { status: "incorrect", correct: false, invalid: true };
    const correct = Math.abs(parsed.value - question.answer) <= question.tolerance;
    return { status: correct ? "correct" : "incorrect", correct };
  }

  function seededShuffle(items, seed) {
    const result = [...items];
    let value = seed >>> 0;
    const random = () => {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function questionTopics(question) {
    if (question.id === "Q64") return ["3.4", "3.5", "3.6"];
    const match = /^3\.\d/.exec(question.section);
    return match ? [match[0]] : [];
  }

  function responseExists(question, response) {
    return question.type === "single-choice" ? Boolean(response) : Boolean(String(response ?? "").trim());
  }

  function randomSeed() {
    if (window.crypto?.getRandomValues) return window.crypto.getRandomValues(new Uint32Array(1))[0];
    return Date.now() >>> 0;
  }

  function showNotice(message) {
    const notice = el("notice");
    notice.textContent = message;
    notice.hidden = false;
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 5000);
  }

  function storageRead() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      const validOrder = Array.isArray(saved.order) && saved.order.length && saved.order.every((id) => byId.has(id));
      if (saved.version !== SESSION_VERSION || !validOrder || !["session", "results"].includes(saved.phase)) throw new Error("Invalid saved state");
      return saved;
    } catch (error) {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (_) { /* storage may be unavailable */ }
      window.setTimeout(() => showNotice("Saved progress could not be restored, so a fresh session is ready."), 0);
      return null;
    }
  }

  function persist() {
    if (!state) return;
    try {
      state.updatedAt = new Date().toISOString();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      showNotice("Progress cannot be saved in this browser context. The current page will still work.");
    }
  }

  function storageClear() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (_) { /* keep the in-memory reset */ }
  }

  function selectedTopics() {
    return [...document.querySelectorAll("#topic-filters input:checked")].map((input) => input.value);
  }

  function matchingQuestions(topics) {
    return data.questions.filter((question) => questionTopics(question).some((topic) => topics.includes(topic)));
  }

  function buildTopicFilters() {
    const container = el("topic-filters");
    TOPICS.forEach((topic) => {
      const label = make("label", "topic-filter");
      const input = make("input");
      input.type = "checkbox";
      input.name = "topic";
      input.value = topic.id;
      input.checked = true;
      input.addEventListener("change", updateMatchNote);
      const body = make("span");
      body.append(make("strong", "", `§ ${topic.id}`), make("small", "", topic.name));
      label.append(input, body);
      container.append(label);
    });
  }

  function updateMatchNote() {
    const topics = selectedTopics();
    const matchCount = matchingQuestions(topics).length;
    const desiredValue = document.querySelector('input[name="count"]:checked').value;
    const desired = desiredValue === "all" ? matchCount : Number(desiredValue);
    const actual = Math.min(desired, matchCount);
    const note = el("match-note");
    note.classList.toggle("error", matchCount === 0);
    if (!matchCount) note.textContent = "Select at least one section to begin.";
    else if (desiredValue !== "all" && matchCount < desired) note.textContent = `${matchCount} questions match, so this session will use all ${matchCount}.`;
    else note.textContent = `${matchCount} questions match · ${actual} will be included.`;
    el("start-button").disabled = matchCount === 0;
    const mode = document.querySelector('input[name="mode"]:checked').value;
    el("start-button").textContent = mode === "study" ? "Start study session" : "Start quiz";
  }

  function showView(name) {
    ["setup", "session", "results"].forEach((view) => { el(`${view}-view`).hidden = view !== name; });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function newSession(event) {
    event?.preventDefault();
    const topics = selectedTopics();
    const matching = matchingQuestions(topics);
    if (!matching.length) {
      updateMatchNote();
      return;
    }
    const countValue = document.querySelector('input[name="count"]:checked').value;
    const count = countValue === "all" ? matching.length : Math.min(Number(countValue), matching.length);
    const seed = randomSeed();
    const shuffle = el("shuffle-input").checked;
    const ordered = shuffle ? seededShuffle(matching, seed) : matching;
    const order = ordered.slice(0, count).map((question) => question.id);
    state = {
      version: SESSION_VERSION,
      sessionId: `${Date.now().toString(36)}-${seed.toString(36)}`,
      phase: "session",
      mode: document.querySelector('input[name="mode"]:checked').value,
      seed,
      shuffle,
      selectedSections: topics,
      requestedCount: countValue,
      order,
      currentIndex: 0,
      responses: {},
      flags: {},
      revealed: {},
      assessments: {},
      skipped: {},
      submitted: false,
      parentResults: null,
      createdAt: new Date().toISOString()
    };
    persist();
    renderSession();
  }

  function renderResume() {
    const card = el("resume-card");
    if (!state) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    const answered = state.order.filter((id) => responseExists(byId.get(id), state.responses?.[id])).length;
    el("resume-title").textContent = state.phase === "results" ? "Completed session" : `${state.mode === "study" ? "Study" : "Quiz"} session in progress`;
    el("resume-detail").textContent = state.phase === "results" ? `${state.order.length} questions · view saved results` : `${answered} of ${state.order.length} answered`;
    el("resume-button").textContent = state.phase === "results" ? "View results" : "Resume";
  }

  function currentQuestion() {
    return byId.get(state.order[state.currentIndex]);
  }

  function updateResponse(question, value) {
    state.responses[question.id] = value;
    delete state.skipped[question.id];
    persist();
    renderProgress();
    renderMap();
  }

  function renderSession(options = {}) {
    showView("session");
    const question = currentQuestion();
    el("session-mode").textContent = state.mode === "study" ? "Study mode" : "Quiz mode";
    el("seed-label").textContent = state.shuffle ? `seed ${state.seed.toString(36).slice(-6)}` : "bank order";
    el("question-position").textContent = `Question ${state.currentIndex + 1} of ${state.order.length} · ${question.id}`;
    el("mobile-index").textContent = `Question ${state.currentIndex + 1} of ${state.order.length}`;
    el("question-prompt").textContent = question.prompt;
    renderMeta(question);
    renderAnswer(question);
    renderMap();
    renderProgress();
    const flagged = Boolean(state.flags[question.id]);
    el("flag-button").setAttribute("aria-pressed", String(flagged));
    el("flag-button").firstElementChild.textContent = flagged ? "◆" : "◇";
    el("previous-button").disabled = state.currentIndex === 0;
    el("next-button").disabled = state.currentIndex === state.order.length - 1;
    el("submit-session-button").textContent = state.mode === "quiz" ? "Submit quiz" : "Finish session";
    if (options.focus) el("question-card").focus({ preventScroll: true });
  }

  function renderMeta(question) {
    const meta = el("question-meta");
    meta.replaceChildren();
    [
      [`§ ${question.section}`, ""],
      [question.difficulty, `difficulty-${question.difficulty}`],
      [question.type.replace("-", " "), ""]
    ].forEach(([text, extra]) => meta.append(make("span", `meta-pill ${extra}`.trim(), text)));
  }

  function renderAnswer(question) {
    const control = el("answer-control");
    const actions = el("answer-actions");
    const feedback = el("feedback-panel");
    const message = el("input-message");
    control.replaceChildren();
    actions.replaceChildren();
    feedback.replaceChildren();
    feedback.hidden = true;
    feedback.className = "feedback-panel";
    message.hidden = true;
    const response = state.responses[question.id] ?? "";
    const locked = state.mode === "study" && Boolean(state.revealed[question.id]);

    if (question.type === "single-choice") {
      const fieldset = make("fieldset", "choice-list");
      fieldset.append(make("legend", "answer-label", "Choose one answer"));
      question.options.forEach((option) => {
        const label = make("label", "choice-option");
        const input = make("input");
        input.type = "radio";
        input.name = `answer-${question.id}`;
        input.value = option.id;
        input.checked = response === option.id;
        input.disabled = locked;
        input.addEventListener("change", () => updateResponse(question, option.id));
        label.append(input, make("span", "choice-letter", option.id), make("span", "", option.text));
        fieldset.append(label);
      });
      control.append(fieldset);
    } else if (question.type === "numeric") {
      const label = make("label", "answer-label", "Your numeric answer");
      label.htmlFor = `response-${question.id}`;
      const input = make("input", "numeric-input");
      input.id = label.htmlFor;
      input.type = "text";
      input.inputMode = "decimal";
      input.autocomplete = "off";
      input.value = response;
      input.disabled = locked;
      input.setAttribute("aria-describedby", "input-message");
      input.addEventListener("input", () => updateResponse(question, input.value));
      control.append(label, input);
    } else {
      const label = make("label", "answer-label", "Write your response");
      label.htmlFor = `response-${question.id}`;
      const textarea = make("textarea", "written-input");
      textarea.id = label.htmlFor;
      textarea.rows = 6;
      textarea.value = response;
      textarea.disabled = locked;
      textarea.addEventListener("input", () => updateResponse(question, textarea.value));
      control.append(label, textarea);
    }

    if (state.mode === "study") {
      if (!state.revealed[question.id]) renderStudyActions(question);
      else renderFeedback(question);
    }
  }

  function actionButton(label, className, handler) {
    const button = make("button", className, label);
    button.type = "button";
    button.addEventListener("click", handler);
    return button;
  }

  function inputError(message) {
    const node = el("input-message");
    node.textContent = message;
    node.hidden = false;
  }

  function renderStudyActions(question) {
    const actions = el("answer-actions");
    if (AUTO_TYPES.has(question.type)) {
      actions.append(actionButton("Check answer", "button primary", () => {
        const response = state.responses[question.id];
        if (!responseExists(question, response)) {
          inputError("Enter an answer, or use Skip question.");
          return;
        }
        if (question.type === "numeric" && parseNumeric(response).kind === "invalid") {
          inputError("Enter one finite number using a decimal point or comma.");
          return;
        }
        state.revealed[question.id] = true;
        persist();
        renderSession();
      }));
    } else {
      actions.append(actionButton("Reveal model answer", "button primary", () => {
        if (!responseExists(question, state.responses[question.id])) {
          inputError("Write an attempt first, or use Skip & reveal.");
          return;
        }
        state.revealed[question.id] = true;
        persist();
        renderSession();
      }));
    }
    actions.append(actionButton(AUTO_TYPES.has(question.type) ? "Skip question" : "Skip & reveal", "button secondary", () => {
      state.skipped[question.id] = true;
      state.revealed[question.id] = true;
      persist();
      renderSession();
    }));
  }

  function correctAnswerText(question) {
    if (question.type === "single-choice") {
      const option = question.options.find((item) => item.id === question.answer);
      return `${question.answer}. ${option.text}`;
    }
    return String(question.answer);
  }

  function appendChecklist(container, question) {
    if (!question.keyPoints) return;
    container.append(make("h3", "", "Self-checklist"));
    const list = make("ul", "checklist");
    question.keyPoints.forEach((point) => list.append(make("li", "", point)));
    container.append(list);
  }

  function assessmentControls(question, onChange) {
    const wrapper = make("div");
    wrapper.append(make("p", "assessment-heading", "How did your response compare?"));
    const group = make("div", "assessment-buttons");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", `Self-assess ${question.id}`);
    [
      ["correct", "Correct"],
      ["partial", "Partly correct"],
      ["review", "Needs review"]
    ].forEach(([value, label]) => {
      const button = make("button", `assessment-button${state.assessments[question.id] === value ? " is-selected" : ""}`, label);
      button.type = "button";
      button.setAttribute("aria-pressed", String(state.assessments[question.id] === value));
      button.addEventListener("click", () => {
        state.assessments[question.id] = value;
        persist();
        onChange();
      });
      group.append(button);
    });
    wrapper.append(group);
    return wrapper;
  }

  function renderFeedback(question) {
    const panel = el("feedback-panel");
    panel.hidden = false;
    if (AUTO_TYPES.has(question.type)) {
      const grade = gradeAutomatic(question, state.responses[question.id]);
      if (state.skipped[question.id]) {
        panel.classList.add("is-skipped");
        panel.append(make("p", "feedback-verdict", "Skipped · not graded as correct"));
      } else {
        panel.classList.toggle("is-incorrect", !grade.correct);
        panel.append(make("p", "feedback-verdict", grade.correct ? "Correct" : "Not quite"));
      }
      panel.append(make("h3", "", "Correct answer"), make("p", "model-answer", correctAnswerText(question)));
    } else {
      if (state.skipped[question.id]) panel.classList.add("is-skipped");
      panel.append(make("p", "feedback-verdict", state.skipped[question.id] ? "Skipped · compare with the model" : "Compare your response with the model"));
      panel.append(make("h3", "", "Model answer"), make("p", "model-answer", String(question.answer)));
    }
    panel.append(make("p", "explanation", question.explanation));
    appendChecklist(panel, question);
    if (!AUTO_TYPES.has(question.type)) panel.append(assessmentControls(question, () => renderSession()));
  }

  function renderProgress() {
    const answered = state.order.filter((id) => responseExists(byId.get(id), state.responses[id])).length;
    const percent = Math.round((answered / state.order.length) * 100);
    el("progress-label").textContent = `${answered} of ${state.order.length} answered`;
    el("progress-percent").textContent = `${percent}%`;
    el("progress-bar").style.width = `${percent}%`;
    el("mobile-progress-bar").style.width = `${((state.currentIndex + 1) / state.order.length) * 100}%`;
  }

  function renderMap() {
    const map = el("question-map");
    map.replaceChildren();
    state.order.forEach((id, index) => {
      const question = byId.get(id);
      const button = make("button", "map-button", String(index + 1));
      button.type = "button";
      button.classList.toggle("is-current", index === state.currentIndex);
      button.classList.toggle("is-answered", responseExists(question, state.responses[id]));
      button.classList.toggle("is-flagged", Boolean(state.flags[id]));
      button.setAttribute("aria-current", index === state.currentIndex ? "step" : "false");
      button.setAttribute("aria-label", `Question ${index + 1}, ${id}${state.flags[id] ? ", flagged" : ""}`);
      button.addEventListener("click", () => navigateTo(index));
      map.append(button);
    });
  }

  function navigateTo(index) {
    if (index < 0 || index >= state.order.length || index === state.currentIndex) return;
    state.currentIndex = index;
    persist();
    renderSession({ focus: true });
  }

  function resultStatus(question) {
    if (AUTO_TYPES.has(question.type)) return gradeAutomatic(question, state.responses[question.id]).status;
    if (!responseExists(question, state.responses[question.id])) return "unanswered";
    return state.assessments[question.id] || "unassessed";
  }

  function computeResults() {
    const summary = {
      machine: { correct: 0, total: 0, unanswered: 0 },
      manual: { correct: 0, partial: 0, review: 0, unassessed: 0, unanswered: 0 },
      items: []
    };
    state.order.forEach((id) => {
      const question = byId.get(id);
      const status = resultStatus(question);
      summary.items.push({ id, status });
      if (AUTO_TYPES.has(question.type)) {
        summary.machine.total += 1;
        if (status === "correct") summary.machine.correct += 1;
        if (status === "unanswered") summary.machine.unanswered += 1;
      } else {
        summary.manual[status] += 1;
      }
    });
    return summary;
  }

  function submitSession() {
    state.submitted = true;
    state.phase = "results";
    persist();
    renderResults();
  }

  function summarySentence(summary) {
    const machine = summary.machine.total ? `${summary.machine.correct}/${summary.machine.total} automatic` : "no automatic items";
    const assessed = summary.manual.correct + summary.manual.partial + summary.manual.review;
    const manualTotal = assessed + summary.manual.unassessed + summary.manual.unanswered;
    return `${machine}; ${assessed}/${manualTotal} written items self-assessed.`;
  }

  function renderResults() {
    showView("results");
    const summary = computeResults();
    const percent = summary.machine.total ? Math.round((summary.machine.correct / summary.machine.total) * 100) : null;
    el("results-subtitle").textContent = `${state.order.length} questions completed. Automatic grading and self-assessment are reported separately.`;
    el("machine-score").textContent = `${summary.machine.correct}/${summary.machine.total}`;
    el("machine-percent").textContent = percent === null ? "—" : `${percent}%`;
    el("machine-detail").textContent = `${summary.machine.unanswered} unanswered · unanswered items receive zero credit.`;

    const totals = el("assessment-totals");
    totals.replaceChildren();
    [
      [summary.manual.correct, "Correct"],
      [summary.manual.partial, "Partly"],
      [summary.manual.review, "Review"],
      [summary.manual.unassessed + summary.manual.unanswered, "Open"]
    ].forEach(([count, label]) => {
      const item = make("div", "assessment-total");
      item.append(make("strong", "", String(count)), make("span", "", label));
      totals.append(item);
    });
    el("self-detail").textContent = `${summary.manual.unassessed} attempted but unassessed · ${summary.manual.unanswered} unanswered.`;

    const prior = el("prior-result");
    if (state.parentResults) {
      prior.hidden = false;
      el("prior-title").textContent = state.parentResults.label || "Previous result";
      el("prior-detail").textContent = state.parentResults.sentence;
    } else prior.hidden = true;

    const missed = summary.items.filter((item) => {
      const question = byId.get(item.id);
      return AUTO_TYPES.has(question.type) ? item.status !== "correct" : item.status === "review";
    }).map((item) => item.id);
    const flagged = state.order.filter((id) => state.flags[id]);
    el("retry-missed-button").disabled = missed.length === 0;
    el("retry-missed-button").textContent = missed.length ? `Retry missed (${missed.length})` : "No missed items";
    el("retry-flagged-button").disabled = flagged.length === 0;
    el("retry-flagged-button").textContent = flagged.length ? `Retry flagged (${flagged.length})` : "No flagged items";
    el("retry-missed-button").onclick = () => startRetry(missed, "Missed-item retry");
    el("retry-flagged-button").onclick = () => startRetry(flagged, "Flagged-item retry");
    renderResultItems(summary);
    persist();
  }

  function renderResultItems(summary) {
    const container = el("topic-results");
    container.replaceChildren();
    const groups = new Map();
    summary.items.forEach((item) => {
      const question = byId.get(item.id);
      const key = question.id === "Q64" ? "Mixed §§3.4–3.6" : `§ ${questionTopics(question)[0]}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    groups.forEach((items, title) => {
      const section = make("section", "topic-result");
      section.append(make("h2", "", title));
      const list = make("div", "result-list");
      items.forEach((item) => list.append(resultDetails(byId.get(item.id), item.status)));
      section.append(list);
      container.append(section);
    });
  }

  function statusLabel(status) {
    return {
      correct: "Correct",
      incorrect: "Incorrect",
      partial: "Partly correct",
      review: "Needs review",
      unanswered: "Unanswered",
      unassessed: "Unassessed"
    }[status] || status;
  }

  function resultDetails(question, status) {
    const details = make("details", "result-item");
    const summary = make("summary");
    summary.append(make("span", "result-id", question.id), make("span", "result-prompt", question.prompt), make("span", `status-badge status-${status}`, statusLabel(status)));
    details.append(summary);
    const body = make("div", "result-body");
    body.append(make("h3", "", "Your response"), make("p", "", String(state.responses[question.id] || "No response")));
    body.append(make("h3", "", AUTO_TYPES.has(question.type) ? "Correct answer" : "Model answer"), make("p", "", correctAnswerText(question)));
    body.append(make("h3", "", "Explanation"), make("p", "", question.explanation));
    appendChecklist(body, question);
    if (!AUTO_TYPES.has(question.type) && responseExists(question, state.responses[question.id])) {
      body.append(assessmentControls(question, () => renderResults()));
    }
    details.append(body);
    return details;
  }

  function startRetry(ids, label) {
    if (!ids.length) return;
    const previous = computeResults();
    const parentResults = { label: label.replace("retry", "original"), sentence: summarySentence(previous), summary: previous, savedAt: new Date().toISOString() };
    const seed = randomSeed();
    state = {
      version: SESSION_VERSION,
      sessionId: `${Date.now().toString(36)}-${seed.toString(36)}`,
      phase: "session",
      mode: state.mode,
      seed,
      shuffle: false,
      selectedSections: [...state.selectedSections],
      requestedCount: String(ids.length),
      order: [...ids],
      currentIndex: 0,
      responses: {},
      flags: {},
      revealed: {},
      assessments: {},
      skipped: {},
      submitted: false,
      parentResults,
      createdAt: new Date().toISOString()
    };
    persist();
    renderSession();
  }

  function returnToSetup() {
    state = null;
    storageClear();
    renderResume();
    showView("setup");
  }

  function resetEverything() {
    state = null;
    storageClear();
    renderResume();
    showView("setup");
    showNotice("Saved progress was reset.");
  }

  function bindEvents() {
    el("setup-form").addEventListener("submit", newSession);
    document.querySelectorAll('input[name="mode"], input[name="count"]').forEach((input) => input.addEventListener("change", updateMatchNote));
    el("select-all").addEventListener("click", () => {
      document.querySelectorAll("#topic-filters input").forEach((input) => { input.checked = true; });
      updateMatchNote();
    });
    el("clear-all").addEventListener("click", () => {
      document.querySelectorAll("#topic-filters input").forEach((input) => { input.checked = false; });
      updateMatchNote();
    });
    el("resume-button").addEventListener("click", () => state.phase === "results" ? renderResults() : renderSession());
    el("previous-button").addEventListener("click", () => navigateTo(state.currentIndex - 1));
    el("next-button").addEventListener("click", () => navigateTo(state.currentIndex + 1));
    el("flag-button").addEventListener("click", () => {
      const id = currentQuestion().id;
      state.flags[id] = !state.flags[id];
      persist();
      renderSession();
    });
    el("submit-session-button").addEventListener("click", submitSession);
    el("new-session-button").addEventListener("click", returnToSetup);
    el("reset-button").addEventListener("click", () => {
      const dialog = el("reset-dialog");
      if (typeof dialog.showModal === "function") dialog.showModal();
      else resetEverything();
    });
    el("confirm-reset").addEventListener("click", resetEverything);
    document.addEventListener("keydown", (event) => {
      if (!state || state.phase !== "session" || event.altKey || event.ctrlKey || event.metaKey) return;
      const tag = event.target.tagName;
      if (["INPUT", "TEXTAREA", "BUTTON"].includes(tag)) return;
      if (event.key === "ArrowLeft") navigateTo(state.currentIndex - 1);
      if (event.key === "ArrowRight") navigateTo(state.currentIndex + 1);
    });
  }

  function fail(error) {
    const main = el("main-content");
    main.replaceChildren();
    const panel = make("section", "fatal-error");
    panel.append(make("h1", "", "The quiz could not load"), make("p", "", error.message));
    main.append(panel);
  }

  function init() {
    try {
      validateBank(data);
      buildTopicFilters();
      bindEvents();
      state = storageRead();
      renderResume();
      updateMatchNote();
      showView("setup");
      window.QuizCore = { validateBank, parseNumeric, gradeAutomatic, seededShuffle, questionTopics };
    } catch (error) {
      fail(error);
    }
  }

  init();
})();
