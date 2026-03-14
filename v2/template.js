const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const renderBillTemplate = (data) => `
  <article class="bill-shot">
    <h3 class="bill-title">MONTHLY WATER BILL</h3>
    <p class="bill-meta-large">Month: ${escapeHtml(data.monthLabel)}</p>

    <div class="bill-summary-row">
      <section class="bill-summary-card">
        <h4 class="bill-summary-title">Water Cost</h4>
        <p class="bill-meta-line">Tankers: ${escapeHtml(data.tankerCount)}</p>
        <p class="bill-meta-line">Price/Tanker: Rs ${escapeHtml(data.pricePerTanker)}</p>
        <p class="bill-meta-line">Current Bill: Rs ${escapeHtml(data.currentWaterBill)}</p>
        <p class="bill-meta-line">Total Water Cost: Rs ${escapeHtml(data.totalWaterCost)}</p>
      </section>
      <section class="bill-summary-card">
        <h4 class="bill-summary-title">Usage Summary</h4>
        <p class="bill-meta-line">Total Minutes: ${escapeHtml(data.totalMinutes)}</p>
        <p class="bill-meta-line">Per Minute: Rs ${escapeHtml(data.perMinuteCost)}</p>
        <p class="bill-meta-line">Active Flats: ${escapeHtml(data.activeFlatsCount)}</p>
        <p class="bill-meta-line">Maintained By: Flat ${escapeHtml(data.maintainedByFlat)}</p>
      </section>
    </div>

    <table>
      <thead>
        <tr>
          <th>Flat No</th>
          <th>Minutes</th>
          <th>Water Amt</th>
          <th>Maint</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.rows
          .map(
            (row, index) => `
              <tr class="${index % 2 === 1 ? "is-striped" : ""}">
                <td>${escapeHtml(row.flatNumber)}</td>
                <td>${escapeHtml(row.minutes)}</td>
                <td>${escapeHtml(row.waterAmount)}</td>
                <td>${escapeHtml(row.maintenanceAmount)}</td>
                <td>${escapeHtml(row.total)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td>Grand Total</td>
          <td>${escapeHtml(data.totalMinutes)}</td>
          <td>${escapeHtml(data.totalWaterCost)}</td>
          <td>${escapeHtml(data.totalMaintenance)}</td>
          <td>${escapeHtml(data.grandTotal)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="bill-footer-meta">
      <div class="bill-footer-line">Final Payment Date: ${escapeHtml(data.finalPaymentDate)}</div>
      <div class="bill-footer-line">Pay To: ${escapeHtml(data.payTo)}</div>
    </div>
    <p class="bill-generated-note">Generated from Monthly Apartment Bill app</p>
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
