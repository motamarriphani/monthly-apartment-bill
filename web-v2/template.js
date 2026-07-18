const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const renderBillTemplate = (data) => `
  <article class="bg-white rounded-xl p-4 border border-outline-variant">
    <h3 class="text-lg font-black uppercase tracking-tight text-on-surface mb-2">Water Bill</h3>
    <p class="text-xs text-on-surface-variant mb-4">Month: ${escapeHtml(data.monthLabel)}</p>

    <div class="grid grid-cols-2 gap-3 mb-4 text-xs">
      <div class="bg-surface-container-low rounded-lg p-3">
        <h4 class="font-bold text-on-surface mb-2 text-xs">Water Cost</h4>
        <div class="space-y-1 text-on-surface-variant">
          <p>Tankers: ${escapeHtml(data.tankerCount)}</p>
          <p>Price/Tanker: Rs ${escapeHtml(data.pricePerTanker)}</p>
          <p>Current Bill: Rs ${escapeHtml(data.currentWaterBill)}</p>
          <p class="font-semibold text-on-surface">Total: Rs ${escapeHtml(data.totalWaterCost)}</p>
        </div>
      </div>
      <div class="bg-surface-container-low rounded-lg p-3">
        <h4 class="font-bold text-on-surface mb-2 text-xs">Usage Summary</h4>
        <div class="space-y-1 text-on-surface-variant">
          <p>Total Minutes: ${escapeHtml(data.totalMinutes)}</p>
          <p>Per Minute: Rs ${escapeHtml(data.perMinuteCost)}</p>
          <p>Active Flats: ${escapeHtml(data.activeFlatsCount)}</p>
          <p>Maintained By: Flat ${escapeHtml(data.maintainedByFlat)}</p>
        </div>
      </div>
    </div>

    <table class="w-full text-xs">
      <thead>
        <tr class="bg-surface-container-high text-on-surface border-b border-outline-variant">
          <th class="py-2 px-1 text-left font-bold">Flat No</th>
          <th class="py-2 px-1 text-center font-bold">Minutes</th>
          <th class="py-2 px-1 text-center font-bold">Water Amt</th>
          <th class="py-2 px-1 text-center font-bold">Maint</th>
          <th class="py-2 px-1 text-right font-bold">Total</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-outline-variant/30">
        ${data.rows
          .map(
            (row, index) => `
              <tr class="${index % 2 === 1 ? "bg-surface-container-low/50" : ""}">
                <td class="py-2 px-1 font-medium text-on-surface">${escapeHtml(row.flatNumber)}</td>
                <td class="py-2 px-1 text-center text-on-surface-variant">${escapeHtml(row.minutes)}</td>
                <td class="py-2 px-1 text-center text-on-surface-variant">${escapeHtml(row.waterAmount)}</td>
                <td class="py-2 px-1 text-center text-on-surface-variant">${escapeHtml(row.maintenanceAmount)}</td>
                <td class="py-2 px-1 text-right font-semibold text-on-surface">${escapeHtml(row.total)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr class="bg-primary/10 border-t-2 border-primary">
          <td class="py-2 px-1 font-bold text-primary">Grand Total</td>
          <td class="py-2 px-1 text-center font-bold text-primary">${escapeHtml(data.totalMinutes)}</td>
          <td class="py-2 px-1 text-center font-bold text-primary">${escapeHtml(data.totalWaterCost)}</td>
          <td class="py-2 px-1 text-center font-bold text-primary">${escapeHtml(data.totalMaintenance)}</td>
          <td class="py-2 px-1 text-right font-bold text-primary">${escapeHtml(data.grandTotal)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="mt-4 pt-3 border-t border-outline-variant/30 flex justify-between text-xs text-on-surface-variant">
      <span>Final Payment Date: ${escapeHtml(data.finalPaymentDate)}</span>
      <span>Pay To: ${escapeHtml(data.payTo)}</span>
    </div>
    <p class="mt-3 text-xs text-on-surface-variant/70 italic">Generated from Monthly Apartment Bill app</p>
  </article>
`;

export const downloadBillImage = (data) => {
  const rowCount = data.rows.length;
  const width = 1240;
  const topAreaHeight = 360;
  const rowHeight = 44;
  const footerHeight = 190;
  const height = topAreaHeight + rowCount * rowHeight + footerHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create image.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const left = 42;
  const contentWidth = width - left * 2;

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 42px Arial";
  ctx.fillText("MONTHLY WATER BILL", left, 58);

  ctx.fillStyle = "#475569";
  ctx.font = "500 22px Arial";
  ctx.fillText(`Month: ${data.monthLabel}`, left, 96);

  const boxTop = 122;
  const boxHeight = 182;
  const boxGap = 24;
  const boxWidth = (contentWidth - boxGap) / 2;

  const drawBox = (x, title, lines) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, boxTop, boxWidth, boxHeight);
    ctx.strokeStyle = "#dbe3ee";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, boxTop, boxWidth, boxHeight);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 24px Arial";
    ctx.fillText(title, x + 14, boxTop + 34);
    ctx.fillStyle = "#1e293b";
    ctx.font = "500 21px Arial";
    lines.forEach((line, index) => {
      ctx.fillText(line, x + 14, boxTop + 72 + index * 32);
    });
  };

  drawBox(left, "Water Cost", [
    `Tankers: ${data.tankerCount}`,
    `Price/Tanker: Rs ${data.pricePerTanker}`,
    `Current Bill: Rs ${data.currentWaterBill}`,
    `Total Water Cost: Rs ${data.totalWaterCost}`
  ]);

  drawBox(left + boxWidth + boxGap, "Usage Summary", [
    `Total Minutes: ${data.totalMinutes}`,
    `Per Minute: Rs ${data.perMinuteCost}`,
    `Active Flats: ${data.activeFlatsCount}`,
    `Maintained By: Flat ${data.maintainedByFlat}`
  ]);

  const yStart = boxTop + boxHeight + 46;
  const xFlat = left + 8;
  const xMin = left + 280;
  const xWater = left + 500;
  const xMaint = left + 730;
  const xTotal = left + 950;

  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(left, yStart - 32, contentWidth, 42);
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 22px Arial";
  ctx.fillText("Flat No", xFlat, yStart);
  ctx.fillText("Minutes", xMin, yStart);
  ctx.fillText("Water Amt", xWater, yStart);
  ctx.fillText("Maint", xMaint, yStart);
  ctx.fillText("Total", xTotal, yStart);

  let y = yStart + 36;
  ctx.font = "500 21px Arial";
  data.rows.forEach((row, index) => {
    if (index % 2 === 1) {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(left, y - 28, contentWidth, rowHeight);
    }
    ctx.fillStyle = "#111827";
    ctx.fillText(String(row.flatNumber), xFlat, y);
    ctx.fillText(String(row.minutes), xMin, y);
    ctx.fillText(String(row.waterAmount), xWater, y);
    ctx.fillText(String(row.maintenanceAmount), xMaint, y);
    ctx.fillText(String(row.total), xTotal, y);
    y += rowHeight;
  });

  ctx.fillStyle = "#dbeafe";
  ctx.fillRect(left, y - 26, contentWidth, 46);
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 22px Arial";
  ctx.fillText("Grand Total", xFlat, y + 6);
  ctx.fillText(String(data.totalMinutes), xMin, y + 6);
  ctx.fillText(String(data.totalWaterCost), xWater, y + 6);
  ctx.fillText(String(data.totalMaintenance), xMaint, y + 6);
  ctx.fillText(String(data.grandTotal), xTotal, y + 6);

  ctx.fillStyle = "#475569";
  ctx.font = "500 19px Arial";
  ctx.fillText(`Final Payment Date: ${data.finalPaymentDate}`, left, y + 64);
  ctx.fillText(`Pay To: ${data.payTo}`, left + 560, y + 64);
  ctx.fillText("Generated from Monthly Apartment Bill app", left, y + 104);

  const link = document.createElement("a");
  link.download = `water-bill-${data.monthLabel.replace(/\s+/g, "-").toLowerCase()}-v2.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};
