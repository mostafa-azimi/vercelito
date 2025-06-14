// CSV template generation utilities
export const generateCSVTemplate = (codeType: "qr" | "code128"): string => {
  const headers = "SKU,Data,Text_1,Text_2,Text_3,Quantity"

  const sampleData =
    codeType === "qr"
      ? [
          "PROD001,PROD001-2024,Wireless Headphones,$49.99,In Stock,10",
          "PROD002,PROD002-2024,Gaming Mouse,$29.99,Limited,25",
          "PROD003,PROD003-2024,Bluetooth Speaker,$79.99,New Arrival,5",
          "PROD004,PROD004-2024,USB Cable,$12.99,Best Seller,50",
          "PROD005,PROD005-2024,Phone Case,$19.99,On Sale,15",
        ]
      : [
          "INV001,123456789012,Electronics Item,Warehouse A,Section B,20",
          "INV002,234567890123,Office Supplies,Warehouse B,Section C,30",
          "INV003,345678901234,Home & Garden,Warehouse C,Section A,8",
          "INV004,456789012345,Sports Equipment,Warehouse A,Section D,12",
          "INV005,567890123456,Books & Media,Warehouse B,Section B,40",
        ]

  return [headers, ...sampleData].join("\n")
}

export const downloadCSVTemplate = (codeType: "qr" | "code128") => {
  const csvContent = generateCSVTemplate(codeType)
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")

  const timestamp = new Date().toISOString().split("T")[0] // YYYY-MM-DD format
  const filename = `${codeType}-barcode-template-${timestamp}.csv`

  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
