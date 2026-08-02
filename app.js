document.addEventListener("DOMContentLoaded", () => {
  // DOM-Elemente
  const drinksSetupBody = document.getElementById("drinks-setup-body");
  const drinksCalcBody = document.getElementById("drinks-calc-body");
  const addDrinkBtn = document.getElementById("add-drink-btn");
  const calculateBtn = document.getElementById("calculate-btn");
  const resetBtn = document.getElementById("reset-btn");
  const exportPdfBtn = document.getElementById("export-pdf-btn");
  const summaryCard = document.getElementById("summary-card");

  const projectSelect = document.getElementById("project-select");
  const newProjectBtn = document.getElementById("new-project-btn");
  const deleteProjectBtn = document.getElementById("delete-project-btn");

  // Zustand
  const STORAGE_KEY = "getraenke_projekte_v1";
  let projects = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  let currentProjectName = "";

  // -------------------------------------------------------------
  // 1. PROJEKT-VERWALTUNG & LOCALSTORAGE
  // -------------------------------------------------------------

  function initApp() {
    const projectKeys = Object.keys(projects);

    if (projectKeys.length === 0) {
      // Erzwinge die Eingabe einer ersten Veranstaltung
      let initialName = prompt("Willkommen beim Getränkerechner!\nBitte gib den Namen deiner ersten Veranstaltung ein (z. B. Sommerfest 2026):");
      
      while (!initialName || initialName.trim() === "") {
        initialName = prompt("Ein Name ist erforderlich, um fortzufahren. Bitte gib einen Veranstaltungsnamen ein:");
      }

      const cleanName = initialName.trim();
      projects[cleanName] = [];
      currentProjectName = cleanName;
      saveProjectsToStorage();
    } else {
      currentProjectName = projectKeys[0];
    }

    updateProjectDropdown();
    loadProjectData(currentProjectName);
  }

  function saveProjectsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  function updateProjectDropdown() {
    projectSelect.innerHTML = "";
    Object.keys(projects).forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      if (name === currentProjectName) opt.selected = true;
      projectSelect.appendChild(opt);
    });
  }

  function saveCurrentState() {
    if (!currentProjectName) return;

    const drinksData = [];
    const setupRows = drinksSetupBody.querySelectorAll("tr");
    const calcRows = drinksCalcBody.querySelectorAll("tr");

    setupRows.forEach((row, idx) => {
      const calcRow = calcRows[idx];
      drinksData.push({
        name: row.querySelector(".drink-name")?.value || "",
        price: row.querySelector(".drink-price")?.value || "",
        initial: row.querySelector(".drink-initial")?.value || "",
        rest: calcRow ? (calcRow.querySelector(".drink-rest")?.value || "") : ""
      });
    });

    projects[currentProjectName] = drinksData;
    saveProjectsToStorage();
  }

  function loadProjectData(projectName) {
    currentProjectName = projectName;
    drinksSetupBody.innerHTML = "";
    summaryCard.classList.add("hidden");

    const data = projects[projectName] || [];

    if (data.length === 0) {
      addDrinkRow();
    } else {
      data.forEach(item => {
        addDrinkRow(item.name, item.price, item.initial);
      });

      // Reste in Endstand-Tabelle nachtragen
      const calcRows = drinksCalcBody.querySelectorAll("tr");
      data.forEach((item, idx) => {
        if (calcRows[idx] && item.rest !== undefined) {
          const restInput = calcRows[idx].querySelector(".drink-rest");
          if (restInput) restInput.value = item.rest;
        }
      });
    }

    syncCalcTable();
  }

  // EVENT: Neue Veranstaltung erstellen
  newProjectBtn.addEventListener("click", () => {
    saveCurrentState();
    const name = prompt("Name der neuen Veranstaltung:");
    
    if (name && name.trim() !== "") {
      const cleanName = name.trim();
      if (projects[cleanName]) {
        alert("Eine Veranstaltung mit diesem Namen existiert bereits!");
        projectSelect.value = cleanName;
        loadProjectData(cleanName);
      } else {
        projects[cleanName] = [];
        currentProjectName = cleanName;
        saveProjectsToStorage();
        updateProjectDropdown();
        loadProjectData(cleanName);
      }
    }
  });

  // EVENT: Veranstaltung wechseln
  projectSelect.addEventListener("change", (e) => {
    saveCurrentState();
    loadProjectData(e.target.value);
  });

  // EVENT: Veranstaltung löschen
  deleteProjectBtn.addEventListener("click", () => {
    if (!confirm(`Möchtest du die Veranstaltung "${currentProjectName}" wirklich löschen? Alle Daten dazu gehen verloren.`)) {
      return;
    }

    delete projects[currentProjectName];
    saveProjectsToStorage();

    const remainingKeys = Object.keys(projects);
    if (remainingKeys.length === 0) {
      initApp(); // Erzwingt neue Eingabe
    } else {
      currentProjectName = remainingKeys[0];
      updateProjectDropdown();
      loadProjectData(currentProjectName);
    }
  });

  // Event-Delegation für automatisches Speichern bei JEDER Änderung
  document.addEventListener("input", (e) => {
    if (e.target.matches(".drink-name, .drink-price, .drink-initial, .drink-rest")) {
      saveCurrentState();
    }
  });

  // -------------------------------------------------------------
  // 2. TABELLEN- LOGIK & SYNCHRONISATION
  // -------------------------------------------------------------

  function addDrinkRow(name = "", price = "", initial = "") {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td data-label="Getränk / Name"><input type="text" class="drink-name" placeholder="z.B. Bier 0,5l" value="${escapeHtml(name)}"></td>
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
      saveCurrentState();
    });

    drinksSetupBody.appendChild(tr);
    syncCalcTable();
  }

  addDrinkBtn.addEventListener("click", () => {
    addDrinkRow();
    saveCurrentState();
  });

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

  // -------------------------------------------------------------
  // 3. ABRECHNUNG & BERECHNUNG
  // -------------------------------------------------------------

  calculateBtn.addEventListener("click", () => {
    const setupRows = drinksSetupBody.querySelectorAll("tr");
    const calcRows = drinksCalcBody.querySelectorAll("tr");

    let totalPotentialVal = 0;
    let totalConsumedVal = 0;
    let totalRemainingVal = 0;
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
    saveCurrentState();
  });

  // -------------------------------------------------------------
  // 4. PDF EXPORT
  // -------------------------------------------------------------

  exportPdfBtn.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString("de-DE");

    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text(`Getränkeabrechnung: ${currentProjectName}`, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Erstellt am: ${today}`, 14, 27);

    const tableData = [];
    const setupRows = drinksSetupBody.querySelectorAll("tr");
    const calcRows = drinksCalcBody.querySelectorAll("tr");

    setupRows.forEach((setupRow, idx) => {
      const calcRow = calcRows[idx];
      const name = setupRow.querySelector(".drink-name").value || `Getränk ${idx + 1}`;
      const price = parseFloat(setupRow.querySelector(".drink-price").value) || 0;
      const initial = parseInt(setupRow.querySelector(".drink-initial").value) || 0;
      const rest = calcRow ? (parseInt(calcRow.querySelector(".drink-rest").value) || 0) : 0;
      const consumed = initial - rest;
      const consumedVal = consumed * price;

      tableData.push([
        name,
        `${price.toFixed(2)} €`,
        `${initial} Stk.`,
        `${rest} Stk.`,
        `${consumed} Stk.`,
        `${consumedVal.toFixed(2)} €`
      ]);
    });

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

    const safeFileName = currentProjectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`Abrechnung_${safeFileName}_${today.replace(/\./g, "-")}.pdf`);
  });

  // -------------------------------------------------------------
  // 5. HELFER-FUNKTIONEN & RESET
  // -------------------------------------------------------------

  resetBtn.addEventListener("click", () => {
    if (confirm(`Möchtest du die Werte der aktuellen Veranstaltung (${currentProjectName}) zurücksetzen?`)) {
      projects[currentProjectName] = [];
      saveProjectsToStorage();
      loadProjectData(currentProjectName);
    }
  });

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  // App starten
  initApp();
});