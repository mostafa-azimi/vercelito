interface BarcodeData {
  barcode: string
  text_1: string
  text_2: string
  text_3: string
}

interface ValidationResult {
  isValid: boolean
  sanitized: string
  errors: string[]
  warnings: string[]
}

const validateAndSanitizeInput = (input: string, codeType: "qr" | "code128"): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []
  let sanitized = input

  // Basic validation
  if (!input || input.trim().length === 0) {
    errors.push("Input cannot be empty")
    return { isValid: false, sanitized: "", errors, warnings }
  }

  // Trim whitespace
  sanitized = input.trim()

  // Code 128 specific validation
  if (codeType === "code128") {
    // Check for unsupported characters (Code 128 supports ASCII 32-126)
    const unsupportedChars: string[] = []
    for (const char of sanitized) {
      const charCode = char.charCodeAt(0)
      if (charCode < 32 || charCode > 126) {
        unsupportedChars.push(char)
      }
    }

    if (unsupportedChars.length > 0) {
      errors.push(`Code 128 does not support these characters: ${unsupportedChars.join(", ")}`)
    }

    // Check for control characters that might cause issues
    if (/[\n\r\t]/.test(sanitized)) {
      warnings.push("Control characters (newlines, tabs) may not display properly in Code 128")
      // Remove control characters
      sanitized = sanitized.replace(/[\n\r\t]/g, " ")
    }

    // Length warning for Code 128
    if (sanitized.length > 80) {
      warnings.push("Very long barcodes may be difficult to scan")
    }
  }

  // QR Code specific validation
  if (codeType === "qr") {
    // QR codes are more flexible, but still have limits
    if (sanitized.length > 2000) {
      warnings.push("Very long QR codes may be difficult to scan")
    }

    // Check for potentially problematic characters
    if (sanitized.includes("\0")) {
      errors.push("Null characters are not allowed")
      sanitized = sanitized.replace(/\0/g, "")
    }
  }

  // General validations
  if (sanitized.length === 0) {
    errors.push("Input becomes empty after sanitization")
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
    warnings,
  }
}

const generateQRCode = async (data: string, size = 200): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!

      canvas.width = size
      canvas.height = size

      // Fill white background
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, size, size)

      // Create a simple QR code pattern (placeholder)
      ctx.fillStyle = "black"

      // Draw a simple pattern that represents a QR code
      const moduleSize = size / 25
      for (let i = 0; i < 25; i++) {
        for (let j = 0; j < 25; j++) {
          // Create a pseudo-random pattern based on data
          const hash = data.charCodeAt(0) + i * j
          if (hash % 3 === 0) {
            ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize)
          }
        }
      }

      // Add corner markers
      const markerSize = moduleSize * 7

      // Top-left marker
      ctx.fillRect(0, 0, markerSize, markerSize)
      ctx.fillStyle = "white"
      ctx.fillRect(moduleSize, moduleSize, markerSize - 2 * moduleSize, markerSize - 2 * moduleSize)
      ctx.fillStyle = "black"
      ctx.fillRect(2 * moduleSize, 2 * moduleSize, markerSize - 4 * moduleSize, markerSize - 4 * moduleSize)

      // Top-right marker
      ctx.fillStyle = "black"
      ctx.fillRect(size - markerSize, 0, markerSize, markerSize)
      ctx.fillStyle = "white"
      ctx.fillRect(size - markerSize + moduleSize, moduleSize, markerSize - 2 * moduleSize, markerSize - 2 * moduleSize)
      ctx.fillStyle = "black"
      ctx.fillRect(
        size - markerSize + 2 * moduleSize,
        2 * moduleSize,
        markerSize - 4 * moduleSize,
        markerSize - 4 * moduleSize,
      )

      // Bottom-left marker
      ctx.fillStyle = "black"
      ctx.fillRect(0, size - markerSize, markerSize, markerSize)
      ctx.fillStyle = "white"
      ctx.fillRect(moduleSize, size - markerSize + moduleSize, markerSize - 2 * moduleSize, markerSize - 2 * moduleSize)
      ctx.fillStyle = "black"
      ctx.fillRect(
        2 * moduleSize,
        size - markerSize + 2 * moduleSize,
        markerSize - 4 * moduleSize,
        markerSize - 4 * moduleSize,
      )

      resolve(canvas.toDataURL("image/png"))
    } catch (error: any) {
      reject(new Error(`Failed to generate QR code: ${error.message}`))
    }
  })
}

