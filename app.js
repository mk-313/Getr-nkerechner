document.addEventListener("DOMContentLoaded", () => {
  const drinksSetupBody = document.getElementById("drinks-setup-body");
  const drinksCalcBody = document.getElementById("drinks-calc-body");
  const addDrinkBtn = document.getElementById("add-drink-btn");
  const calculateBtn = document.getElementById("calculate-btn");
  const resetBtn = document.getElementById("reset-btn");
  const exportPdfBtn = document.getElementById("export-pdf-btn");
  const summaryCard = document.getElementById("summary-card");

  // Initialisierung: Eine leere Startzeile bereitstellen
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

  // Untere Tabelle (Endstand) mit allen Werten aus Bereich 1 synchronisieren
  function syncCalcTable() {
    const setupRows = drinksSetupBody.querySelectorAll("tr");
    const currentCalcValues = {};

    drinksCalcBody.querySelectorAll("tr").forEach((tr, idx) => {
      const restInput = tr.querySelector(".drink-rest");
      if (restInput) {
        currentCalcValues[idx] = restInput.value;
      }
    });

    drinksCalcBody.innerHTML = "";

    setupRows.forEach((row, idx) => {
      const name = row.querySelector(".drink-name").value || `Getränk ${idx + 1}`;
      const price = parseFloat(row.querySelector(".drink-price").value) || 0;
      const initial = parseInt(row.querySelector(".drink-initial").value) || 0;
      const savedRest = currentCalcValues[idx] !== undefined ? currentCalcValues[idx] : "";

      const tr = document.createElement("tr");
      tr.dataset.index = idx;

      tr.innerHTML = `
        <td data-label="Getränk"><strong>${escapeHtml(name)}</strong></td>
        <td data-label="Preis">${price.toFixed(2)} €</td>
        <td data-label="Anfang">${initial} Stk.</td>
        <td data-label="Endbestand (Rest)"><input type="number" class="drink-rest" min="0" max="${initial}" placeholder="0" value="${savedRest}"></td>
        <td data-label="Verbraucht" class="consumed-val">-</td>
        <td data-label="Wert (€)" class="revenue-val">-</td>
      `;

      drinksCalcBody.appendChild(tr);
    });
  }

  // Abrechnung berechnen
  calculateBtn.addEventListener("click", () => {
    const setupRows = drinksSetupBody.querySelectorAll("tr");
    const calcRows = drinksCalcBody.querySelectorAll("tr");

    let totalPotentialVal = 0; // Gesamtwert (Einkauf)
    let totalConsumedVal = 0;  // Verbrauch (€)
    let totalRemainingVal = 0; // Endstand (€ / Restwert)

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
      const consumedValue = consumed * price;
      const remainingValue = rest * price;
      const initialValue = initial * price;

      calcRow.querySelector(".consumed-val").textContent = `${consumed} Stk.`;
      calcRow.querySelector(".revenue-val").textContent = `${consumedValue.toFixed(2)} €`;

      totalPotentialVal += initialValue;
      totalConsumedVal += consumedValue;
      totalRemainingVal += remainingValue;
    });

    if (hasError) return;

    document.getElementById("stat-total-val").textContent = `${totalPotentialVal.toFixed(2)} €`;
    document.getElementById("stat-remaining-val").textContent = `${totalRemainingVal.toFixed(2)} €`;
    document.getElementById("stat-consumed-val").textContent = `${totalConsumedVal.toFixed(2)} €`;

    summaryCard.classList.remove("hidden");
    summaryCard.scrollIntoView({ behavior: "smooth" });
  });

  // PDF-Export Funktion
  exportPdfBtn.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const today = new Date().toLocaleDateString("de-DE");

    // Header / Titel
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59); // Dunkelblau/Grau
    doc.text("Vereins-Getränkeabrechnung", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Erstellt am: ${today}`, 14, 27);

    // Daten aus der Tabelle sammeln
    const tableData = [];
    const setupRows = drinksSetupBody.querySelectorAll("tr");
    const calcRows = drinksCalcBody.querySelectorAll("tr");

    let totalInitial = 0;
    let totalRest = 0;
    let totalConsumed = 0;

    setupRows.forEach((setupRow, idx) => {
      const calcRow = calcRows[idx];
      const name = setupRow.querySelector(".drink-name").value || `Getränk ${idx + 1}`;
      const price = parseFloat(setupRow.querySelector(".drink-price").value) || 0;
      const initial = parseInt(setupRow.querySelector(".drink-initial").value) || 0;
      const rest = calcRow ? (parseInt(calcRow.querySelector(".drink-rest").value) || 0) : 0;
      const consumed = initial - rest;
      const consumedVal = consumed * price;

      totalInitial += initial;
      totalRest += rest;
      totalConsumed += consumed;

      tableData.push([
        name,
        `${price.toFixed(2)} €`,
        `${initial} Stk.`,
        `${rest} Stk.`,
        `${consumed} Stk.`,
        `${consumedVal.toFixed(2)} €`
      ]);
    });

    // Haupttabelle im PDF zeichnen
    doc.autoTable({
      startY: 35,
      head: [["Getränk", "Einzelpreis", "Anfang", "Restbestand", "Verbraucht", "Verbrauch (€)"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" }
      }
    });

    // Kassensturz / Gesamtergebnis unter der Tabelle
    const finalY = doc.lastAutoTable.finalY + 10;

    const totalPotentialVal = document.getElementById("stat-total-val").textContent;
    const totalRemainingVal = document.getElementById("stat-remaining-val").textContent;
    const totalConsumedVal = document.getElementById("stat-consumed-val").textContent;

    doc.autoTable({
      startY: finalY,
      head: [["Zusammenfassung / Kassensturz", "Betrag"]],
      body: [
        ["Gesamtwert (Einkauf)", totalPotentialVal],
        ["Endstand (Restwert)", totalRemainingVal],
        ["Gesamter Verbrauch (Umsatz / Getrunken in €)", totalConsumedVal]
      ],
      theme: "plain",
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        1: { halign: "right", fontStyle: "bold" }
      }
    });

    // PDF speichern
    doc.save(`Getraenkeabrechnung_${today.replace(/\./g, "-")}.pdf`);
  });

  // Zurücksetzen
  resetBtn.addEventListener("click", () => {
    if (confirm("Möchtest du wirklich alle Eingaben zurücksetzen?")) {
      summaryCard.classList.add("hidden");
      init();
    }
  });

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  // App starten
  init();
});