export const STORAGE_KEY = "water_bill_v1";

export const DEFAULT_FLAT_NUMBERS = [
  "G5",
  "G6",
  "G7",
  "105",
  "106",
  "107",
  "205",
  "206",
  "207"
];

export const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export const YEAR_OPTIONS = Array.from({ length: 9 }, (_, index) =>
  String(new Date().getFullYear() - 2 + index)
);

export const BILLING_PERIOD_OPTIONS = YEAR_OPTIONS.flatMap((year) =>
  MONTH_OPTIONS.map((monthLabel) => ({
    label: `${monthLabel} ${year}`,
    monthLabel,
    billYear: year
  }))
);

export const createFlat = (flatNumber) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  flatNumber,
  minutes: "",
  maintenance: "",
  isActive: true
});

export const createDefaultFlats = () =>
  DEFAULT_FLAT_NUMBERS.map((flatNumber) => createFlat(flatNumber));

export const getCurrentMonth = () => MONTH_OPTIONS[new Date().getMonth()];
export const getCurrentYear = () => String(new Date().getFullYear());

export const formatBillingPeriod = (monthLabel, billYear) => {
  const month = typeof monthLabel === "string" ? monthLabel.trim() : "";
  const year = typeof billYear === "string" ? billYear.trim() : "";
  if (month && year) return `${month} ${year}`;
  return month || year || "-";
};

export const parseBillingPeriod = (value) => {
  const option = BILLING_PERIOD_OPTIONS.find((item) => item.label === value);
  if (!option) {
    return {
      monthLabel: getCurrentMonth(),
      billYear: getCurrentYear()
    };
  }

  return {
    monthLabel: option.monthLabel,
    billYear: option.billYear
  };
};

export const createInitialFormState = () => ({
  monthLabel: getCurrentMonth(),
  billYear: getCurrentYear(),
  maintainedByFlat: "",
  finalPaymentDate: "",
  payTo: "",
  tankers: "",
  pricePerTanker: "",
  currentWaterBill: "",
  globalMaintenance: "",
  maintenanceMode: "global",
  flats: createDefaultFlats()
});

