// Input validation and sanitization utilities

export interface ValidationResult {
  isValid: boolean
  sanitized: string
  errors: string[]
  warnings: string[]
}

export const validateAndSanitizeInput = (input: string, codeType: "qr" | "code128"): ValidationResult => {
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

export const sanitizeCSVField = (field: string): string => {
  if (!field) return ""

  // Remove quotes and trim
  return field.trim().replace(/^["']|["']$/g, "")
}

export const validateCSVRow = (row: any, rowIndex: number): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Check required fields
  if (!row.data || row.data.trim().length === 0) {
    errors.push(`Row ${rowIndex}: Missing required 'data' field`)
  }

  // Validate quantity if present
  if (row.quantity !== undefined) {
    const qty = Number.parseInt(row.quantity)
    if (isNaN(qty) || qty < 1) {
      errors.push(`Row ${rowIndex}: Invalid quantity '${row.quantity}', must be a positive number`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
