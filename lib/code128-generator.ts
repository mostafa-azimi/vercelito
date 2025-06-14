// Code 128 barcode generation utilities

export const generateCode128 = async (
  data: string,
  width = 300,
  height = 100,
  displayValue = false,
): Promise<string> => {
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
