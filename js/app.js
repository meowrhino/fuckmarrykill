(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const app = () => $("#app");

  // ── State ──
  const state = {
    screen: "setup",
    selectedCategories: new Set(),
    customText: "",
    names: [],
    rounds: [],
    currentRound: 0,
    selectedCard: null,       // index of selected name in current round
    assignments: {},          // { 0: "fuck", 1: "marry", 2: "kill" }
    results: { fuck: [], marry: [], kill: [] },
  };

  // ── Utilities ──
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function chunkIntoTriples(arr) {
    const rounds = [];
    for (let i = 0; i + 2 < arr.length; i += 3) {
      rounds.push([arr[i], arr[i + 1], arr[i + 2]]);
    }
    return rounds;
  }

  function getNameCount() {
    let names = new Set();
    for (const catId of state.selectedCategories) {
      const cat = window.FMK_DATA.categories.find((c) => c.id === catId);
      if (cat) cat.names.forEach((n) => names.add(n));
    }
    const custom = parseCustomNames(state.customText);
    custom.forEach((n) => names.add(n));
    return names.size;
  }

  function parseCustomNames(text) {
    return text
      .split(/[,\n]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
  }

  function collectAllNames() {
    const names = new Set();
    for (const catId of state.selectedCategories) {
      const cat = window.FMK_DATA.categories.find((c) => c.id === catId);
      if (cat) cat.names.forEach((n) => names.add(n));
    }
    parseCustomNames(state.customText).forEach((n) => names.add(n));
    return [...names];
  }

  // ── Toast ──
  let toastTimeout;
  function showToast(msg) {
    let toast = $(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("show"), 2000);
  }

  // ── Render Router ──
  function render() {
    switch (state.screen) {
      case "setup":
        renderSetup();
        break;
      case "playing":
        renderRound();
        break;
      case "results":
        renderResults();
        break;
    }
  }

  // ── Setup Screen ──
  function renderSetup() {
    const count = getNameCount();
    const cats = window.FMK_DATA.categories;

    app().innerHTML = `
      <div class="fade-in">
        <div class="setup-section">
          <h2>Elige categorias</h2>
          <div class="select-all-row">
            <button class="btn-link" data-action="select-all">Seleccionar todas</button>
            <button class="btn-link" data-action="deselect-all">Quitar todas</button>
          </div>
          <div class="category-grid">
            ${cats
              .map(
                (cat) => `
              <div class="category-chip ${state.selectedCategories.has(cat.id) ? "selected" : ""}" data-cat="${cat.id}">
                <span>${cat.emoji}</span>
                <span>${cat.name}</span>
                <span class="chip-count">(${cat.names.length})</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>

        <div class="setup-section">
          <h2>O escribe tus propios nombres</h2>
          <textarea class="custom-input" placeholder="Escribe nombres separados por coma o salto de linea..." data-input="custom">${state.customText}</textarea>
        </div>

        <div class="name-counter">
          <span class="count">${count}</span>
          nombres listos
        </div>

        <button class="btn-play" data-action="start" ${count < 3 ? "disabled" : ""}>
          Jugar
        </button>
      </div>
    `;
  }

  // ── Round Screen ──
  function renderRound() {
    const round = state.rounds[state.currentRound];
    const total = state.rounds.length;
    const progress = ((state.currentRound + 1) / total) * 100;
    const assignedCount = Object.keys(state.assignments).length;

    app().innerHTML = `
      <div class="fade-in">
        <div class="round-header">
          <h2>Ronda ${state.currentRound + 1} de ${total}</h2>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${progress}%"></div>
          </div>
        </div>

        <div class="name-cards">
          ${round
            .map((name, i) => {
              const assigned = state.assignments[i];
              const isSelected = state.selectedCard === i && !assigned;
              let cls = "name-card glass card-enter";
              if (isSelected) cls += " selected";
              if (assigned) cls += ` assigned-${assigned}`;
              const badge = assigned
                ? `<span class="assignment-badge">${badgeLabel(assigned)}</span>`
                : "";
              return `<div class="${cls}" data-card="${i}">${badge}${name}</div>`;
            })
            .join("")}
        </div>

        <div class="action-buttons">
          <button class="btn-action btn-fuck ${isActionUsed("fuck") ? "used" : ""}" data-assign="fuck">
            <span class="action-emoji">💋</span>
            Fuck
          </button>
          <button class="btn-action btn-marry ${isActionUsed("marry") ? "used" : ""}" data-assign="marry">
            <span class="action-emoji">💍</span>
            Marry
          </button>
          <button class="btn-action btn-kill ${isActionUsed("kill") ? "used" : ""}" data-assign="kill">
            <span class="action-emoji">💀</span>
            Kill
          </button>
        </div>

        <button class="btn-next ${assignedCount === 3 ? "visible" : ""}" data-action="next">
          ${state.currentRound < total - 1 ? "Siguiente →" : "Ver resultados →"}
        </button>
      </div>
    `;
  }

  function badgeLabel(type) {
    switch (type) {
      case "fuck": return "💋 Fuck";
      case "marry": return "💍 Marry";
      case "kill": return "💀 Kill";
    }
  }

  function isActionUsed(action) {
    return Object.values(state.assignments).includes(action);
  }

  // ── Results Screen ──
  function renderResults() {
    app().innerHTML = `
      <div class="fade-in">
        <div class="results-title">Tus Resultados</div>

        <div class="result-section fuck-section glass">
          <h3>💋 Fuck</h3>
          <div class="result-names">
            ${state.results.fuck.map((n) => `<span class="result-tag">${n}</span>`).join("")}
          </div>
        </div>

        <div class="result-section marry-section glass">
          <h3>💍 Marry</h3>
          <div class="result-names">
            ${state.results.marry.map((n) => `<span class="result-tag">${n}</span>`).join("")}
          </div>
        </div>

        <div class="result-section kill-section glass">
          <h3>💀 Kill</h3>
          <div class="result-names">
            ${state.results.kill.map((n) => `<span class="result-tag">${n}</span>`).join("")}
          </div>
        </div>

        <div class="result-actions">
          <button class="btn-share" data-action="share">Compartir 📋</button>
          <button class="btn-replay" data-action="replay">Jugar de nuevo</button>
        </div>
      </div>
    `;
  }

  // ── Game Logic ──
  function startGame() {
    const allNames = collectAllNames();
    if (allNames.length < 3) return;
    state.names = allNames;
    state.rounds = chunkIntoTriples(shuffle(allNames));
    state.currentRound = 0;
    state.selectedCard = null;
    state.assignments = {};
    state.results = { fuck: [], marry: [], kill: [] };
    state.screen = "playing";
    render();
  }

  function assignAction(action) {
    if (state.selectedCard === null) return;
    if (isActionUsed(action)) return;
    if (state.assignments[state.selectedCard]) return;

    state.assignments[state.selectedCard] = action;
    state.selectedCard = null;
    render();
  }

  function nextRound() {
    // Save current round results
    const round = state.rounds[state.currentRound];
    for (const [idx, action] of Object.entries(state.assignments)) {
      state.results[action].push(round[parseInt(idx)]);
    }

    if (state.currentRound < state.rounds.length - 1) {
      state.currentRound++;
      state.selectedCard = null;
      state.assignments = {};
      render();
    } else {
      state.screen = "results";
      render();
    }
  }

  function shareResults() {
    const f = state.results.fuck.join(", ");
    const m = state.results.marry.join(", ");
    const k = state.results.kill.join(", ");
    const text = `🔥 F*ck Marry Kill 🔥\n\n💋 Fuck: ${f}\n💍 Marry: ${m}\n💀 Kill: ${k}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast("Copiado al portapapeles!"));
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("Copiado al portapapeles!");
    }
  }

  function replay() {
    state.screen = "setup";
    render();
  }

  // ── Event Delegation ──
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-cat]");
    if (target) {
      const id = target.dataset.cat;
      if (state.selectedCategories.has(id)) {
        state.selectedCategories.delete(id);
      } else {
        state.selectedCategories.add(id);
      }
      render();
      return;
    }

    const action = e.target.closest("[data-action]");
    if (action) {
      switch (action.dataset.action) {
        case "select-all":
          window.FMK_DATA.categories.forEach((c) => state.selectedCategories.add(c.id));
          render();
          break;
        case "deselect-all":
          state.selectedCategories.clear();
          render();
          break;
        case "start":
          if (!action.disabled) startGame();
          break;
        case "next":
          nextRound();
          break;
        case "share":
          shareResults();
          break;
        case "replay":
          replay();
          break;
      }
      return;
    }

    const card = e.target.closest("[data-card]");
    if (card) {
      const idx = parseInt(card.dataset.card);
      if (state.assignments[idx]) {
        // Unassign
        delete state.assignments[idx];
        state.selectedCard = null;
        render();
      } else {
        state.selectedCard = idx;
        render();
      }
      return;
    }

    const assign = e.target.closest("[data-assign]");
    if (assign && !assign.classList.contains("used")) {
      assignAction(assign.dataset.assign);
      return;
    }
  });

  // Custom textarea input
  document.addEventListener("input", (e) => {
    if (e.target.dataset.input === "custom") {
      state.customText = e.target.value;
      const counter = $(".name-counter");
      if (counter) {
        const count = getNameCount();
        counter.innerHTML = `<span class="count">${count}</span> nombres listos`;
        const btn = $(".btn-play");
        if (btn) btn.disabled = count < 3;
      }
    }
  });

  // ── Init ──
  render();
})();
