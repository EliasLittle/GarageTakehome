import { jsPDF } from "jspdf";
import { fetchCategoryAttributes } from "./api";
import {
  CONTENT_WIDTH,
  GARAGE_LOGO_URL,
  LABEL_WIDTH,
  LINE_HEIGHT,
  MARGIN,
  MAX_IMAGE_HEIGHT,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  SECTION_HEADER_SIZE,
  SECTION_SPACING,
} from "./constants";
import type { Listing } from "./types";
import { formatCurrency, formatDate, formatDeliveryMethod } from "./utils";

function loadImageAsDataUrl(
  url: string,
  format: "image/jpeg" | "image/png" = "image/jpeg"
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        if (format === "image/png") {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl =
          format === "image/png"
            ? canvas.toDataURL("image/png")
            : canvas.toDataURL("image/jpeg", 0.85);
        resolve({
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function getLabeledAttributes(
  listing: Listing,
  labelMap: Map<string, string>
): [string, string][] {
  const attrs = listing.ListingAttribute ?? [];
  const result: [string, string][] = [];

  for (const a of attrs) {
    const value = a.value;
    if (
      !value ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(value) ||
      /^pumper-engine$/.test(value)
    ) {
      continue;
    }

    const label = labelMap.get(a.categoryAttributeId) ?? "Attribute";
    const displayValue =
      value === "true" ? "Yes" : value === "false" ? "No" : value;
    result.push([label, displayValue]);
  }

  return result;
}

function drawHorizontalLine(
  doc: jsPDF,
  y: number,
  fromX = MARGIN,
  toX = PAGE_WIDTH - MARGIN
) {
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(fromX, y, toX, y);
}

export async function generateInvoicePdf(listing: Listing): Promise<void> {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  let y = MARGIN;

  const logoResult = await loadImageAsDataUrl(GARAGE_LOGO_URL, "image/png");
  if (logoResult) {
    const logoHeight = 12;
    const logoWidth = 50;
    doc.addImage(logoResult.dataUrl, "PNG", MARGIN, y, logoWidth, logoHeight);
    y += logoHeight + SECTION_SPACING;
  }
  drawHorizontalLine(doc, y);
  y += SECTION_SPACING + 4;

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", MARGIN, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  const listingNum = listing.secondaryId ?? listing.id.slice(0, 8);
  const headerMeta = `Listing #${listingNum} · ${formatDate(listing.updatedAt)}`;
  doc.text(headerMeta, PAGE_WIDTH - MARGIN - doc.getTextWidth(headerMeta), y);
  doc.setTextColor(0, 0, 0);
  y += LINE_HEIGHT + SECTION_SPACING + 2;
  drawHorizontalLine(doc, y);
  y += SECTION_SPACING;

  const categoryId = listing.categoryId ?? listing.category?.id;
  const attributeLabels = categoryId
    ? await fetchCategoryAttributes(categoryId)
    : new Map<string, string>();

  const imgWidth = 70;

  const itemDetailLines: [string, string][] = [
    ["Listing", listing.listingTitle],
    ["Category", listing.category?.name ?? ""],
    ["Brand", listing.itemBrand ?? ""],
    ["Year", listing.itemAge ? String(listing.itemAge) : ""],
    ["Delivery", formatDeliveryMethod(listing.deliveryMethod)],
    ["Location", listing.address?.state ?? ""],
  ];

  const visibleDetailCount = itemDetailLines.filter(
    ([, v]) => v != null && v !== ""
  ).length;
  const detailsBlockHeight = Math.max(
    visibleDetailCount * LINE_HEIGHT,
    35
  );
  const imgHeight = detailsBlockHeight;

  doc.setFontSize(SECTION_HEADER_SIZE);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("ITEM DETAILS", MARGIN, y);
  doc.setTextColor(0, 0, 0);
  y += LINE_HEIGHT + 2;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const itemDetailsStartY = y;
  for (const [label, value] of itemDetailLines) {
    if (value != null && value !== "") {
      doc.text(`${label}:`, MARGIN, y);
      doc.text(String(value), MARGIN + LABEL_WIDTH, y);
      y += LINE_HEIGHT;
    }
  }

  const firstImageUrl = listing.imageUrls?.[0];
  if (firstImageUrl) {
    const result = await loadImageAsDataUrl(firstImageUrl);
    if (result) {
      const aspectRatio = result.width / result.height;
      let displayHeight = Math.min(MAX_IMAGE_HEIGHT, imgHeight);
      let displayWidth = displayHeight * aspectRatio;
      if (displayWidth > imgWidth) {
        displayWidth = imgWidth;
        displayHeight = imgWidth / aspectRatio;
      }
      const imgX = PAGE_WIDTH - MARGIN - displayWidth;
      doc.addImage(
        result.dataUrl,
        "JPEG",
        imgX,
        itemDetailsStartY,
        displayWidth,
        displayHeight
      );
    }
  }

  y = itemDetailsStartY + detailsBlockHeight + SECTION_SPACING;
  drawHorizontalLine(doc, y);
  y += SECTION_SPACING;

  const addSection = (
    title: string,
    lines: [string, string][] | string[],
    isKeyValue: boolean,
    maxLines?: number
  ) => {
    doc.setFontSize(SECTION_HEADER_SIZE);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(title, MARGIN, y);
    doc.setTextColor(0, 0, 0);
    y += LINE_HEIGHT + 2;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    if (isKeyValue && Array.isArray(lines[0]) && typeof lines[0][0] === "string") {
      const kvLines = lines as [string, string][];
      for (const [label, value] of kvLines) {
        if (value != null && value !== "") {
          doc.text(`${label}:`, MARGIN, y);
          doc.text(String(value), MARGIN + LABEL_WIDTH, y);
          y += LINE_HEIGHT;
        }
      }
    } else {
      const textLines = doc.splitTextToSize(
        (lines as string[]).join(" "),
        CONTENT_WIDTH
      );
      const linesToShow = maxLines ? textLines.slice(0, maxLines) : textLines;
      doc.text(linesToShow, MARGIN, y);
      y += linesToShow.length * LINE_HEIGHT;
      if (maxLines && textLines.length > maxLines) {
        doc.setFont("helvetica", "italic");
        doc.text("…", MARGIN, y);
        y += LINE_HEIGHT;
        doc.setFont("helvetica", "normal");
      }
    }

    y += SECTION_SPACING;
    drawHorizontalLine(doc, y);
    y += SECTION_SPACING;
  };

  doc.setFontSize(SECTION_HEADER_SIZE);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("PRICING", MARGIN, y);
  doc.setTextColor(0, 0, 0);
  y += LINE_HEIGHT + 2;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Selling Price:", MARGIN, y);
  doc.text(formatCurrency(listing.sellingPrice), MARGIN + LABEL_WIDTH, y);
  y += LINE_HEIGHT + 2;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (listing.appraisedPrice != null) {
    doc.text("Appraised Price:", MARGIN, y);
    doc.text(formatCurrency(listing.appraisedPrice), MARGIN + LABEL_WIDTH, y);
    y += LINE_HEIGHT;
  }
  if (
    listing.estimatedPriceMin != null &&
    listing.estimatedPriceMax != null
  ) {
    doc.text("Est. Range:", MARGIN, y);
    doc.text(
      `${formatCurrency(listing.estimatedPriceMin)} - ${formatCurrency(listing.estimatedPriceMax)}`,
      MARGIN + LABEL_WIDTH,
      y
    );
    y += LINE_HEIGHT;
  }
  y += SECTION_SPACING;
  drawHorizontalLine(doc, y);
  y += SECTION_SPACING;

  const specLines: [string, string][] = [];
  if (
    listing.itemLength != null ||
    listing.itemWidth != null ||
    listing.itemHeight != null
  ) {
    const parts: string[] = [];
    if (listing.itemLength) parts.push(`${listing.itemLength}" L`);
    if (listing.itemWidth) parts.push(`${listing.itemWidth}" W`);
    if (listing.itemHeight) parts.push(`${listing.itemHeight}" H`);
    const dims = parts.join(" x ");
    specLines.push(["Dimensions", dims]);
  }
  if (listing.itemWeight != null) {
    specLines.push([
      "Weight",
      `${listing.itemWeight.toLocaleString()} lbs`,
    ]);
  }
  if (listing.vin) {
    specLines.push(["VIN", listing.vin]);
  }
  if (specLines.length > 0) {
    addSection("SPECIFICATIONS", specLines, true);
  }

  const labeledAttrs = getLabeledAttributes(listing, attributeLabels);
  if (labeledAttrs.length > 0) {
    const colGap = 12;
    const colWidth = (CONTENT_WIDTH - colGap) / 2;
    const leftX = MARGIN;
    const rightX = MARGIN + colWidth + colGap;

    doc.setFontSize(SECTION_HEADER_SIZE);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text("KEY ATTRIBUTES", MARGIN, y);
    doc.setTextColor(0, 0, 0);
    y += LINE_HEIGHT + 2;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const mid = Math.ceil(labeledAttrs.length / 2);
    const leftAttrs = labeledAttrs.slice(0, mid);
    const rightAttrs = labeledAttrs.slice(mid);
    const rowCount = Math.max(leftAttrs.length, rightAttrs.length);

    for (let i = 0; i < rowCount; i++) {
      const rowY = y + i * LINE_HEIGHT;
      if (leftAttrs[i]) {
        doc.text(`${leftAttrs[i][0]}:`, leftX, rowY);
        doc.text(leftAttrs[i][1], leftX + LABEL_WIDTH, rowY);
      }
      if (rightAttrs[i]) {
        doc.text(`${rightAttrs[i][0]}:`, rightX, rowY);
        doc.text(rightAttrs[i][1], rightX + LABEL_WIDTH, rowY);
      }
    }
    y += rowCount * LINE_HEIGHT + SECTION_SPACING;
    drawHorizontalLine(doc, y);
    y += SECTION_SPACING;
  }

  if (listing.listingDescription) {
    const descFontSize = 8;
    const descLineHeight = 3.5;

    doc.setFontSize(SECTION_HEADER_SIZE);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text("DESCRIPTION", MARGIN, y);
    doc.setTextColor(0, 0, 0);
    y += LINE_HEIGHT + 2;

    doc.setFontSize(descFontSize);
    doc.setFont("helvetica", "normal");
    const textLines = doc.splitTextToSize(listing.listingDescription, CONTENT_WIDTH);

    const endOfPage = PAGE_HEIGHT - MARGIN;
    for (const line of textLines) {
      if (y + descLineHeight > endOfPage) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN, y);
      y += descLineHeight;
    }
    y += SECTION_SPACING;
    drawHorizontalLine(doc, y);
    y += SECTION_SPACING;
  }

  y += 4;
  drawHorizontalLine(doc, y);
  y += SECTION_SPACING;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(`Listing ID: ${listing.id}`, MARGIN, y);

  const filename = `invoice-${listing.secondaryId ?? listing.id.slice(0, 8)}.pdf`;
  doc.save(filename);
}
