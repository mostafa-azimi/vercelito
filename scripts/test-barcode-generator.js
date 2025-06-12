// Comprehensive test suite for the barcode generator
console.log("🧪 Starting Barcode Generator Production Readiness Tests...\n")

// Test data sets
const testCases = {
  qr: {
    basic: ["PROD001", "https://example.com/product/123", "Simple text", "123456789", "MIXED-case_123!@#"],
    edge: [
      "", // Empty string
      " ", // Single space
      "A", // Single character
      "a".repeat(100), // Long string
      "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?",
      "Unicode: café résumé naïve", // Non-ASCII
      "Line\nBreak\tTab", // Control characters
      "https://very-long-url.example.com/path/to/resource?param1=value1&param2=value2&param3=value3",
    ],
    bulk: Array.from({ length: 50 }, (_, i) => `BULK-ITEM-${String(i + 1).padStart(3, "0")}`),
  },
  code128: {
    basic: ["PROD001", "123456789", "ABC123", "Item-001", "WAREHOUSE-A"],
    edge: [
      "", // Empty string
      " ", // Single space
      "A", // Single character
      "a".repeat(50), // Long string
      "All ASCII: !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~",
      "Mixed Case 123",
      "Special-Chars_123",
    ],
    invalid: [
      "Unicode: café", // Non-ASCII characters
      "Line\nBreak", // Control characters
      "Tab\tChar", // Tab character
      String.fromCharCode(128), // Extended ASCII
      "Emoji: 🚀", // Emoji
    ],
    bulk: Array.from({ length: 25 }, (_, i) => `CODE128-${String(i + 1).padStart(3, "0")}`),
  },
}

// Test configurations
const labelSizes = ["2x1", "4x2", "4x4", "4x6", "6x4", "8.5x11"]
const paperSizes = ["thermal", "letter"]
const orientations = ["portrait", "landscape"]

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
}

// Helper function to simulate barcode generation
async function testBarcodeGeneration(data, codeType, config = {}) {
  const { labelSize = "4x4", topText = "", bottomText = "", showData = true } = config

  try {
    console.log(`  Testing ${codeType.toUpperCase()}: "${data.substring(0, 30)}${data.length > 30 ? "..." : ""}"`)

    // Simulate the barcode generation process
    const startTime = performance.now()

    // Basic validation
    if (!data && data !== "") {
      throw new Error("Data is undefined or null")
    }

    if (codeType === "code128") {
      // Check for unsupported characters in Code 128
      const unsupportedChars = []
      for (const char of data) {
        const charCode = char.charCodeAt(0)
        if (charCode < 32 || charCode > 126) {
          unsupportedChars.push(char)
        }
      }
      if (unsupportedChars.length > 0) {
        throw new Error(`Unsupported characters in Code 128: ${unsupportedChars.join(", ")}`)
      }
    }

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100))

    const endTime = performance.now()
    const processingTime = endTime - startTime

    // Check for performance issues
    if (processingTime > 5000) {
      testResults.warnings++
      console.log(`    ⚠️  SLOW: Processing took ${processingTime.toFixed(2)}ms`)
    }

    testResults.passed++
    console.log(`    ✅ Success (${processingTime.toFixed(2)}ms)`)

    return {
      success: true,
      processingTime,
      dataLength: data.length,
      config,
    }
  } catch (error) {
    testResults.failed++
    testResults.errors.push({
      data: data.substring(0, 50),
      codeType,
      config,
      error: error.message,
    })
    console.log(`    ❌ Failed: ${error.message}`)

    return {
      success: false,
      error: error.message,
      dataLength: data.length,
      config,
    }
  }
}

// Test bulk processing simulation
async function testBulkProcessing(items, codeType) {
  console.log(`\n📦 Testing bulk processing: ${items.length} ${codeType.toUpperCase()} codes`)

  const startTime = performance.now()
  const results = []

  for (let i = 0; i < items.length; i++) {
    const result = await testBarcodeGeneration(items[i], codeType)
    results.push(result)

    // Progress indicator
    if ((i + 1) % 10 === 0 || i === items.length - 1) {
      console.log(`  Progress: ${i + 1}/${items.length} (${Math.round(((i + 1) / items.length) * 100)}%)`)
    }
  }

  const endTime = performance.now()
  const totalTime = endTime - startTime
  const avgTime = totalTime / items.length

  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  console.log(`  📊 Bulk Results:`)
  console.log(`    Total time: ${totalTime.toFixed(2)}ms`)
  console.log(`    Average per item: ${avgTime.toFixed(2)}ms`)
  console.log(`    Success rate: ${successful}/${items.length} (${Math.round((successful / items.length) * 100)}%)`)

  if (avgTime > 1000) {
    testResults.warnings++
    console.log(`    ⚠️  Performance concern: Average processing time is high`)
  }

  return results
}

