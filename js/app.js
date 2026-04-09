(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const app = () => $("#app");
  const modal = () => $("#modal");
  const overlay = () => $("#modal-overlay");

  const state = {
    screen: "home",
    selectedCategories: new Set(),
    customNames: ["", "", "", "", "", "", "", ""],
    names: [],
    rounds: [],
    currentRound: 0,
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

  function chunkTriples(arr) {
    const rounds = [];
    for (let i = 0; i + 2 < arr.length; i += 3) {
      rounds.push([arr[i], arr[i + 1], arr[i + 2]]);
    }
    return rounds;
  }

  function getCategoryNameCount() {
    let count = 0;
    for (const catId of state.selectedCategories) {
      const cat = window.FMK_DATA.categories.find((c) => c.id === catId);
      if (cat) count += cat.names.length;
    }
    return count;
  }

  function getCustomValidNames() {
    return state.customNames.map((n) => n.trim()).filter((n) => n.length > 0);
  }

  function collectNames(source) {
    const names = new Set();
    if (source === "categories") {
      for (const catId of state.selectedCategories) {
        const cat = window.FMK_DATA.categories.find((c) => c.id === catId);
        if (cat) cat.names.forEach((n) => names.add(n));
      }
    } else {
      getCustomValidNames().forEach((n) => names.add(n));
    }
    return [...names];
  }

  // ── Modal ──
  function openModal() {
    modal().classList.add("open");
    overlay().classList.add("open");
  }

  function closeModal() {
    modal().classList.remove("open");
    overlay().classList.remove("open");
  }

  // ── Render ──
  function render() {
    if (state.screen === "home") renderHome();
    else if (state.screen === "playing") renderGame();
  }

  function renderHome() {
    app().innerHTML = `
      <div class="home">
        <h1 class="home-title">fuck marry kill</h1>
        <div class="home-buttons">
          <button class="btn" data-action="open-categories">elegir de entre categorias</button>
          <button class="btn" data-action="open-custom">usar mi lista de nombres</button>
        </div>
      </div>
    `;
  }

  function renderCategoriesModal() {
    const cats = window.FMK_DATA.categories;
    const count = getCategoryNameCount();
    modal().innerHTML = `
      <div class="modal-handle"></div>
      <div class="modal-title">elige categorias</div>
      <div class="category-list">
        ${cats
          .map(
            (cat) => `
          <div class="category-item" data-cat="${cat.id}">
            <div class="checkbox ${state.selectedCategories.has(cat.id) ? "checked" : ""}">
              ${state.selectedCategories.has(cat.id) ? "&#10003;" : ""}
            </div>
            <span class="category-label">${cat.emoji} ${cat.name}</span>
            <span class="category-count">${cat.names.length}</span>
          </div>
        `
          )
          .join("")}
      </div>
      <div class="modal-footer">
        <span class="name-count">${count} nombres seleccionados</span>
        <button class="btn-start" data-action="start-categories" ${count < 8 ? "disabled" : ""}>
          empezar
        </button>
      </div>
    `;
    openModal();
  }

  function renderCustomModal() {
    const validCount = getCustomValidNames().length;
    modal().innerHTML = `
      <div class="modal-handle"></div>
      <div class="modal-title">tu lista de nombres</div>
      <div class="names-list">
        ${state.customNames
          .map(
            (name, i) => `
          <div class="name-input-row">
            <input class="name-input" type="text" placeholder="nombre ${i + 1}" value="${name}" data-name-idx="${i}">
            ${
              state.customNames.length > 8
                ? `<button class="btn-remove" data-remove="${i}">&times;</button>`
                : ""
            }
          </div>
        `
          )
          .join("")}
      </div>
      <button class="btn-add" data-action="add-name">+ anadir nombre</button>
      <div class="modal-footer">
        <span class="name-count">${validCount} nombres escritos${validCount < 8 ? " (minimo 8)" : ""}</span>
        <button class="btn-start" data-action="start-custom" ${validCount < 8 ? "disabled" : ""}>
          empezar
        </button>
      </div>
    `;
    openModal();
  }

  function startGame(source) {
    const allNames = collectNames(source);
    if (allNames.length < 8) return;
    state.names = allNames;
    state.rounds = chunkTriples(shuffle(allNames));
    state.currentRound = 0;
    state.screen = "playing";
    closeModal();
    render();
  }

  function renderGame() {
    const round = state.rounds[state.currentRound];
    const total = state.rounds.length;
    const labels = ["fuck", "marry", "kill"];

    app().innerHTML = `
      <div class="game">
        <span class="round-label">ronda ${state.currentRound + 1} de ${total}</span>
        <div class="game-names">
          ${round
            .map(
              (name, i) => `
            <div class="game-name ${labels[i]}">
              ${name}
              <span class="game-name-label">${labels[i]}</span>
            </div>
          `
            )
            .join("")}
        </div>
        <div class="game-actions">
          ${
            state.currentRound < total - 1
              ? `<button class="btn-new-round" data-action="next-round">nueva ronda</button>`
              : `<button class="btn-new-round" data-action="go-home">fin! volver a empezar</button>`
          }
          <button class="btn-back" data-action="go-home">salir</button>
        </div>
      </div>
    `;
  }

  // ── Events ──
  document.addEventListener("click", (e) => {
    // Overlay close
    if (e.target === overlay()) {
      closeModal();
      return;
    }

    // Category toggle
    const catItem = e.target.closest("[data-cat]");
    if (catItem) {
      const id = catItem.dataset.cat;
      if (state.selectedCategories.has(id)) state.selectedCategories.delete(id);
      else state.selectedCategories.add(id);
      renderCategoriesModal();
      return;
    }

    // Remove name
    const removeBtn = e.target.closest("[data-remove]");
    if (removeBtn) {
      const idx = parseInt(removeBtn.dataset.remove);
      state.customNames.splice(idx, 1);
      renderCustomModal();
      return;
    }

    // Actions
    const action = e.target.closest("[data-action]");
    if (action) {
      switch (action.dataset.action) {
        case "open-categories":
          renderCategoriesModal();
          break;
        case "open-custom":
          renderCustomModal();
          break;
        case "add-name":
          syncCustomInputs();
          state.customNames.push("");
          renderCustomModal();
          // Focus last input
          setTimeout(() => {
            const inputs = modal().querySelectorAll(".name-input");
            if (inputs.length) inputs[inputs.length - 1].focus();
          }, 50);
          break;
        case "start-categories":
          if (!action.disabled) startGame("categories");
          break;
        case "start-custom":
          syncCustomInputs();
          if (getCustomValidNames().length >= 8) startGame("custom");
          break;
        case "next-round":
          state.currentRound++;
          render();
          break;
        case "go-home":
          state.screen = "home";
          state.selectedCategories.clear();
          state.customNames = ["", "", "", "", "", "", "", ""];
          render();
          break;
      }
      return;
    }
  });

  // Sync inputs on any change
  document.addEventListener("input", (e) => {
    if (e.target.dataset.nameIdx !== undefined) {
      const idx = parseInt(e.target.dataset.nameIdx);
      state.customNames[idx] = e.target.value;
      // Update count without re-rendering (to keep focus)
      const countEl = modal().querySelector(".name-count");
      const startBtn = modal().querySelector(".btn-start");
      const validCount = getCustomValidNames().length;
      if (countEl) countEl.textContent = `${validCount} nombres escritos${validCount < 8 ? " (minimo 8)" : ""}`;
      if (startBtn) startBtn.disabled = validCount < 8;
    }
  });

  function syncCustomInputs() {
    const inputs = modal().querySelectorAll(".name-input");
    inputs.forEach((input) => {
      const idx = parseInt(input.dataset.nameIdx);
      state.customNames[idx] = input.value;
    });
  }

  // ── Init ──
  render();
})();
