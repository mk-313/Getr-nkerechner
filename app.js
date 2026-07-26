document.addEventListener("DOMContentLoaded", () => {
  const drinksSetupBody = document.getElementById("drinks-setup-body");
  const drinksCalcBody = document.getElementById("drinks-calc-body");
  const addDrinkBtn = document.getElementById("add-drink-btn");
  const calculateBtn = document.getElementById("calculate-btn");
  const resetBtn = document.getElementById("reset-btn");
  const summaryCard = document.getElementById("summary-card");

  // Initialisierung: Eine leere Startzeile einfügen
  function init() {
    drinksSetupBody.innerHTML = "";
    addDrinkRow();
    syncCalcTable();
  }

  // Zeile im Setup (Bereich 1) hinzufügen
  function addDrinkRow(name = "", price = "", initial = "") {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td data-label="Getränk / Name"><input type="text" class="drink-name" placeholder="z.B. Bier 0,5l" value="${name}"></td>
      <td data-label="Preis (€ / Stk.)"><input type="number" class="drink-price" step="0.10" min="0" placeholder="0.00" value="${price}"></td>
      <td data-label="Anfangsbestand (Stk.)"><input type="number" class="drink-initial" min="0" placeholder="0" value="${initial}"></td>
      <td data-label="Aktion"><button class="icon-btn remove-row-btn" title="Entfernen">✕</button></td>
    `;

    // Live-Synchronisation bei jeder Eingabe
    tr.querySelectorAll("input").forEach(input => {
      input.addEventListener("input", syncCalcTable);
    });

    tr.querySelector(".remove-row-btn").addEventListener("click", () => {
      tr.remove();
      syncCalcTable();
    });

    drinksSetupBody.appendChild(tr);
    syncCalcTable();
  }

  addDrinkBtn.addEventListener("click", () => addDrinkRow());

  // Untere Tabelle (Endstand) synchronisieren
  function syncCalcTable() {
    const setupRows = drinksSetupBody.querySelectorAll("tr");
    const currentCalcValues = {};

    // Eingegebene Restbestände merken, damit sie bei Textänderungen oben erhalten bleiben
    drinksCalcBody.querySelectorAll("tr").forEach((tr, idx) => {
      const restInput = tr.querySelector(".drink-rest");
      if (restInput) {
        currentCalcValues[idx] = restInput.value;
      }
    });

    drinksCalcBody.innerHTML = "";

    setupRows.forEach((row, idx) => {
      const name = row.querySelector(".drink-name").value || `Getränk ${idx + 1}`;
      const initial = parseInt(row.querySelector(".drink-initial").value) || 0;
      const savedRest = currentCalcValues[idx] !== undefined ? currentCalcValues[idx] : "";

      const tr = document.createElement("tr");
      tr.dataset.index = idx;

      tr.innerHTML = `
        <td data-label="Getränk"><strong>${escapeHtml(name)}</strong></td>
        <td data-label="Verbraucht" class="consumed-val">-</td>
        <td data-label="Endbestand (Rest)"><input type="number" class="drink-rest" min="0" max="${initial}" placeholder="0" value="${savedRest}"></td>
      `;

      drinksCalcBody.appendChild(tr);
    });
  }

  // Abrechnung durchführen
  calculateBtn.addEventListener("click", () => {
    const setupRows = drinksSetupBody.querySelectorAll("tr");
    const calcRows = drinksCalcBody.querySelectorAll("tr");

    let totalInitialItems = 0;
    let totalConsumedItems = 0;
    let totalPotentialVal = 0;
    let totalRevenue = 0;

    let hasError = false;

    setupRows.forEach((setupRow, idx) => {
      const calcRow = calcRows[idx];
      if (!calcRow) return;

      const price = parseFloat(setupRow.querySelector(".drink-price").value) || 0;
      const initial = parseInt(setupRow.querySelector(".drink-initial").value) || 0;
      const restInput = calcRow.querySelector(".drink-rest");
      const rest = parseInt(restInput.value) || 0;

      if (rest > initial) {
        alert(`Fehler bei "${setupRow.querySelector(".drink-name").value || 'Getränk ' + (idx + 1)}": Der Endbestand (${rest}) darf nicht größer als der Anfangsbestand (${initial}) sein!`);
        restInput.focus();
        hasError = true;
        return;
      }

      const consumed = initial - rest;
      const revenue = consumed * price;

      // Tabellenzelle in der 2. Tabelle aktualisieren
      calcRow.querySelector(".consumed-val").textContent = `${consumed} Stk.`;

      // Gesamtsummen berechnen
      totalInitialItems += initial;
      totalConsumedItems += consumed;
      totalPotentialVal += initial * price;
      totalRevenue += revenue;
    });

    if (hasError) return;

    // Kassensturz/Zusammenfassung befüllen und anzeigen
    document.getElementById("stat-initial-items").textContent = `${totalInitialItems} Stk.`;
    document.getElementById("stat-consumed-items").textContent = `${totalConsumedItems} Stk.`;
    document.getElementById("stat-total-val").textContent = `${totalPotentialVal.toFixed(2)} €`;
    document.getElementById("stat-total-revenue").textContent = `${totalRevenue.toFixed(2)} €`;

    summaryCard.classList.remove("hidden");
    summaryCard.scrollIntoView({ behavior: "smooth" });
  });

  // Zurücksetzen
  resetBtn.addEventListener("click", () => {
    if (confirm("Möchtest du wirklich alle Eingaben zurücksetzen?")) {
      summaryCard.classList.add("hidden");
      init();
    }
  });

  // Schutz vor HTML-Injektionen
  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  // App starten
  init();
});