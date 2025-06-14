// QR Code generation utilities

export const generateQRCode = async (data: string, size = 200): Promise<string> => {
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
      // In a real implementation, you'd use a QR code library like qrcode
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
