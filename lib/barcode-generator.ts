// Barcode generation utilities

// Code 128 character set and patterns
const CODE128_PATTERNS = {
  // Each pattern is 11 bits: 1=bar, 0=space
  0: "11011001100", // 0
  1: "11001101100", // 1
  2: "11001100110", // 2
  3: "10010011000", // 3
  4: "10010001100", // 4
  5: "10001001100", // 5
  6: "10011001000", // 6
  7: "10011000100", // 7
  8: "10001100100", // 8
  9: "11001001000", // 9
  10: "11001000100", // 10
  11: "11000100100", // 11
  12: "10110011100", // 12
  13: "10011011100", // 13
  14: "10011001110", // 14
  15: "10111001100", // 15
  16: "10011101100", // 16
  17: "10011100110", // 17
  18: "11001110010", // 18
  19: "11001011100", // 19
  20: "11001001110", // 20
  21: "11011100100", // 21
  22: "11001110100", // 22
  23: "11101101110", // 23
  24: "11101001100", // 24
  25: "11100101100", // 25
  26: "11100100110", // 26
  27: "11101100100", // 27
  28: "11100110100", // 28
  29: "11100110010", // 29
  30: "11011011000", // 30
  31: "11011000110", // 31
  32: "11000110110", // 32 (space)
  33: "10100011000", // 33 !
  34: "10001011000", // 34 "
  35: "10001000110", // 35 #
  36: "10110001000", // 36 $
  37: "10001101000", // 37 %
  38: "10001100010", // 38 &
  39: "11010001000", // 39 '
  40: "11000101000", // 40 (
  41: "11000100010", // 41 )
  42: "10110111000", // 42 *
  43: "10110001110", // 43 +
  44: "10001101110", // 44 ,
  45: "10111011000", // 45 -
  46: "10111000110", // 46 .
  47: "10001110110", // 47 /
  48: "11101110110", // 48 0
  49: "11010001110", // 49 1
  50: "11000101110", // 50 2
  51: "11011101000", // 51 3
  52: "11011100010", // 52 4
  53: "11011101110", // 53 5
  54: "11101011000", // 54 6
  55: "11101000110", // 55 7
  56: "11100010110", // 56 8
  57: "11101101000", // 57 9
  58: "11101100010", // 58 :
  59: "11100011010", // 59 ;
  60: "11101111010", // 60 <
  61: "11001000010", // 61 =
  62: "11110001010", // 62 >
  63: "10100110000", // 63 ?
  64: "10100001100", // 64 @
  65: "10010110000", // 65 A
  66: "10010000110", // 66 B
  67: "10000101100", // 67 C
  68: "10000100110", // 68 D
  69: "10110010000", // 69 E
  70: "10110000100", // 70 F
  71: "10011010000", // 71 G
  72: "10011000010", // 72 H
  73: "10000110100", // 73 I
  74: "10000110010", // 74 J
  75: "11000010010", // 75 K
  76: "11001010000", // 76 L
  77: "11110111010", // 77 M
  78: "11000010100", // 78 N
  79: "10001111010", // 79 O
  80: "10100111100", // 80 P
  81: "10010111100", // 81 Q
  82: "10010011110", // 82 R
  83: "10111100100", // 83 S
  84: "10011110100", // 84 T
  85: "10011110010", // 85 U
  86: "11110100100", // 86 V
  87: "11110010100", // 87 W
  88: "11110010010", // 88 X
  89: "11011011110", // 89 Y
  90: "11011110110", // 90 Z
  91: "11110110110", // 91 [
  92: "10101111000", // 92 \
  93: "10100011110", // 93 ]
  94: "10001011110", // 94 ^
  95: "10111101000", // 95 _
  96: "10111100010", // 96 `
  97: "11110101000", // 97 a
  98: "11110100010", // 98 b
  99: "10111011110", // 99 c
  100: "10111101110", // 100 d
  101: "11101011110", // 101 e
  102: "11110101110", // 102 f
  103: "11010000100", // 103 Start A
  104: "11010010000", // 104 Start B
  105: "11010011100", // 105 Start C
  106: "1100011101011", // 106 Stop
}

