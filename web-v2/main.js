import {
  BILLING_PERIOD_OPTIONS,
  DEFAULT_FLAT_NUMBERS,
  buildTemplateData,
  computeBill,
  createDefaultFlats,
  createInitialFormState,
  formatBillingPeriod,
  formatDateInputValue,
  formatPerMinute,
  normalizeSavedForm,
  parseBillingPeriod,
  parseDateInputValue,
  roundRupee
} from "../shared/bill-core.js";
import { downloadBillImage, renderBillTemplate } from "./template.js";

const STORAGE_KEY = "water_bill_web_v2";

const state = {
  values: loadState()
};

const elements = {
  billingPeriod: document.querySelector("#billing-period"),
  finalPaymentDate: document.querySelector("#final-payment-date"),
  maintainedByFlat: document.querySelector("#maintained-by-flat"),
  payToFlat: document.querySelector("#pay-to-flat"),
  tankers: document.querySelector("#tankers"),
  pricePerTanker: document.querySelector("#price-per-tanker"),
  currentWaterBill: document.querySelector("#current-water-bill"),
  maintenanceModeToggle: document.querySelector("#maintenance-mode-toggle"),
  globalMaintenanceField: document.querySelector("#global-maintenance-field"),
  perFlatNote: document.querySelector("#per-flat-note"),
  globalMaintenance: document.querySelector("#global-maintenance"),
  flatsMeta: document.querySelector("#flats-meta"),
  flatsList: document.querySelector("#flats-list"),
  summaryLines: document.querySelector("#summary-lines"),
  breakdownTable: document.querySelector("#breakdown-table"),
  billTemplatePreview: document.querySelector("#bill-template-preview"),
  resetMonth: document.querySelector("#reset-month"),
  restoreFlats: document.querySelector("#restore-flats"),
  downloadImage: document.querySelector("#download-image"),
  validationMessage: document.querySelector("#validation-message")
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isNonNegativeNumber = (value) => {
  if (typeof value !== "string" || !value.trim()) return true;
  const number = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(number) && number >= 0;
};

function getValidationErrors(values, computed) {
  const errors = [];
  const numericFields = [
    ["number of tankers", values.tankers],
    ["price per tanker", values.pricePerTanker],
    ["current water bill", values.currentWaterBill]
  ];

  if (values.maintenanceMode === "perFlat") {
    values.flats.forEach((flat) => numericFields.push([`maintenance for flat ${flat.flatNumber}`, flat.maintenance]));
  } else {
    numericFields.push(["maintenance", values.globalMaintenance]);
  }
  values.flats.forEach((flat) => numericFields.push([`minutes for flat ${flat.flatNumber}`, flat.minutes]));

  if (numericFields.some(([, value]) => !isNonNegativeNumber(value))) {
    errors.push("Enter only non-negative numbers.");
  }
  if (!values.maintainedByFlat || !values.finalPaymentDate || !values.payTo) {
    errors.push("Choose the maintained-by flat, final payment date, and pay-to flat before downloading.");
  }
  if (computed.totalWaterCost > 0 && computed.totalMinutes <= 0) {
    errors.push("Enter minutes for at least one active flat to distribute the water bill.");
  }
  return errors;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialFormState();
    return normalizeSavedForm(JSON.parse(raw));
  } catch (error) {
    return createInitialFormState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.values));
  } catch (error) {
    // Rendering should still work if browser storage is unavailable.
  }
}

function setField(key, value) {
  state.values = { ...state.values, [key]: value };
  persistAndRender();
}

function setBillingPeriod(value) {
  state.values = {
    ...state.values,
    ...parseBillingPeriod(value)
  };
  persistAndRender();
}

function updateFlatField(id, key, value) {
  state.values = {
    ...state.values,
    flats: state.values.flats.map((flat) =>
      flat.id === id ? { ...flat, [key]: value } : flat
    )
  };
  persistAndRender({ skipFlats: true });
}