const generateCode128 = async (data: string, width = 300, height = 100, displayValue = false): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!

      canvas.width = width
      canvas.height = height

      // Fill white background
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, width, height)

      // Draw barcode bars
      ctx.fillStyle = "black"

      const barWidth = width / (data.length * 8 + 20) // Approximate bar width
      let currentX = 10 // Start with some margin

      // Start pattern
      for (let i = 0; i < 4; i++) {
        if (i % 2 === 0) {
          ctx.fillRect(currentX, 10, barWidth, height - 40)
        }
        currentX += barWidth
      }

      // Data bars (simplified pattern)
      for (let i = 0; i < data.length; i++) {
        const charCode = data.charCodeAt(i)
        const pattern = charCode % 8 // Simple pattern based on character

        for (let j = 0; j < 8; j++) {
          if ((pattern >> j) & 1) {
            ctx.fillRect(currentX, 10, barWidth, height - 40)
          }
          currentX += barWidth
        }
      }

      // End pattern
      for (let i = 0; i < 4; i++) {
        if (i % 2 === 0) {
          ctx.fillRect(currentX, 10, barWidth, height - 40)
        }
        currentX += barWidth
      }

      // Add text if requested
      if (displayValue) {
        ctx.fillStyle = "black"
        ctx.font = "12px Arial"
        ctx.textAlign = "center"
        ctx.fillText(data, width / 2, height - 5)
      }

      resolve(canvas.toDataURL("image/png"))
    } catch (error: any) {
      reject(new Error(`Failed to generate Code 128: ${error.message}`))
    }
  })
}

export async function generateBarcodeImage(data: BarcodeData): Promise<string> {
  try {
    // Use the new Code 128 generator
    const barcodeDataUrl = await generateCode128(data.barcode, 300, 100, true)

    // Add text to the barcode image
    return createBarcodeWithTextHelper(barcodeDataUrl, data.text_1, data.text_2, data.text_3)
  } catch (e: any) {
    console.log(e)
    throw new Error(`Error generating barcode: ${e.message}`)
  }
}

async function createBarcodeWithTextHelper(
  barcodeImage: string,
  text1: string,
  text2: string,
  text3: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height + 60 // Increased height for text

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Could not get 2D context from canvas"))
        return
      }

      // Fill white background
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw barcode
      ctx.drawImage(img, 0, 0)

      // Add text
      ctx.font = "14px Arial"
      ctx.fillStyle = "black"
      ctx.textAlign = "center"

      let textY = img.height + 15
      if (text1) {
        ctx.fillText(text1, img.width / 2, textY)
        textY += 15
      }
      if (text2) {
        ctx.fillText(text2, img.width / 2, textY)
        textY += 15
      }
      if (text3) {
        ctx.fillText(text3, img.width / 2, textY)
      }

      resolve(canvas.toDataURL("image/png"))
    }

    img.onerror = (error) => {
      reject(error)
    }

    img.src = barcodeImage
  })
}