export const toNumber = (value) => {
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

export const roundRupee = (value) =>
  Math.round(Number.isFinite(value) ? value : 0);

export const formatPerMinute = (value) =>
  Number.isFinite(value) ? value.toFixed(3) : "0.000";

export const formatDateLabel = (date) =>
  `${date.getDate()} ${MONTH_OPTIONS[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;

export const parseDateInputValue = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const [year, month, day] = trimmed.split("-").map((part) => Number(part));
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return "";
  }

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "";
  return formatDateLabel(date);
};

export const formatDateInputValue = (label) => {
  if (typeof label !== "string") return "";
  const trimmed = label.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(\d{1,2})\s([A-Za-z]{3})\s(\d{4})$/);
  if (!match) return "";

  const day = Number(match[1]);
  const monthIndex = MONTH_OPTIONS.findIndex(
    (month) => month.slice(0, 3).toLowerCase() === match[2].toLowerCase()
  );
  const year = Number(match[3]);

  if (monthIndex === -1 || !Number.isInteger(day) || !Number.isInteger(year)) {
    return "";
  }

  const date = new Date(year, monthIndex, day);
  if (Number.isNaN(date.getTime())) return "";

  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
};

export const formatTimestamp = (value) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

export const normalizeSavedFlats = (savedFlats) => {
  if (!Array.isArray(savedFlats)) return createDefaultFlats();

  const byFlatNumber = new Map();
  savedFlats.forEach((flat) => {
    const key =
      typeof flat?.flatNumber === "string"
        ? flat.flatNumber.trim().toUpperCase()
        : "";
    if (!key) return;
    byFlatNumber.set(key, flat);
  });

  return DEFAULT_FLAT_NUMBERS.map((flatNumber) => {
    const saved = byFlatNumber.get(flatNumber.toUpperCase());
    if (!saved) return createFlat(flatNumber);

    return {
      id:
        typeof saved.id === "string" && saved.id
          ? saved.id
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      flatNumber,
      minutes: typeof saved.minutes === "string" ? saved.minutes : "",
      maintenance: typeof saved.maintenance === "string" ? saved.maintenance : "",
      isActive: typeof saved.isActive === "boolean" ? saved.isActive : true
    };
  });
};

export const normalizeSavedForm = (parsed) => {
  const initial = createInitialFormState();
  if (!parsed || typeof parsed !== "object") return initial;

  return {
    monthLabel:
      typeof parsed.monthLabel === "string" && parsed.monthLabel
        ? parsed.monthLabel
        : initial.monthLabel,
    billYear:
      typeof parsed.billYear === "string" && parsed.billYear
        ? parsed.billYear
        : initial.billYear,
    maintainedByFlat:
      typeof parsed.maintainedByFlat === "string" ? parsed.maintainedByFlat : "",
    finalPaymentDate:
      typeof parsed.finalPaymentDate === "string" ? parsed.finalPaymentDate : "",
    payTo: typeof parsed.payTo === "string" ? parsed.payTo : "",
    tankers: typeof parsed.tankers === "string" ? parsed.tankers : "",
    pricePerTanker:
      typeof parsed.pricePerTanker === "string" ? parsed.pricePerTanker : "",
    currentWaterBill:
      typeof parsed.currentWaterBill === "string" ? parsed.currentWaterBill : "",
    globalMaintenance:
      typeof parsed.globalMaintenance === "string" ? parsed.globalMaintenance : "",
    maintenanceMode: parsed.maintenanceMode === "perFlat" ? "perFlat" : "global",
    flats: normalizeSavedFlats(parsed.flats)
  };
};

export const computeBill = (form) => {
  const tankerCountNum = toNumber(form.tankers);
  const pricePerTankerNum = toNumber(form.pricePerTanker);
  const currentWaterBillNum = toNumber(form.currentWaterBill);
  const globalMaintenanceNum = toNumber(form.globalMaintenance);

  const totalWaterCost = tankerCountNum * pricePerTankerNum + currentWaterBillNum;
  const totalMinutes = form.flats.reduce(
    (sum, flat) => (flat.isActive ? sum + toNumber(flat.minutes) : sum),
    0
  );
  const perMinuteCost = totalMinutes > 0 ? totalWaterCost / totalMinutes : 0;
  const activeFlatsCount = form.flats.reduce(
    (sum, flat) => (flat.isActive ? sum + 1 : sum),
    0
  );

  const perFlat = form.flats.map((flat) => {
    const minutesNum = toNumber(flat.minutes);
    const waterAmount = flat.isActive ? minutesNum * perMinuteCost : 0;
    const maintenanceAmount = flat.isActive
      ? form.maintenanceMode === "perFlat"
        ? toNumber(flat.maintenance)
        : globalMaintenanceNum
      : 0;
    const total = flat.isActive ? waterAmount + maintenanceAmount : 0;

    return {
      id: flat.id,
      flatNumber: flat.flatNumber,
      isActive: flat.isActive,
      minutes: flat.isActive ? minutesNum : 0,
      waterAmount,
      maintenanceAmount,
      total
    };
  });

  const totalMaintenance = perFlat.reduce(
    (sum, row) => sum + row.maintenanceAmount,
    0
  );
  const grandTotal = perFlat.reduce((sum, row) => sum + row.total, 0);
  const activeRows = perFlat.filter((row) => row.isActive);

  return {
    totalWaterCost,
    totalMinutes,
    perMinuteCost,
    activeFlatsCount,
    totalMaintenance,
    grandTotal,
    perFlat,
    activeRows
  };
};

export const buildTemplateData = (form, computed) => ({
  monthLabel: formatBillingPeriod(form.monthLabel, form.billYear),
  maintainedByFlat: form.maintainedByFlat.trim() || "-",
  finalPaymentDate: form.finalPaymentDate.trim() || "-",
  payTo: form.payTo.trim() || "-",
  tankerCount: toNumber(form.tankers),
  pricePerTanker: toNumber(form.pricePerTanker),
  currentWaterBill: roundRupee(toNumber(form.currentWaterBill)),
  totalWaterCost: roundRupee(computed.totalWaterCost),
  totalMinutes: computed.totalMinutes,
  perMinuteCost: formatPerMinute(computed.perMinuteCost),
  activeFlatsCount: computed.activeFlatsCount,
  totalMaintenance: roundRupee(computed.totalMaintenance),
  grandTotal: roundRupee(computed.grandTotal),
  rows: computed.activeRows.map((row) => ({
    id: row.id,
    flatNumber: row.flatNumber,
    minutes: row.minutes,
    waterAmount: roundRupee(row.waterAmount),
    maintenanceAmount: roundRupee(row.maintenanceAmount),
    total: roundRupee(row.total)
  }))
});