function toggleFlat(id, isActive) {
  state.values = {
    ...state.values,
    flats: state.values.flats.map((flat) =>
      flat.id === id ? { ...flat, isActive } : flat
    )
  };
  persistAndRender();
}

function restoreFlats() {
  if (!window.confirm("Restore the default flats? This clears all entered minutes, maintenance values, and active/inactive selections.")) {
    return;
  }
  state.values = {
    ...state.values,
    flats: createDefaultFlats()
  };
  persistAndRender();
}

function resetMonth() {
  if (!window.confirm("Reset this month? This clears every bill field and flat value.")) {
    return;
  }
  state.values = createInitialFormState();
  persistAndRender();
}

function persistAndRender(options = {}) {
  saveState();
  render(options);
}

function hydrateSelect(select, options, emptyLabel = "Select flat") {
  select.innerHTML = "";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = emptyLabel;
  select.appendChild(emptyOption);

  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });
}

function renderSummary(values, computed) {
  const period = formatBillingPeriod(values.monthLabel, values.billYear);
  elements.summaryLines.innerHTML = [
    `<div class="flex justify-between items-center"><span class="text-on-surface-variant">Month:</span> <span class="font-bold text-on-surface">${escapeHtml(period)}</span></div>`,
    `<div class="flex justify-between items-center"><span class="text-on-surface-variant">Total Water Cost:</span> <span class="font-bold text-on-surface">Rs ${roundRupee(computed.totalWaterCost)}</span></div>`,
    `<div class="flex justify-between items-center"><span class="text-on-surface-variant">Water Collected:</span> <span class="font-bold text-on-surface">Rs ${roundRupee(computed.totalWaterCollected)}</span></div>`,
    `<div class="flex justify-between items-center"><span class="text-on-surface-variant">Rounding to Maintenance:</span> <span class="font-bold text-on-surface">Rs ${roundRupee(computed.waterRoundingSurplus)}</span></div>`,
    `<div class="flex justify-between items-center"><span class="text-on-surface-variant">Total Minutes:</span> <span class="font-bold text-on-surface">${computed.totalMinutes}</span></div>`,
    `<div class="flex justify-between items-center"><span class="text-on-surface-variant">Per Minute Cost:</span> <span class="font-bold text-on-surface">Rs ${formatPerMinute(computed.perMinuteCost)}</span></div>`,
    `<div class="flex justify-between items-center"><span class="text-on-surface-variant">Maintained By:</span> <span class="font-bold text-on-surface">Flat ${escapeHtml(values.maintainedByFlat.trim() || "-")}</span></div>`,
    `<div class="flex justify-between items-center"><span class="text-on-surface-variant">Final Payment Date:</span> <span class="font-bold text-on-surface">${escapeHtml(values.finalPaymentDate.trim() || "-")}</span></div>`,
    `<div class="flex justify-between items-center"><span class="text-on-surface-variant">Pay To:</span> <span class="font-bold text-on-surface">${escapeHtml(values.payTo.trim() || "-")}</span></div>`
  ].join("");
}