// Code 128 character mapping for Code Set B
const CODE128B_CHARS: { [key: string]: number } = {
  " ": 32,
  "!": 33,
  '"': 34,
  "#": 35,
  $: 36,
  "%": 37,
  "&": 38,
  "'": 39,
  "(": 40,
  ")": 41,
  "*": 42,
  "+": 43,
  ",": 44,
  "-": 45,
  ".": 46,
  "/": 47,
  "0": 48,
  "1": 49,
  "2": 50,
  "3": 51,
  "4": 52,
  "5": 53,
  "6": 54,
  "7": 55,
  "8": 56,
  "9": 57,
  ":": 58,
  ";": 59,
  "<": 60,
  "=": 61,
  ">": 62,
  "?": 63,
  "@": 64,
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,
  "[": 91,
  "\\": 92,
  "]": 93,
  "^": 94,
  _: 95,
  "`": 96,
  a: 97,
  b: 98,
  c: 99,
  d: 100,
  e: 101,
  f: 102,
  g: 103,
  h: 104,
  i: 105,
  j: 106,
  k: 107,
  l: 108,
  m: 109,
  n: 110,
  o: 111,
  p: 112,
  q: 113,
  r: 114,
  s: 115,
  t: 116,
  u: 117,
  v: 118,
  w: 119,
  x: 120,
  y: 121,
  z: 122,
  "{": 123,
  "|": 124,
  "}": 125,
  "~": 126,
}

export const generateQRCode = async (data: string, size = 200): Promise<string> => {
  // Using QR Server API for QR code generation
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png`

  try {
    const response = await fetch(qrUrl)
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error("Error generating QR code:", error)
    throw new Error("Failed to generate QR code. Please check your internet connection.")
  }
}

export const generateCode128 = async (data: string, width = 300, height = 100): Promise<string> => {
  // Validate input
  if (!data || data.length === 0) {
    throw new Error("Data cannot be empty for Code 128 barcode")
  }

  // Check if all characters are supported
  for (const char of data) {
    if (!(char in CODE128B_CHARS)) {
      throw new Error(`Character '${char}' is not supported in Code 128 Code Set B`)
    }
  }

  try {
    // Use JsBarcode library via CDN
    const jsBarcodeCDN = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"

    // Check if JsBarcode is already loaded
    if (!(window as any).JsBarcode) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script")
        script.src = jsBarcodeCDN
        script.onload = () => resolve()
        script.onerror = () => reject(new Error("Failed to load JsBarcode library"))
        document.head.appendChild(script)
      })
    }

    // Create SVG element
    const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svgElement.setAttribute("width", width.toString())
    svgElement.setAttribute("height", height.toString())

    // Generate barcode using JsBarcode
    ;(window as any).JsBarcode(svgElement, data, {
      format: "CODE128",
      width: 2,
      height: height - 20,
      displayValue: true,
      fontSize: 12,
      textMargin: 2,
      margin: 10,
      background: "#ffffff",
      lineColor: "#000000",
    })

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svgElement)
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`
  } catch (error) {
    console.error("Error generating Code 128:", error)

    // Fallback to our custom implementation if JsBarcode fails
    return generateCode128Fallback(data, width, height)
  }
}

// Fallback implementation if JsBarcode fails
const generateCode128Fallback = (data: string, width = 300, height = 100): string => {
  try {
    // Build the barcode pattern
    let pattern = ""
    let checksum = 104 // Start B value

    // Start pattern (Code Set B)
    pattern += CODE128_PATTERNS[104]

    // Add data characters
    for (let i = 0; i < data.length; i++) {
      const char = data[i]
      const value = CODE128B_CHARS[char]
      pattern += CODE128_PATTERNS[value]
      checksum += value * (i + 1) // Position weight starts at 1
    }

    // Add checksum character
    const checksumValue = checksum % 103
    pattern += CODE128_PATTERNS[checksumValue]

    // Add stop pattern
    pattern += CODE128_PATTERNS[106]

    // Calculate bar width
    const totalBars = pattern.length
    const barWidth = Math.max(1, Math.floor(width / totalBars))
    const actualWidth = barWidth * totalBars

    // Generate SVG
    const svg = `
      <svg width="${actualWidth}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        ${pattern
          .split("")
          .map((bit, index) =>
            bit === "1"
              ? `<rect x="${index * barWidth}" y="10" width="${barWidth}" height="${height - 30}" fill="black"/>`
              : "",
          )
          .join("")}
        <text x="50%" y="${height - 5}" text-anchor="middle" font-family="monospace" font-size="12">${data}</text>
      </svg>
    `

    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  } catch (error) {
    console.error("Error in fallback Code 128 generation:", error)
    throw new Error(`Failed to generate Code 128 barcode: ${error.message}`)
  }
}

