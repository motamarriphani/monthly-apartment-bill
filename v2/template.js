const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const renderBillTemplate = (data) => `
  <article class="bill-preview">
    <div class="bill-preview-header">
      <div>
        <h3>Monthly Water Bill</h3>
        <p class="bill-preview-period">${escapeHtml(data.monthLabel)}</p>
      </div>
      <div>
        <strong>Rs ${escapeHtml(data.grandTotal)}</strong>
      </div>
    </div>

    <div class="bill-summary-strip">
      <section class="bill-summary-box">
        <h4>Water Cost</h4>
        <p>Tankers: ${escapeHtml(data.tankerCount)}</p>
        <p>Price/Tanker: Rs ${escapeHtml(data.pricePerTanker)}</p>
        <p>Current Bill: Rs ${escapeHtml(data.currentWaterBill)}</p>
        <p>Total Water Cost: Rs ${escapeHtml(data.totalWaterCost)}</p>
      </section>
      <section class="bill-summary-box">
        <h4>Usage Summary</h4>
        <p>Total Minutes: ${escapeHtml(data.totalMinutes)}</p>
        <p>Per Minute: Rs ${escapeHtml(data.perMinuteCost)}</p>
        <p>Active Flats: ${escapeHtml(data.activeFlatsCount)}</p>
        <p>Maintained By: Flat ${escapeHtml(data.maintainedByFlat)}</p>
      </section>
    </div>

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
        ${data.rows
          .map(
            (row) => `
              <tr>
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

    <div class="bill-footnotes">
      <div>Final Payment Date: ${escapeHtml(data.finalPaymentDate)}</div>
      <div>Pay To: ${escapeHtml(data.payTo)}</div>
    </div>
    <p class="bill-generated">Generated from Monthly Apartment Bill Web V2</p>
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

  ctx.fillStyle = "#fffaf2";
  ctx.fillRect(0, 0, width, height);

  const left = 42;
  const contentWidth = width - left * 2;

  ctx.fillStyle = "#166534";
  ctx.font = "700 18px Georgia";
  ctx.fillText("MONTHLY APARTMENT BILL", left, 38);

  ctx.fillStyle = "#1f2933";
  ctx.font = "700 42px Georgia";
  ctx.fillText("Web V2 Bill", left, 84);

  ctx.fillStyle = "#5a6978";
  ctx.font = "500 22px Georgia";
  ctx.fillText(data.monthLabel, left, 118);

  const boxTop = 146;
  const boxHeight = 176;
  const boxGap = 24;
  const boxWidth = (contentWidth - boxGap) / 2;

  const drawBox = (x, title, lines) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, boxTop, boxWidth, boxHeight);
    ctx.strokeStyle = "#d7cfc0";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, boxTop, boxWidth, boxHeight);
    ctx.fillStyle = "#1f2933";
    ctx.font = "700 24px Georgia";
    ctx.fillText(title, x + 14, boxTop + 34);
    ctx.fillStyle = "#3f4c59";
    ctx.font = "500 21px Georgia";
    lines.forEach((line, index) => {
      ctx.fillText(line, x + 14, boxTop + 72 + index * 30);
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

  const yStart = boxTop + boxHeight + 44;
  const xFlat = left + 8;
  const xMin = left + 280;
  const xWater = left + 500;
  const xMaint = left + 730;
  const xTotal = left + 950;

  ctx.fillStyle = "#ece4d3";
  ctx.fillRect(left, yStart - 30, contentWidth, 42);
  ctx.fillStyle = "#1f2933";
  ctx.font = "700 22px Georgia";
  ctx.fillText("Flat", xFlat, yStart);
  ctx.fillText("Minutes", xMin, yStart);
  ctx.fillText("Water", xWater, yStart);
  ctx.fillText("Maint", xMaint, yStart);
  ctx.fillText("Total", xTotal, yStart);

  let y = yStart + 34;
  ctx.font = "500 21px Georgia";
  data.rows.forEach((row, index) => {
    if (index % 2 === 1) {
      ctx.fillStyle = "#f7f2e7";
      ctx.fillRect(left, y - 26, contentWidth, rowHeight);
    }
    ctx.fillStyle = "#1f2933";
    ctx.fillText(String(row.flatNumber), xFlat, y);
    ctx.fillText(String(row.minutes), xMin, y);
    ctx.fillText(String(row.waterAmount), xWater, y);
    ctx.fillText(String(row.maintenanceAmount), xMaint, y);
    ctx.fillText(String(row.total), xTotal, y);
    y += rowHeight;
  });

  ctx.fillStyle = "#dce9df";
  ctx.fillRect(left, y - 24, contentWidth, 46);
  ctx.fillStyle = "#14532d";
  ctx.font = "700 22px Georgia";
  ctx.fillText("Grand Total", xFlat, y + 8);
  ctx.fillText(String(data.totalMinutes), xMin, y + 8);
  ctx.fillText(String(data.totalWaterCost), xWater, y + 8);
  ctx.fillText(String(data.totalMaintenance), xMaint, y + 8);
  ctx.fillText(String(data.grandTotal), xTotal, y + 8);

  ctx.fillStyle = "#5a6978";
  ctx.font = "500 19px Georgia";
  ctx.fillText(`Final Payment Date: ${data.finalPaymentDate}`, left, y + 70);
  ctx.fillText(`Pay To: ${data.payTo}`, left + 560, y + 70);
  ctx.fillText("Generated from Monthly Apartment Bill Web V2", left, y + 108);

  const link = document.createElement("a");
  link.download = `water-bill-${data.monthLabel.replace(/\s+/g, "-").toLowerCase()}-v2.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};