function renderBreakdown(computed) {
  elements.breakdownTable.innerHTML = `
    <table class="w-full">
      <thead>
        <tr>
          <th class="text-left">Flat</th>
          <th class="text-right">Min</th>
          <th class="text-right">Water</th>
          <th class="text-right">Maint</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${computed.perFlat
          .map(
            (row, index) => `
              <tr class="${index % 2 === 1 ? "striped" : ""} ${row.isActive ? "" : "inactive"}">
                <td class="font-medium">${escapeHtml(row.flatNumber)}${row.isActive ? "" : " <span class=\"text-xs text-on-surface-variant\">(off)</span>"}</td>
                <td class="text-right">${row.minutes}</td>
                <td class="text-right">${roundRupee(row.waterAmount)}</td>
                <td class="text-right">${roundRupee(row.maintenanceAmount)}</td>
                <td class="text-right font-semibold">${roundRupee(row.total)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td class="uppercase tracking-wider">Total</td>
          <td class="text-right">${computed.totalMinutes}</td>
          <td class="text-right">${roundRupee(computed.totalWaterCollected)}</td>
          <td class="text-right">${roundRupee(computed.totalMaintenance)}</td>
          <td class="text-right">${roundRupee(computed.grandTotal)}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

function renderFlats(values, computed) {
  elements.flatsMeta.textContent = `Total rows: ${values.flats.length} | Active: ${computed.activeFlatsCount}`;

  elements.flatsList.innerHTML = values.flats
    .map(
      (flat, index) => `
        <article class="flat-card ${flat.isActive ? '' : 'inactive'} bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30" data-flat-id="${flat.id}">
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-bold text-on-surface text-lg">Flat ${escapeHtml(flat.flatNumber)}</h3>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-on-surface-variant uppercase">${flat.isActive ? 'Active' : 'Inactive'}</span>
              <label class="relative inline-flex items-center cursor-pointer scale-90" for="flat-${index}-active">
                <input id="flat-${index}-active" type="checkbox" data-role="active-toggle" aria-label="Set Flat ${escapeHtml(flat.flatNumber)} active" ${flat.isActive ? 'checked' : ''} class="sr-only toggle-checkbox" />
                <div class="w-10 h-5 bg-outline-variant rounded-full transition-colors toggle-bg">
                  <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform toggle-dot"></div>
                </div>
              </label>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <label for="flat-${index}-minutes" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Minutes used</label>
              <input
                id="flat-${index}-minutes"
                type="number"
                min="0"
                step="1"
                class="w-full bg-surface-container border border-outline-variant/50 rounded-lg px-3 py-2.5 text-on-surface font-semibold text-sm focus:ring-2 focus:ring-primary/20 ${flat.isActive ? '' : 'opacity-50 cursor-not-allowed'}"
                data-role="minutes"
                value="${escapeHtml(flat.minutes)}"
                inputmode="numeric"
                placeholder="0"
                ${flat.isActive ? '' : 'disabled'}
              />
            </div>

            ${
              values.maintenanceMode === "perFlat"
                ? `
                  <div>
                    <label for="flat-${index}-maintenance" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Maintenance (Rs)</label>
                    <input
                      id="flat-${index}-maintenance"
                      type="number"
                      min="0"
                      step="1"
                      class="w-full bg-surface-container border border-outline-variant/50 rounded-lg px-3 py-2.5 text-on-surface font-semibold text-sm focus:ring-2 focus:ring-primary/20 ${flat.isActive ? '' : 'opacity-50 cursor-not-allowed'}"
                      data-role="maintenance"
                      value="${escapeHtml(flat.maintenance)}"
                      inputmode="numeric"
                      placeholder="0"
                      ${flat.isActive ? '' : 'disabled'}
                    />
                  </div>
                `
                : ""
            }
          </div>
        </article>
      `
    )
    .join("");
}

function render({ skipFlats = false } = {}) {
  const { values } = state;
  const computed = computeBill(values);
  const templateData = buildTemplateData(values, computed);
  const validationErrors = getValidationErrors(values, computed);

  elements.billingPeriod.value = formatBillingPeriod(values.monthLabel, values.billYear);
  elements.finalPaymentDate.value = formatDateInputValue(values.finalPaymentDate);
  elements.maintainedByFlat.value = values.maintainedByFlat;
  elements.payToFlat.value = values.payTo;
  elements.tankers.value = values.tankers;
  elements.pricePerTanker.value = values.pricePerTanker;
  elements.currentWaterBill.value = values.currentWaterBill;
  elements.maintenanceModeToggle.checked = values.maintenanceMode === "perFlat";
  elements.globalMaintenance.value = values.globalMaintenance;
  elements.globalMaintenanceField.hidden = values.maintenanceMode !== "global";
  elements.perFlatNote.hidden = values.maintenanceMode !== "perFlat";
  elements.validationMessage.textContent = validationErrors[0] || "";
  elements.validationMessage.classList.toggle("text-error", validationErrors.length > 0);
  elements.validationMessage.classList.remove("text-secondary");
  elements.downloadImage.disabled = validationErrors.length > 0;
  elements.downloadImage.classList.toggle("opacity-50", validationErrors.length > 0);
  elements.downloadImage.classList.toggle("cursor-not-allowed", validationErrors.length > 0);

  renderSummary(values, computed);
  renderBreakdown(computed);
  if (!skipFlats) {
    renderFlats(values, computed);
  }
  elements.billTemplatePreview.innerHTML = renderBillTemplate(templateData);
}

function bindEvents() {
  elements.billingPeriod.addEventListener("change", (event) => {
    setBillingPeriod(event.target.value);
  });

  elements.finalPaymentDate.addEventListener("change", (event) => {
    setField("finalPaymentDate", parseDateInputValue(event.target.value));
  });

  elements.maintainedByFlat.addEventListener("change", (event) => {
    setField("maintainedByFlat", event.target.value);
  });

  elements.payToFlat.addEventListener("change", (event) => {
    setField("payTo", event.target.value);
  });

  elements.tankers.addEventListener("input", (event) => {
    setField("tankers", event.target.value);
  });

  elements.pricePerTanker.addEventListener("input", (event) => {
    setField("pricePerTanker", event.target.value);
  });

  elements.currentWaterBill.addEventListener("input", (event) => {
    setField("currentWaterBill", event.target.value);
  });

  elements.maintenanceModeToggle.addEventListener("change", (event) => {
    setField("maintenanceMode", event.target.checked ? "perFlat" : "global");
  });

  elements.globalMaintenance.addEventListener("input", (event) => {
    setField("globalMaintenance", event.target.value);
  });

  elements.flatsList.addEventListener("input", (event) => {
    const card = event.target.closest("[data-flat-id]");
    if (!card) return;
    const { flatId } = card.dataset;
    const role = event.target.dataset.role;
    if (!role) return;

    if (role === "minutes" || role === "maintenance") {
      updateFlatField(flatId, role, event.target.value);
    }
  });

  elements.flatsList.addEventListener("change", (event) => {
    const card = event.target.closest("[data-flat-id]");
    if (!card) return;
    const { flatId } = card.dataset;
    if (event.target.dataset.role === "active-toggle") {
      toggleFlat(flatId, event.target.checked);
    }
  });

  elements.resetMonth.addEventListener("click", resetMonth);
  elements.restoreFlats.addEventListener("click", restoreFlats);
  elements.downloadImage.addEventListener("click", () => {
    const computed = computeBill(state.values);
    const validationErrors = getValidationErrors(state.values, computed);
    if (validationErrors.length > 0) {
      elements.validationMessage.textContent = validationErrors[0];
      return;
    }
    const templateData = buildTemplateData(state.values, computed);
    try {
      downloadBillImage(templateData);
      elements.validationMessage.textContent = "Bill image downloaded.";
      elements.validationMessage.classList.remove("text-error");
      elements.validationMessage.classList.add("text-secondary");
    } catch (error) {
      elements.validationMessage.textContent = "Could not generate the bill image. Please try again.";
      elements.validationMessage.classList.remove("text-secondary");
      elements.validationMessage.classList.add("text-error");
    }
  });
}

function seedStaticOptions() {
  elements.billingPeriod.innerHTML = BILLING_PERIOD_OPTIONS.map(
    (period) => `<option value="${period.label}">${period.label}</option>`
  ).join("");

  hydrateSelect(elements.maintainedByFlat, DEFAULT_FLAT_NUMBERS);
  hydrateSelect(elements.payToFlat, DEFAULT_FLAT_NUMBERS);
}

seedStaticOptions();
bindEvents();
render();
