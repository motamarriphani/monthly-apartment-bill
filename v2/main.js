import {
  BILLING_PERIOD_OPTIONS,
  DEFAULT_FLAT_NUMBERS,
  buildTemplateData,
  computeBill,
  createDefaultFlats,
  createInitialFormState,
  formatBillingPeriod,
  formatDateInputValue,
  normalizeSavedForm,
  parseBillingPeriod,
  parseDateInputValue,
  roundRupee
} from "./shared/bill-core.js";
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
  maintenanceMode: document.querySelector("#maintenance-mode"),
  globalMaintenanceField: document.querySelector("#global-maintenance-field"),
  globalMaintenance: document.querySelector("#global-maintenance"),
  flatsList: document.querySelector("#flats-list"),
  summaryGrid: document.querySelector("#summary-grid"),
  breakdownTable: document.querySelector("#breakdown-table"),
  billTemplatePreview: document.querySelector("#bill-template-preview"),
  resetMonth: document.querySelector("#reset-month"),
  restoreFlats: document.querySelector("#restore-flats"),
  downloadImage: document.querySelector("#download-image")
};

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.values));
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
  persistAndRender();
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
  state.values = {
    ...state.values,
    flats: createDefaultFlats()
  };
  persistAndRender();
}

function resetMonth() {
  state.values = createInitialFormState();
  persistAndRender();
}

function persistAndRender() {
  saveState();
  render();
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

function renderSummary(computed, templateData) {
  const cards = [
    {
      title: "Billing Period",
      value: templateData.monthLabel,
      note: `Maintained by flat ${templateData.maintainedByFlat}`
    },
    {
      title: "Grand Total",
      value: `Rs ${templateData.grandTotal}`,
      note: "Water + maintenance"
    },
    {
      title: "Per Minute",
      value: `Rs ${templateData.perMinuteCost}`,
      note: `${computed.totalMinutes} total minutes`
    },
    {
      title: "Pay To",
      value: templateData.payTo,
      note: `Due: ${templateData.finalPaymentDate}`
    }
  ];

  elements.summaryGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="summary-card">
          <h3>${card.title}</h3>
          <strong>${card.value}</strong>
          <p>${card.note}</p>
        </article>
      `
    )
    .join("");
}

function renderBreakdown(computed) {
  elements.breakdownTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Flat</th>
          <th>Minutes</th>
          <th>Water</th>
          <th>Maint</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${computed.perFlat
          .map(
            (row) => `
              <tr class="${row.isActive ? "" : "is-inactive"}">
                <td>${row.flatNumber}${row.isActive ? "" : " (off)"}</td>
                <td>${row.minutes}</td>
                <td>${roundRupee(row.waterAmount)}</td>
                <td>${roundRupee(row.maintenanceAmount)}</td>
                <td>${roundRupee(row.total)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderFlats(values) {
  elements.flatsList.innerHTML = values.flats
    .map(
      (flat) => `
        <article class="flat-card ${flat.isActive ? "" : "is-inactive"}" data-flat-id="${flat.id}">
          <div class="flat-card-head">
            <h3 class="flat-card-title">Flat ${flat.flatNumber}</h3>
            <label class="inline-toggle">
              <input type="checkbox" data-role="active-toggle" ${flat.isActive ? "checked" : ""} />
              <span>${flat.isActive ? "Active" : "Inactive"}</span>
            </label>
          </div>
          <div class="flat-card-grid">
            <label class="field">
              <span>Minutes used</span>
              <input data-role="minutes" value="${flat.minutes}" inputmode="numeric" placeholder="0" ${flat.isActive ? "" : "disabled"} />
            </label>
            ${
              values.maintenanceMode === "perFlat"
                ? `
                  <label class="field">
                    <span>Maintenance (Rs)</span>
                    <input data-role="maintenance" value="${flat.maintenance}" inputmode="numeric" placeholder="0" ${flat.isActive ? "" : "disabled"} />
                  </label>
                `
                : ""
            }
          </div>
        </article>
      `
    )
    .join("");
}

function render() {
  const { values } = state;
  const computed = computeBill(values);
  const templateData = buildTemplateData(values, computed);

  elements.billingPeriod.value = formatBillingPeriod(values.monthLabel, values.billYear);
  elements.finalPaymentDate.value = formatDateInputValue(values.finalPaymentDate);
  elements.maintainedByFlat.value = values.maintainedByFlat;
  elements.payToFlat.value = values.payTo;
  elements.tankers.value = values.tankers;
  elements.pricePerTanker.value = values.pricePerTanker;
  elements.currentWaterBill.value = values.currentWaterBill;
  elements.maintenanceMode.value = values.maintenanceMode;
  elements.globalMaintenance.value = values.globalMaintenance;
  elements.globalMaintenanceField.hidden = values.maintenanceMode !== "global";

  renderSummary(computed, templateData);
  renderBreakdown(computed);
  renderFlats(values);
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

  elements.maintenanceMode.addEventListener("change", (event) => {
    setField("maintenanceMode", event.target.value);
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
    const templateData = buildTemplateData(state.values, computed);
    downloadBillImage(templateData);
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