export const createBarcodeWithText = async (
  data: string,
  codeType: "qr" | "code128",
  topText?: string,
  bottomText?: string,
  showData = true,
  labelSize = "4x4",
): Promise<string> => {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!

  // Set canvas size based on label size
  const sizes = {
    "2x1": { width: 200, height: 100 },
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

  // Calculate layout based on label size
  const isSmallLabel = labelSize === "2x1" || labelSize === "4x2"

  // Adjust font sizes and spacing based on label size
  const topTextFontSize = isSmallLabel ? 10 : 16
  const bottomTextFontSize = isSmallLabel ? 10 : 16
  const dataTextFontSize = isSmallLabel ? 8 : 12
  const padding = isSmallLabel ? 5 : 20
  const textSpacing = isSmallLabel ? 3 : 10

  // Calculate text heights
  const topTextHeight = topText ? topTextFontSize + textSpacing : 0
  const bottomTextHeight = bottomText ? bottomTextFontSize + textSpacing : 0
  const dataTextHeight = showData ? dataTextFontSize + textSpacing : 0

  // Start positioning from top with padding
  let currentY = padding

  // Draw top text if provided
  if (topText) {
    ctx.fillStyle = "black"
    ctx.font = `${isSmallLabel ? "" : "bold "}${topTextFontSize}px Arial`
    ctx.textAlign = "center"
    ctx.fillText(
      isSmallLabel && topText.length > 15 ? topText.substring(0, 15) + "..." : topText,
      width / 2,
      currentY + topTextFontSize,
    )
    currentY += topTextHeight
  }

  // Calculate barcode area
  const barcodeHeight = height - currentY - padding - bottomTextHeight - (showData ? dataTextHeight : 0)
  const barcodeWidth = width - padding * 2

  // Adjust barcode size for small labels
  const barcodeSizeMultiplier = isSmallLabel ? 0.8 : 1
  const adjustedBarcodeHeight = barcodeHeight * barcodeSizeMultiplier
  const adjustedBarcodeWidth = barcodeWidth * barcodeSizeMultiplier

  // Generate and draw barcode
  let barcodeUrl: string
  try {
    if (codeType === "qr") {
      const qrSize = Math.min(adjustedBarcodeWidth, adjustedBarcodeHeight)
      barcodeUrl = await generateQRCode(data, qrSize)
    } else {
      barcodeUrl = await generateCode128(data, adjustedBarcodeWidth, adjustedBarcodeHeight)
    }
  } catch (error) {
    console.error("Barcode generation error:", error)
    throw error
  }

  // Draw barcode
  const img = new Image()
  img.crossOrigin = "anonymous"

  return new Promise((resolve, reject) => {
    img.onload = () => {
      try {
        if (codeType === "qr") {
          // For QR codes, keep them square
          const barcodeSize = Math.min(adjustedBarcodeWidth, adjustedBarcodeHeight)
          const barcodeX = (width - barcodeSize) / 2
          ctx.drawImage(img, barcodeX, currentY, barcodeSize, barcodeSize)
          currentY += barcodeSize + textSpacing
        } else {
          // For Code 128, use adjusted width
          const barcodeX = (width - adjustedBarcodeWidth) / 2
          ctx.drawImage(img, barcodeX, currentY, adjustedBarcodeWidth, adjustedBarcodeHeight)
          currentY += adjustedBarcodeHeight + textSpacing
        }

        // Draw barcode data text if enabled
        if (showData) {
          ctx.fillStyle = "black"
          ctx.font = `${dataTextFontSize}px monospace`
          ctx.textAlign = "center"

          // Truncate data text for small labels
          let displayData = data
          if (isSmallLabel && data.length > 12) {
            displayData = data.substring(0, 12) + "..."
          } else if (data.length > 30) {
            displayData = data.substring(0, 30) + "..."
          }

          ctx.fillText(displayData, width / 2, currentY + dataTextFontSize)
          currentY += dataTextHeight
        }

        // Draw bottom text if provided
        if (bottomText) {
          ctx.fillStyle = "black"
          ctx.font = `${isSmallLabel ? "" : "bold "}${bottomTextFontSize}px Arial`
          ctx.textAlign = "center"
          ctx.fillText(
            isSmallLabel && bottomText.length > 15 ? bottomText.substring(0, 15) + "..." : bottomText,
            width / 2,
            currentY + bottomTextFontSize,
          )
        }

        resolve(canvas.toDataURL("image/png"))
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error("Failed to load barcode image"))
    }

    img.src = barcodeUrl
  })
}

export const downloadImage = (dataUrl: string, filename: string) => {
  const link = document.createElement("a")
  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const downloadMultipleImages = async (images: { dataUrl: string; filename: string }[]) => {
  console.log(`Starting download of ${images.length} images...`)

  // For large batches, we need to be more careful about browser limits
  const batchSize = 5 // Download 5 at a time
  const delay = 200 // 200ms delay between downloads

  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize)

    // Download current batch
    const downloadPromises = batch.map((image, batchIndex) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          try {
            downloadImage(image.dataUrl, image.filename)
            console.log(`Downloaded: ${image.filename}`)
            resolve()
          } catch (error) {
            console.error(`Failed to download ${image.filename}:`, error)
            resolve() // Continue even if one fails
          }
        }, batchIndex * 50) // Stagger within batch
      })
    })

    await Promise.all(downloadPromises)

    // Delay between batches (except for the last batch)
    if (i + batchSize < images.length) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  console.log(`Completed download initiation for ${images.length} images`)
}