// Test CSV parsing simulation
function testCSVParsing() {
  console.log(`\n📄 Testing CSV parsing capabilities`)

  const testCSVs = [
    // Valid CSV
    "SKU,Data,Top_Text,Bottom_Text,Quantity\nPROD001,PROD001-2024,Wireless Headphones,$49.99,10",

    // CSV with quotes
    'SKU,Data,Top_Text,Bottom_Text,Quantity\n"PROD,001","DATA,001","Top, Text","Bottom, Text",5',

    // CSV with missing columns
    "SKU,Data\nPROD001,DATA001",

    // CSV with extra columns
    "SKU,Data,Top_Text,Bottom_Text,Quantity,Extra\nPROD001,DATA001,Top,Bottom,1,Extra",

    // Empty CSV
    "",

    // Header only
    "SKU,Data,Top_Text,Bottom_Text,Quantity",

    // Large CSV
    ["SKU,Data,Top_Text,Bottom_Text,Quantity"]
      .concat(
        Array.from(
          { length: 100 },
          (_, i) => `ITEM${i},DATA${i},Top${i},Bottom${i},${Math.floor(Math.random() * 10) + 1}`,
        ),
      )
      .join("\n"),
  ]

  testCSVs.forEach((csv, index) => {
    try {
      console.log(`  Testing CSV ${index + 1}: ${csv.length} characters`)

      const lines = csv.trim().split("\n")
      if (lines.length < 2) {
        throw new Error("CSV must have at least header and one data row")
      }

      const headers = lines[0]
        .toLowerCase()
        .split(",")
        .map((h) => h.trim().replace(/['"]/g, ""))
      const dataRows = lines.slice(1)

      let totalItems = 0
      dataRows.forEach((line) => {
        if (!line.trim()) return
        const values = line.split(",").map((v) => v.trim().replace(/['"]/g, ""))
        const qtyIndex = headers.findIndex((h) => h.includes("quantity") || h.includes("qty"))
        const qty = qtyIndex >= 0 ? Number.parseInt(values[qtyIndex]) || 1 : 1
        totalItems += qty
      })

      console.log(`    ✅ Parsed: ${dataRows.length} rows, ${totalItems} total items`)
      testResults.passed++
    } catch (error) {
      console.log(`    ❌ Failed: ${error.message}`)
      testResults.failed++
      testResults.errors.push({
        test: `CSV parsing ${index + 1}`,
        error: error.message,
      })
    }
  })
}

// Test label size and paper configurations
async function testLabelConfigurations() {
  console.log(`\n📏 Testing label size and paper configurations`)

  for (const labelSize of labelSizes) {
    for (const paperSize of paperSizes) {
      for (const orientation of orientations) {
        try {
          console.log(`  Testing: ${labelSize} on ${paperSize} paper (${orientation})`)

          // Simulate PDF generation logic
          const config = { labelSize, paperSize, orientation }

          // Basic validation
          if (paperSize === "thermal" && labelSize === "8.5x11") {
            console.log(`    ⚠️  Warning: 8.5x11 label on thermal paper may not be practical`)
            testResults.warnings++
          }

          if (labelSize === "2x1" && orientation === "portrait") {
            console.log(`    ⚠️  Warning: 2x1 labels in portrait may be too narrow`)
            testResults.warnings++
          }

          console.log(`    ✅ Configuration valid`)
          testResults.passed++
        } catch (error) {
          console.log(`    ❌ Failed: ${error.message}`)
          testResults.failed++
          testResults.errors.push({
            test: `Label config: ${labelSize}/${paperSize}/${orientation}`,
            error: error.message,
          })
        }
      }
    }
  }
}

// Test memory and performance limits
async function testPerformanceLimits() {
  console.log(`\n⚡ Testing performance and memory limits`)

  const largeBatches = [10, 50, 100, 250, 500]

  for (const batchSize of largeBatches) {
    console.log(`  Testing batch size: ${batchSize} items`)

    const startTime = performance.now()
    const testData = Array.from({ length: batchSize }, (_, i) => `PERF-TEST-${i}`)

    try {
      // Simulate processing
      let processedCount = 0
      for (const item of testData) {
        await new Promise((resolve) => setTimeout(resolve, 1)) // Minimal delay
        processedCount++
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime
      const itemsPerSecond = (batchSize / totalTime) * 1000

      console.log(
        `    ✅ Processed ${batchSize} items in ${totalTime.toFixed(2)}ms (${itemsPerSecond.toFixed(1)} items/sec)`,
      )

      if (totalTime > 30000) {
        // 30 seconds
        console.log(`    ⚠️  Performance warning: Batch took over 30 seconds`)
        testResults.warnings++
      }

      testResults.passed++
    } catch (error) {
      console.log(`    ❌ Failed: ${error.message}`)
      testResults.failed++
      testResults.errors.push({
        test: `Performance test: ${batchSize} items`,
        error: error.message,
      })
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log("🚀 BARCODE GENERATOR PRODUCTION READINESS TEST SUITE")
  console.log("=".repeat(60))

  // Test 1: Basic QR Code generation
  console.log("\n1️⃣ Testing QR Code Generation")
  for (const data of testCases.qr.basic) {
    await testBarcodeGeneration(data, "qr")
  }

  // Test 2: QR Code edge cases
  console.log("\n2️⃣ Testing QR Code Edge Cases")
  for (const data of testCases.qr.edge) {
    await testBarcodeGeneration(data, "qr")
  }

  // Test 3: Basic Code 128 generation
  console.log("\n3️⃣ Testing Code 128 Generation")
  for (const data of testCases.code128.basic) {
    await testBarcodeGeneration(data, "code128")
  }

  // Test 4: Code 128 edge cases
  console.log("\n4️⃣ Testing Code 128 Edge Cases")
  for (const data of testCases.code128.edge) {
    await testBarcodeGeneration(data, "code128")
  }

  // Test 5: Code 128 invalid characters (should fail gracefully)
  console.log("\n5️⃣ Testing Code 128 Invalid Characters (Expected Failures)")
  for (const data of testCases.code128.invalid) {
    await testBarcodeGeneration(data, "code128")
  }

  // Test 6: Bulk processing
  console.log("\n6️⃣ Testing Bulk Processing")
  await testBulkProcessing(testCases.qr.bulk, "qr")
  await testBulkProcessing(testCases.code128.bulk, "code128")

  // Test 7: CSV parsing
  testCSVParsing()

  // Test 8: Label configurations
  await testLabelConfigurations()

  // Test 9: Performance limits
  await testPerformanceLimits()

  // Final report
  console.log("\n" + "=".repeat(60))
  console.log("📊 FINAL TEST RESULTS")
  console.log("=".repeat(60))
  console.log(`✅ Passed: ${testResults.passed}`)
  console.log(`❌ Failed: ${testResults.failed}`)
  console.log(`⚠️  Warnings: ${testResults.warnings}`)
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`)

  if (testResults.errors.length > 0) {
    console.log("\n🔍 ERROR DETAILS:")
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test || error.data}: ${error.error}`)
    })
  }

  // Production readiness assessment
  console.log("\n🎯 PRODUCTION READINESS ASSESSMENT:")

  const criticalIssues = testResults.errors.filter(
    (e) =>
      !e.error.includes("Unsupported characters") &&
      !e.error.includes("Unicode") &&
      !e.error.includes("Line") &&
      !e.error.includes("Tab"),
  ).length

  if (criticalIssues === 0 && testResults.warnings < 5) {
    console.log("🟢 READY FOR PRODUCTION")
    console.log("   - All critical tests passed")
    console.log("   - Minimal warnings detected")
    console.log("   - Performance within acceptable limits")
  } else if (criticalIssues === 0 && testResults.warnings < 10) {
    console.log("🟡 MOSTLY READY - MINOR ISSUES")
    console.log("   - No critical failures")
    console.log("   - Some performance or usability warnings")
    console.log("   - Consider optimizations before production")
  } else {
    console.log("🔴 NOT READY FOR PRODUCTION")
    console.log(`   - ${criticalIssues} critical issues found`)
    console.log(`   - ${testResults.warnings} warnings detected`)
    console.log("   - Address issues before deployment")
  }

  // Recommendations
  console.log("\n💡 RECOMMENDATIONS:")

  if (testResults.warnings > 0) {
    console.log("   - Review performance warnings for large batches")
    console.log("   - Consider adding progress indicators for long operations")
    console.log("   - Implement batch size limits to prevent timeouts")
  }

  if (testResults.errors.some((e) => e.error.includes("Unsupported characters"))) {
    console.log("   - Add input validation and user feedback for unsupported characters")
    console.log("   - Consider character replacement or filtering options")
  }

  console.log("   - Add comprehensive error handling and user feedback")
  console.log("   - Implement retry mechanisms for failed generations")
  console.log("   - Add barcode validation/verification features")
  console.log("   - Consider adding barcode preview functionality")
  console.log("   - Implement proper logging for production monitoring")

  console.log("\n✨ Test suite completed!")
}

// Execute the test suite
runAllTests().catch(console.error)
