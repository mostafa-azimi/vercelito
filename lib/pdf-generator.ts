import { jsPDF } from "jspdf"

// Function to create a PDF with support for different paper sizes and orientations
export const createBarcodePDF = async (
  barcodeImages: { dataUrl: string; filename: string; sku?: string; data?: string }[],
  jobName: string,
  paperSize: "thermal" | "letter" = "thermal",
  orientation: "portrait" | "landscape" = "portrait",
  labelSize = "4x4",
): Promise<string> => {
  // Define paper dimensions in mm
  const paperSizes = {
    thermal: {
      "2x1": [50.8, 25.4],
      "4x2": [101.6, 50.8],
      "4x4": [101.6, 101.6],
      "4x6": [101.6, 152.4],
      "6x4": [152.4, 101.6],
      "8.5x11": [215.9, 279.4], // Added 8.5x11 dimensions
    },
    letter: [215.9, 279.4], // 8.5" x 11" in mm
  }

  let pageWidth: number, pageHeight: number, pdfOrientation: "portrait" | "landscape"

  if (paperSize === "thermal") {
    // For thermal labels, use the specific label size
    const labelDimensions = paperSizes.thermal[labelSize as keyof typeof paperSizes.thermal] || [101.6, 152.4]

    if (orientation === "landscape") {
      pageWidth = Math.max(labelDimensions[0], labelDimensions[1])
      pageHeight = Math.min(labelDimensions[0], labelDimensions[1])
      pdfOrientation = "landscape"
    } else {
      pageWidth = Math.min(labelDimensions[0], labelDimensions[1])
      pageHeight = Math.max(labelDimensions[0], labelDimensions[1])
      pdfOrientation = "portrait"
    }
  } else {
    // For 8.5x11 paper
    if (orientation === "landscape") {
      pageWidth = paperSizes.letter[1] // 11"
      pageHeight = paperSizes.letter[0] // 8.5"
      pdfOrientation = "landscape"
    } else {
      pageWidth = paperSizes.letter[0] // 8.5"
      pageHeight = paperSizes.letter[1] // 11"
      pdfOrientation = "portrait"
    }
  }

  // Create PDF with calculated dimensions
  const pdf = new jsPDF({
    orientation: pdfOrientation,
    unit: "mm",
    format: [pageWidth, pageHeight],
  })

  if (paperSize === "thermal") {
    // Thermal printing: One barcode per page
    return createThermalPDF(pdf, barcodeImages, pageWidth, pageHeight, labelSize)
  } else {
    // Letter paper: Multiple barcodes per page
    return createLetterPDF(pdf, barcodeImages, pageWidth, pageHeight, labelSize, jobName)
  }
}

// Function for thermal label printing (one per page)
const createThermalPDF = async (
  pdf: jsPDF,
  barcodeImages: { dataUrl: string; filename: string; sku?: string; data?: string }[],
  pageWidth: number,
  pageHeight: number,
  labelSize: string,
): Promise<string> => {
  // Determine if this is a small label format
  const isSmallLabel = labelSize === "2x1" || labelSize === "4x2"

  // Adjust margins and sizes based on label size
  const margin = isSmallLabel ? 2 : 3
  const usableWidth = pageWidth - margin * 2
  const usableHeight = pageHeight - margin * 2

  // Calculate barcode size to fit nicely on the label
  const barcodeSize = Math.min(usableWidth * (isSmallLabel ? 0.65 : 0.75), usableHeight * (isSmallLabel ? 0.5 : 0.6))

  // Adjust font sizes for small labels
  const skuFontSize = isSmallLabel ? 6 : 8
  const dataFontSize = isSmallLabel ? 5 : 8
  const pageNumFontSize = isSmallLabel ? 4 : 6
  const textSpacing = isSmallLabel ? 2 : 4

  for (let i = 0; i < barcodeImages.length; i++) {
    const barcode = barcodeImages[i]

    if (i > 0) {
      pdf.addPage()
    }

    try {
      // Center the barcode on the page
      const barcodeX = (pageWidth - barcodeSize) / 2
      const barcodeY = (pageHeight - barcodeSize) / 2 - (isSmallLabel ? 2 : 5) // Slightly higher to leave room for text

      // Add the barcode image
      pdf.addImage(barcode.dataUrl, "PNG", barcodeX, barcodeY, barcodeSize, barcodeSize)

      // Add text below barcode
      const textStartY = barcodeY + barcodeSize + (isSmallLabel ? 1 : 3)
      pdf.setFontSize(skuFontSize)
      pdf.setTextColor(0, 0, 0)

      if (barcode.sku) {
        const skuText = isSmallLabel && barcode.sku.length > 12 ? barcode.sku.substring(0, 12) + "..." : barcode.sku
        const skuWidth = pdf.getTextWidth(skuText)
        const skuX = (pageWidth - skuWidth) / 2
        pdf.text(skuText, skuX, textStartY)
      }

      if (barcode.data) {
        const maxDataLength = isSmallLabel ? 10 : 20
        const dataText =
          barcode.data.length > maxDataLength ? barcode.data.substring(0, maxDataLength) + "..." : barcode.data
        const dataWidth = pdf.getTextWidth(dataText)
        const dataX = (pageWidth - dataWidth) / 2
        const dataY = barcode.sku ? textStartY + textSpacing : textStartY

        pdf.setFontSize(dataFontSize)
        pdf.text(dataText, dataX, dataY)
      }

      // Page number at bottom (smaller for small labels)
      pdf.setFontSize(pageNumFontSize)
      pdf.setTextColor(128, 128, 128)
      const pageText = `${i + 1}/${barcodeImages.length}`
      const pageTextWidth = pdf.getTextWidth(pageText)
      pdf.text(pageText, (pageWidth - pageTextWidth) / 2, pageHeight - (isSmallLabel ? 1 : 2))
    } catch (error) {
      console.error(`Error adding barcode ${i} to thermal PDF:`, error)
    }
  }

  return pdf.output("datauristring")
}