// Standard barcode generation with text - this is the main export
export const createBarcodeWithText = async (
  data: string,
  codeType: "qr" | "code128",
  topText?: string,
  bottomText?: string,
  displayBarcodeData = true,
  labelSize = "4x6",
): Promise<string> => {
  // Validate and sanitize input
  const validation = validateAndSanitizeInput(data, codeType)
  if (!validation.isValid) {
    throw new Error(`Invalid barcode data: ${validation.errors.join(", ")}`)
  }

  const sanitizedData = validation.sanitized

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!

  // Set canvas size based on label size
  const sizes = {
    "2x1": { width: 200, height: 100 },
    "2x2": { width: 200, height: 200 },
    "3x1": { width: 300, height: 100 },
    "3x3": { width: 300, height: 300 },
    "4x1": { width: 400, height: 100 },
    "4x2": { width: 400, height: 200 },
    "4x4": { width: 400, height: 400 },
    "4x6": { width: 400, height: 600 },
    "6x4": { width: 600, height: 400 },
    "8.5x11": { width: 850, height: 1100 },
  }

  const { width, height } = sizes[labelSize as keyof typeof sizes] || sizes["4x6"]
  canvas.width = width
  canvas.height = height

  // Fill white background
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)

  // Generate barcode
  let barcodeDataUrl: string
  const barcodeSize = Math.min(width * 0.8, height * 0.6)

  if (codeType === "qr") {
    barcodeDataUrl = await generateQRCode(sanitizedData, barcodeSize)
  } else {
    barcodeDataUrl = await generateCode128(sanitizedData, barcodeSize, barcodeSize * 0.6, false)
  }

  // Load and draw barcode
  const barcodeImage = new Image()
  barcodeImage.crossOrigin = "anonymous"

  return new Promise((resolve, reject) => {
    barcodeImage.onload = () => {
      // Center the barcode
      const barcodeX = (width - barcodeSize) / 2
      const barcodeY = height * 0.2

      ctx.drawImage(barcodeImage, barcodeX, barcodeY, barcodeSize, barcodeSize * 0.6)

      // Add text
      ctx.fillStyle = "black"
      ctx.textAlign = "center"

      let currentY = barcodeY - 20

      // Top text
      if (topText) {
        ctx.font = "bold 16px Arial"
        ctx.fillText(topText, width / 2, currentY)
      }

      currentY = barcodeY + barcodeSize * 0.6 + 30

      // Barcode data text
      if (displayBarcodeData) {
        ctx.font = "14px Arial"
        ctx.fillText(sanitizedData, width / 2, currentY)
        currentY += 25
      }

      // Bottom text
      if (bottomText) {
        ctx.font = "12px Arial"
        ctx.fillText(bottomText, width / 2, currentY)
      }

      resolve(canvas.toDataURL("image/png"))
    }

    barcodeImage.onerror = () => reject(new Error("Failed to load barcode image"))
    barcodeImage.src = barcodeDataUrl
  })
}

// Custom layout function for designer
export const createBarcodeWithCustomLayout = async (
  data: string,
  codeType: "qr" | "code128",
  elements: any[],
  labelSize = "4x4",
): Promise<string> => {
  // Validate and sanitize input
  const validation = validateAndSanitizeInput(data, codeType)
  if (!validation.isValid) {
    throw new Error(`Invalid barcode data: ${validation.errors.join(", ")}`)
  }

  const sanitizedData = validation.sanitized

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!

  // Set canvas size based on label size
  const sizes = {
    "2x1": { width: 200, height: 100 },
    "2x2": { width: 200, height: 200 },
    "3x1": { width: 300, height: 100 },
    "3x3": { width: 300, height: 300 },
    "4x1": { width: 400, height: 100 },
    "4x2": { width: 400, height: 200 },
    "4x4": { width: 400, height: 400 },
    "4x6": { width: 400, height: 600 },
    "6x4": { width: 600, height: 400 },
    "8.5x11": { width: 850, height: 1100 },
  }

  const { width, height } = sizes[labelSize as keyof typeof sizes] || sizes["4x4"]
  canvas.width = width
  canvas.height = height

  // Fill white background
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)

  // Generate barcode first
  let barcodeDataUrl: string
  if (codeType === "qr") {
    barcodeDataUrl = await generateQRCode(sanitizedData, 200)
  } else {
    barcodeDataUrl = await generateCode128(sanitizedData, 300, 100, false)
  }

  // Draw elements based on custom layout
  for (const element of elements) {
    if (element.type === "barcode") {
      const barcodeImage = new Image()
      barcodeImage.crossOrigin = "anonymous"

      await new Promise<void>((resolve, reject) => {
        barcodeImage.onload = () => {
          ctx.drawImage(barcodeImage, element.x, element.y, element.width, element.height)
          resolve()
        }
        barcodeImage.onerror = () => reject(new Error("Failed to load barcode image"))
        barcodeImage.src = barcodeDataUrl
      })
    } else if (element.type === "text" || element.type === "data-text") {
      ctx.fillStyle = "black"
      ctx.font = `${element.fontWeight || "normal"} ${element.fontSize || 16}px Arial`
      ctx.textAlign = element.textAlign || "left"

      let textContent = ""
      if (element.type === "data-text") {
        textContent = sanitizedData
      } else {
        textContent = element.content || ""
        // Handle JSON variables for bulk uploads
        if (textContent.includes("{{") && textContent.includes("}}")) {
          // For preview purposes, show placeholder text
          textContent = textContent.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            return `[${varName}]`
          })
        }
      }

      ctx.fillText(textContent, element.x, element.y + (element.fontSize || 16))
    }
  }

  return canvas.toDataURL("image/png")
}

// Update the parseCSVData function to handle the new field names
export const parseCSVData = (csvContent: string): { isValid: boolean; data: any[]; errors: string[] } => {
  const errors: string[] = []

  try {
    const lines = csvContent
      .trim()
      .split("\n")
      .filter((line) => line.trim().length > 0)

    if (lines.length === 0) {
      return {
        isValid: false,
        data: [],
        errors: ["CSV file is empty"],
      }
    }

    if (lines.length < 2) {
      return {
        isValid: false,
        data: [],
        errors: ["CSV must have at least a header row and one data row"],
      }
    }

    const headers = lines[0]
      .toLowerCase()
      .split(",")
      .map((h) => h.trim().replace(/['"]/g, ""))

    // Validate required headers
    const hasDataColumn = headers.some((h) => h.includes("data"))
    if (!hasDataColumn) {
      errors.push("CSV must have a 'Data' column")
    }

    const csvItems = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(",").map((item) => item.trim().replace(/['"]/g, ""))
      const item: any = {}

      headers.forEach((header, index) => {
        const value = values[index] || ""
        if (header === "sku") item.sku = value
        else if (header === "data") item.data = value
        else if (header === "text_1" || header === "text1" || header === "text 1") item.text_1 = value
        else if (header === "text_2" || header === "text2" || header === "text 2") item.text_2 = value
        else if (header === "text_3" || header === "text3" || header === "text 3") item.text_3 = value
        else if (header === "quantity" || header === "qty") {
          const qty = Number.parseInt(value) || 1
          item.quantity = qty > 0 ? qty : 1
        }
      })

      // Only add items that have data
      if (item.data && item.data.trim()) {
        csvItems.push(item)
      } else {
        errors.push(`Row ${i + 1}: Missing or empty data field`)
      }
    }

    return {
      isValid: csvItems.length > 0,
      data: csvItems,
      errors,
    }
  } catch (error: any) {
    return {
      isValid: false,
      data: [],
      errors: [`CSV parsing error: ${error.message}`],
    }
  }
}

// Print functions
export const printBarcode = (dataUrl: string, title: string) => {
  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { margin: 0; padding: 20px; text-align: center; }
            img { max-width: 100%; height: auto; }
            @media print {
              body { margin: 0; padding: 0; }
              img { max-width: 100%; height: auto; }
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="${title}" />
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }
}

export const printMultipleBarcodes = (
  barcodeImages: { dataUrl: string; filename: string; sku: string; data: string }[],
) => {
  const printWindow = window.open("", "_blank")
  if (printWindow) {
    const imagesHtml = barcodeImages
      .map(
        (barcode) => `
        <div style="page-break-inside: avoid; margin-bottom: 20px; text-align: center;">
          <img src="${barcode.dataUrl}" alt="${barcode.filename}" style="max-width: 100%; height: auto;" />
          <div style="font-size: 12px; margin-top: 5px;">${barcode.sku} - ${barcode.data}</div>
        </div>
      `,
      )
      .join("")

    printWindow.document.write(`
      <html>
        <head>
          <title>Bulk Barcodes</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            @media print {
              body { margin: 0; padding: 10px; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <h2 style="text-align: center; margin-bottom: 30px;">Bulk Barcode Print</h2>
          ${imagesHtml}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }
}

// Export the inline functions
export { validateAndSanitizeInput, generateQRCode, generateCode128 }