// Function for letter paper printing (multiple per page)
const createLetterPDF = async (
  pdf: jsPDF,
  barcodeImages: { dataUrl: string; filename: string; sku?: string; data?: string }[],
  pageWidth: number,
  pageHeight: number,
  labelSize: string,
  jobName: string,
): Promise<string> => {
  // Calculate how many labels fit per page based on label size
  const labelDimensions = {
    "2x1": { width: 50.8, height: 25.4 },
    "4x2": { width: 101.6, height: 50.8 },
    "4x4": { width: 101.6, height: 101.6 },
    "4x6": { width: 101.6, height: 152.4 },
    "6x4": { width: 152.4, height: 101.6 },
    "8.5x11": { width: 215.9, height: 279.4 },
  }

  const label = labelDimensions[labelSize as keyof typeof labelDimensions] || labelDimensions["4x4"]
  const margin = 12.7 // 0.5 inch margin
  const spacing = 5 // 5mm spacing between labels

  const usableWidth = pageWidth - margin * 2
  const usableHeight = pageHeight - margin * 2 - 20 // Reserve space for header

  // Calculate grid
  const labelsPerRow = Math.floor((usableWidth + spacing) / (label.width + spacing))
  const labelsPerCol = Math.floor((usableHeight + spacing) / (label.height + spacing))
  const labelsPerPage = labelsPerRow * labelsPerCol

  console.log(`Letter paper layout: ${labelsPerRow} x ${labelsPerCol} = ${labelsPerPage} labels per page`)

  let currentPage = 0
  let labelsOnCurrentPage = 0

  // Add header to first page
  pdf.setFontSize(14)
  pdf.setTextColor(0, 0, 0)
  pdf.text(`Barcode Batch: ${jobName}`, margin, margin)
  pdf.setFontSize(10)
  pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 6)
  pdf.text(`Total: ${barcodeImages.length} barcodes`, margin, margin + 12)

  // Determine if this is a small label format
  const isSmallLabel = labelSize === "2x1" || labelSize === "4x2"
  const textFontSize = isSmallLabel ? 6 : 7

  for (let i = 0; i < barcodeImages.length; i++) {
    const barcode = barcodeImages[i]

    // Check if we need a new page
    if (labelsOnCurrentPage >= labelsPerPage) {
      pdf.addPage()
      currentPage++
      labelsOnCurrentPage = 0
    }

    // Calculate position
    const row = Math.floor(labelsOnCurrentPage / labelsPerRow)
    const col = labelsOnCurrentPage % labelsPerRow

    const x = margin + col * (label.width + spacing)
    const y = margin + 20 + row * (label.height + spacing) // +20 for header space

    try {
      // Scale barcode to fit label
      const barcodeSize = Math.min(label.width * 0.8, label.height * (isSmallLabel ? 0.5 : 0.6))
      const barcodeX = x + (label.width - barcodeSize) / 2
      const barcodeY = y + (label.height - barcodeSize) / 2 - (isSmallLabel ? 1 : 3)

      // Add barcode
      pdf.addImage(barcode.dataUrl, "PNG", barcodeX, barcodeY, barcodeSize, barcodeSize)

      // Add text below barcode
      pdf.setFontSize(textFontSize)
      const textY = barcodeY + barcodeSize + (isSmallLabel ? 1 : 2)

      if (barcode.sku) {
        const maxLength = isSmallLabel ? 8 : 12
        const skuText = barcode.sku.length > maxLength ? barcode.sku.substring(0, maxLength) : barcode.sku
        const textX = x + (label.width - pdf.getTextWidth(skuText)) / 2
        pdf.text(skuText, textX, textY)
      }

      if (barcode.data) {
        const maxLength = isSmallLabel ? 8 : 15
        const dataText = barcode.data.length > maxLength ? barcode.data.substring(0, maxLength) + "..." : barcode.data
        const textX = x + (label.width - pdf.getTextWidth(dataText)) / 2
        const dataY = barcode.sku ? textY + (isSmallLabel ? 2 : 3) : textY
        pdf.text(dataText, textX, dataY)
      }

      labelsOnCurrentPage++
    } catch (error) {
      console.error(`Error adding barcode ${i} to letter PDF:`, error)
    }
  }

  // Add page numbers
  const totalPages = currentPage + 1
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p)
    pdf.setFontSize(8)
    pdf.setTextColor(128, 128, 128)
    const pageText = `Page ${p} of ${totalPages}`
    const textWidth = pdf.getTextWidth(pageText)
    pdf.text(pageText, pageWidth - margin - textWidth, pageHeight - 5)
  }

  return pdf.output("datauristring")
}

// Function to download the PDF
export const downloadPDF = (pdfDataUrl: string, filename: string) => {
  const link = document.createElement("a")
  link.href = pdfDataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
