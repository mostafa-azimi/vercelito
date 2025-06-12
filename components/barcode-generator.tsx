"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, Zap, AlertCircle, Download, FileDown, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { isSupabaseConfigured, type BarcodeJob } from "@/lib/supabase"
import { createBarcodeWithText, downloadImage, printBarcode, printMultipleBarcodes } from "@/lib/barcode-generator"
import { downloadCSVTemplate } from "@/lib/csv-template"
import { createBarcodePDF, downloadPDF } from "@/lib/pdf-generator"

export default function BarcodeGenerator() {
  const [codeType, setCodeType] = useState<"qr" | "code128">("qr")
  const [labelSize, setLabelSize] = useState("4x4")
  const [singleSku, setSingleSku] = useState("")
  const [singleData, setSingleData] = useState("")
  const [singleTopText, setSingleTopText] = useState("")
  const [singleBottomText, setSingleBottomText] = useState("")
  const [displayBarcodeData, setDisplayBarcodeData] = useState(true)
  const [jobName, setJobName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [csvData, setCsvData] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [paperSize, setPaperSize] = useState<"thermal" | "letter">("thermal")
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const [printMode, setPrintMode] = useState<"download" | "print">("download")

  const labelSizes = [
    { value: "2x1", label: '2" x 1" (Small Labels)', thermal: [50.8, 25.4], letter: [50.8, 25.4] },
    { value: "4x2", label: '4" x 2" (Medium Labels)', thermal: [101.6, 50.8], letter: [101.6, 50.8] },
    { value: "4x4", label: '4" x 4" (Standard Labels)', thermal: [101.6, 101.6], letter: [101.6, 101.6] },
    { value: "4x6", label: '4" x 6" (Large Labels)', thermal: [101.6, 152.4], letter: [101.6, 152.4] },
    { value: "6x4", label: '6" x 4" (Wide Labels)', thermal: [152.4, 101.6], letter: [152.4, 101.6] },
    { value: "8.5x11", label: '8.5" x 11" (Full Page)', thermal: [215.9, 279.4], letter: [215.9, 279.4] },
  ]

  // LocalStorage Key
  const localStorageKey = "barcode-jobs"

  // Function to load jobs from localStorage
  const loadJobsFromLocalStorage = (): BarcodeJob[] => {
    try {
      const serializedJobs = localStorage.getItem(localStorageKey)
      if (serializedJobs === null) {
        return []
      }
      return JSON.parse(serializedJobs) as BarcodeJob[]
    } catch (error) {
      console.error("Failed to load jobs from localStorage:", error)
      return []
    }
  }

  // Function to save jobs to localStorage
  const saveJobsToLocalStorage = (jobs: BarcodeJob[]) => {
    try {
      const serializedJobs = JSON.stringify(jobs)
      localStorage.setItem(localStorageKey, serializedJobs)
    } catch (error) {
      console.error("Failed to save jobs to localStorage:", error)
    }
  }

  // Initialize jobs state from localStorage
  const [jobs, setJobs] = useState<BarcodeJob[]>(loadJobsFromLocalStorage())

  const generateSingleCode = async () => {
    if (!singleData) return

    setIsProcessing(true)
    try {
      // Generate the barcode image
      const barcodeDataUrl = await createBarcodeWithText(
        singleData,
        codeType,
        singleTopText || undefined,
        singleBottomText || undefined,
        displayBarcodeData,
        labelSize,
      )

      // Create filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const filename = `${codeType}-${singleSku || "barcode"}-${timestamp}.png`

      // Either download or print based on mode
      if (printMode === "download") {
        downloadImage(barcodeDataUrl, filename)
      } else {
        printBarcode(barcodeDataUrl, `${codeType.toUpperCase()} - ${singleSku || singleData}`)
      }

      // Create a new job object
      const newJob: BarcodeJob = {
        id: `local-${Date.now()}`, // Unique ID for localStorage
        job_name: `Single ${codeType.toUpperCase()} - ${singleSku || singleData}`,
        code_type: codeType,
        label_size: labelSize,
        total_codes: 1,
        processed_codes: 1,
        status: "completed",
        display_barcode_data: displayBarcodeData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Update jobs in localStorage
      setJobs((prevJobs) => {
        const updatedJobs = [newJob, ...prevJobs]
        saveJobsToLocalStorage(updatedJobs)
        return updatedJobs
      })

      // Clear form
      setSingleSku("")
      setSingleData("")
      setSingleTopText("")
      setSingleBottomText("")
    } catch (error) {
      console.error("Error generating code:", error)
      // Show user-friendly error message
      alert("Error generating barcode. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const processBulkUpload = async () => {
    if (!csvData.trim() || !jobName) {
      alert("Please provide both job name and CSV data")
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)

    try {
      const lines = csvData.trim().split("\n")
      if (lines.length < 2) {
        throw new Error("CSV must have at least a header row and one data row")
      }

      const headers = lines[0]
        .toLowerCase()
        .split(",")
        .map((h) => h.trim().replace(/['"]/g, "")) // Remove quotes

      console.log("Headers found:", headers)

      // Parse CSV with quantity support
      const csvItems = []
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue // Skip empty lines

        // Handle CSV parsing with potential commas in quoted fields
        const values = line.split(",").map((item) => item.trim().replace(/['"]/g, ""))
        const item: any = {}

        headers.forEach((header, index) => {
          const value = values[index] || ""
          if (header === "sku") item.sku = value
          else if (header === "data") item.data = value
          else if (header === "top_text" || header === "toptext" || header === "top text") item.top_text = value
          else if (header === "bottom_text" || header === "bottomtext" || header === "bottom text")
            item.bottom_text = value
          else if (header === "quantity" || header === "qty") {
            const qty = Number.parseInt(value) || 1
            item.quantity = qty > 0 ? qty : 1
          }
        })

        // Only add items that have data
        if (item.data && item.data.trim()) {
          csvItems.push(item)
        }
      }

      console.log("Parsed CSV items:", csvItems)

      if (csvItems.length === 0) {
        throw new Error("No valid data rows found in CSV. Make sure you have a 'Data' column with values.")
      }

      // Expand items based on quantity
      const expandedItems: any[] = []
      csvItems.forEach((csvItem) => {
        const quantity = csvItem.quantity || 1
        for (let i = 0; i < quantity; i++) {
          expandedItems.push({
            sku: csvItem.sku || `item-${expandedItems.length + 1}`,
            data: csvItem.data,
            top_text: csvItem.top_text,
            bottom_text: csvItem.bottom_text,
            copy_number: quantity > 1 ? i + 1 : undefined,
            total_copies: quantity > 1 ? quantity : undefined,
          })
        }
      })

      console.log(`Generating ${expandedItems.length} barcodes...`)

      // Generate all barcodes
      const barcodeImages: { dataUrl: string; filename: string; sku: string; data: string }[] = []
      const totalItems = expandedItems.length

      for (let i = 0; i < expandedItems.length; i++) {
        const item = expandedItems[i]

        try {
          console.log(`Generating barcode ${i + 1}/${totalItems} for:`, item.data)

          const barcodeDataUrl = await createBarcodeWithText(
            item.data,
            codeType,
            item.top_text || undefined,
            item.bottom_text || undefined,
            displayBarcodeData,
            labelSize,
          )

          const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0]
          let filename = `${codeType}-${item.sku}`

          // Add copy number if there are multiple copies
          if (item.copy_number && item.total_copies) {
            filename += `-copy-${item.copy_number}-of-${item.total_copies}`
          }

          filename += `-${timestamp}.png`

          barcodeImages.push({
            dataUrl: barcodeDataUrl,
            filename,
            sku: item.sku,
            data: item.data,
          })

          // Update progress
          const progress = Math.round(((i + 1) / totalItems) * 100)
          setProcessingProgress(progress)

          // Small delay to prevent browser freezing
          if (i % 5 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 10))
          }
        } catch (error) {
          console.error(`Error generating barcode for item ${i + 1}:`, error)
          // Continue with other items instead of failing completely
        }
      }

      console.log(`Generated ${barcodeImages.length} barcode images, creating PDF...`)

      // Create a single PDF with all barcodes
      if (barcodeImages.length > 0) {
        try {
          if (printMode === "download") {
            // Generate PDF with all barcodes
            const pdfDataUrl = await createBarcodePDF(barcodeImages, jobName, paperSize, orientation, labelSize)

            // Download the PDF
            const timestamp = new Date().toISOString().split("T")[0]
            const pdfFilename = `${codeType}-batch-${jobName.replace(/[^a-zA-Z0-9]/g, "-")}-${timestamp}.pdf`

            downloadPDF(pdfDataUrl, pdfFilename)
            console.log("PDF download initiated")
          } else {
            // Print all barcodes
            printMultipleBarcodes(barcodeImages)
            console.log("Print initiated")
          }
        } catch (pdfError) {
          console.error("Error creating PDF:", pdfError)
          alert(
            `Generated ${barcodeImages.length} barcodes but encountered an error creating the PDF. Please try again with fewer barcodes.`,
          )
        }
      } else {
        throw new Error("No barcodes were generated successfully")
      }

      // Create a new job object
      const newJob: BarcodeJob = {
        id: `local-${Date.now()}`, // Unique ID for localStorage
        job_name: jobName,
        code_type: codeType,
        label_size: labelSize,
        total_codes: expandedItems.length,
        processed_codes: expandedItems.length,
        status: "completed",
        display_barcode_data: displayBarcodeData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Update jobs in localStorage
      setJobs((prevJobs) => {
        const updatedJobs = [newJob, ...prevJobs]
        saveJobsToLocalStorage(updatedJobs)
        return updatedJobs
      })

      // Clear form
      setCsvData("")
      setJobName("")
    } catch (error) {
      console.error("Error processing bulk upload:", error)
      alert(
        `Error processing bulk upload: ${error.message || "Unknown error"}. Please check your CSV format and try again.`,
      )
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "text/csv") {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setCsvData(content)
      }
      reader.readAsText(file)
    }
  }

  const redownloadJob = async (job: BarcodeJob) => {
    try {
      setIsProcessing(true)

      // For single jobs, regenerate the barcode
      if (job.total_codes === 1) {
        // Extract data from job name for single items
        const barcodeDataUrl = await createBarcodeWithText(
          job.job_name.includes("Single") ? "Sample Data" : job.job_name,
          job.code_type,
          undefined,
          undefined,
          job.display_barcode_data,
          job.label_size,
        )

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
        const filename = `${job.code_type}-redownload-${timestamp}.png`

        if (printMode === "download") {
          downloadImage(barcodeDataUrl, filename)
        } else {
          printBarcode(barcodeDataUrl, `${job.code_type.toUpperCase()} - ${job.job_name}`)
        }
      } else {
        // For bulk jobs, show a message that we can't regenerate without original data
        alert(
          "Bulk job re-download requires the original CSV data. Please use the bulk upload feature again with your CSV file.",
        )
      }
    } catch (error) {
      console.error("Error re-downloading job:", error)
      alert("Error re-downloading job. Please try generating a new barcode.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f13a3a] overflow-hidden transition-all duration-200 ease-in-out">
      {/* Main Content */}
      <div className="h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 h-16 flex items-center">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-xl font-semibold text-gray-900">QR and Barcode Generator</h1>
          </div>
        </div>

        {/* Demo Mode Alert */}
        {!isSupabaseConfigured && (
          <div className="mx-6 mt-4 flex-shrink-0">
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Demo Mode:</strong> Supabase is not configured. The app is running in demo mode with simulated
                functionality.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 h-full">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
              {/* Main Form */}
              <div className="lg:col-span-3 h-full">
                <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
                  <Tabs defaultValue="single" className="w-full">
                    <div className="border-b border-gray-200 px-6 pt-4">
                      <div className="flex items-center justify-between">
                        <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100 p-1 rounded-lg">
                          <TabsTrigger
                            value="single"
                            className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Single
                          </TabsTrigger>
                          <TabsTrigger
                            value="bulk"
                            className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Bulk Upload
                          </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => setCodeType("qr")}
                            className={`px-3 py-1 text-sm font-medium rounded ${
                              codeType === "qr"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                          >
                            QR Code
                          </button>
                          <button
                            onClick={() => setCodeType("code128")}
                            className={`px-3 py-1 text-sm font-medium rounded ${
                              codeType === "code128"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                          >
                            Code 128
                          </button>
                        </div>
                      </div>
                    </div>

                    <TabsContent value="single" className="p-6 space-y-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="topText" className="text-sm font-medium text-gray-700">
                              Top Text (Optional)
                            </Label>
                            <Input
                              id="topText"
                              placeholder="e.g., Product Name"
                              value={singleTopText}
                              onChange={(e) => setSingleTopText(e.target.value)}
                              className="border-gray-300 focus:border-[#f13a3a] focus:ring-[#f13a3a]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="bottomText" className="text-sm font-medium text-gray-700">
                              Bottom Text (Optional)
                            </Label>
                            <Input
                              id="bottomText"
                              placeholder="e.g., Price, SKU"
                              value={singleBottomText}
                              onChange={(e) => setSingleBottomText(e.target.value)}
                              className="border-gray-300 focus:border-[#f13a3a] focus:ring-[#f13a3a]"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="data" className="text-sm font-medium text-gray-700">
                            {codeType === "qr" ? "QR Code" : "Barcode"} Data (Required)
                          </Label>
                          <Textarea
                            id="data"
                            placeholder={
                              codeType === "qr"
                                ? "Enter product code, SKU, or text to encode"
                                : "Enter numbers or text to encode in barcode"
                            }
                            value={singleData}
                            onChange={(e) => setSingleData(e.target.value)}
                            className="min-h-[100px] border-gray-300 focus:border-[#f13a3a] focus:ring-[#f13a3a] resize-none"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <Label htmlFor="displayData" className="text-sm font-medium text-gray-700">
                            Display {codeType === "qr" ? "QR Code" : "Barcode"} Data Text
                          </Label>
                          <Switch
                            id="displayData"
                            checked={displayBarcodeData}
                            onCheckedChange={setDisplayBarcodeData}
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <Label htmlFor="printMode" className="text-sm font-medium text-gray-700">
                            Output Mode
                          </Label>
                          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                            <button
                              onClick={() => setPrintMode("download")}
                              className={`px-3 py-1 text-sm font-medium rounded ${
                                printMode === "download"
                                  ? "bg-white text-gray-900 shadow-sm"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              Download
                            </button>
                            <button
                              onClick={() => setPrintMode("print")}
                              className={`px-3 py-1 text-sm font-medium rounded ${
                                printMode === "print"
                                  ? "bg-white text-gray-900 shadow-sm"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              Print
                            </button>
                          </div>
                        </div>

                        <Button
                          onClick={generateSingleCode}
                          disabled={!singleData || isProcessing}
                          className="w-full bg-[#f13a3a] hover:bg-[#d63031] text-white"
                        >
                          {isProcessing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                              Generating...
                            </>
                          ) : printMode === "download" ? (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Generate & Download {codeType === "qr" ? "QR Code" : "Barcode"}
                            </>
                          ) : (
                            <>
                              <Printer className="w-4 h-4 mr-2" />
                              Generate & Print {codeType === "qr" ? "QR Code" : "Barcode"}
                            </>
                          )}
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="bulk" className="p-6 space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium text-gray-900">
                            Bulk {codeType === "qr" ? "QR Code" : "Code 128"} Upload
                          </h3>
                          <Button
                            variant="outline"
                            onClick={() => downloadCSVTemplate(codeType)}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Download Template
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="jobName" className="text-sm font-medium text-gray-700">
                            Job Name
                          </Label>
                          <Input
                            id="jobName"
                            placeholder="Enter a name for this batch job"
                            value={jobName}
                            onChange={(e) => setJobName(e.target.value)}
                            className="border-gray-300 focus:border-[#f13a3a] focus:ring-[#f13a3a]"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <Label htmlFor="bulkDisplayData" className="text-sm font-medium text-gray-700">
                            Display {codeType === "qr" ? "QR Code" : "Barcode"} Data Text
                          </Label>
                          <Switch
                            id="bulkDisplayData"
                            checked={displayBarcodeData}
                            onCheckedChange={setDisplayBarcodeData}
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <Label htmlFor="bulkPrintMode" className="text-sm font-medium text-gray-700">
                            Output Mode
                          </Label>
                          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                            <button
                              onClick={() => setPrintMode("download")}
                              className={`px-3 py-1 text-sm font-medium rounded ${
                                printMode === "download"
                                  ? "bg-white text-gray-900 shadow-sm"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              Download
                            </button>
                            <button
                              onClick={() => setPrintMode("print")}
                              className={`px-3 py-1 text-sm font-medium rounded ${
                                printMode === "print"
                                  ? "bg-white text-gray-900 shadow-sm"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              Print
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Upload CSV File</Label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".csv"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <Button
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              className="mb-3 border-gray-300"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Choose CSV File
                            </Button>
                            <p className="text-sm text-gray-500">
                              CSV format: SKU, Data, Top_Text, Bottom_Text, Quantity
                            </p>
                          </div>
                        </div>

                        {csvData && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">CSV Preview</Label>
                            <Textarea
                              value={csvData}
                              onChange={(e) => setCsvData(e.target.value)}
                              className="min-h-[120px] border-gray-300 focus:border-[#f13a3a] focus:ring-[#f13a3a] font-mono text-sm"
                            />
                          </div>
                        )}

                        {isProcessing && processingProgress > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>Processing barcodes...</span>
                              <span>{processingProgress}%</span>
                            </div>
                            <Progress value={processingProgress} className="h-2" />
                          </div>
                        )}

                        <Button
                          onClick={processBulkUpload}
                          disabled={!csvData || !jobName || isProcessing}
                          className="w-full bg-[#f13a3a] hover:bg-[#d63031] text-white"
                        >
                          {isProcessing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                              Processing...
                            </>
                          ) : printMode === "download" ? (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Generate PDF with All Barcodes
                            </>
                          ) : (
                            <>
                              <Printer className="w-4 h-4 mr-2" />
                              Generate & Print All Barcodes
                            </>
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6 h-full flex flex-col">
                {/* Label Settings */}
                <div className="bg-white rounded-lg border border-gray-200 flex-shrink-0">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Label Settings</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Paper Type</Label>
                      <Select value={paperSize} onValueChange={(value: "thermal" | "letter") => setPaperSize(value)}>
                        <SelectTrigger className="border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="thermal">Thermal Labels</SelectItem>
                          <SelectItem value="letter">8.5" x 11" Paper</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Orientation</Label>
                      <Select
                        value={orientation}
                        onValueChange={(value: "portrait" | "landscape") => setOrientation(value)}
                      >
                        <SelectTrigger className="border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">Portrait</SelectItem>
                          <SelectItem value="landscape">Landscape</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Label Size</Label>
                      <Select value={labelSize} onValueChange={setLabelSize}>
                        <SelectTrigger className="border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {labelSizes.map((size) => (
                            <SelectItem key={size.value} value={size.value}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Recent Jobs */}
                <div className="bg-white rounded-lg border border-gray-200 flex-1 flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-sm font-medium text-gray-900">Recent Jobs</h3>
                  </div>
                  <div className="p-4 flex-1 overflow-auto">
                    {jobs.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-sm">No jobs yet</p>
                    ) : (
                      <div className="space-y-3">
                        {jobs.slice(0, 5).map((job) => (
                          <div key={job.id} className="p-3 bg-gray-50 rounded-lg flex-shrink-0">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm text-gray-900 truncate">{job.job_name}</h4>
                              <Badge variant={job.status === "completed" ? "default" : "secondary"} className="text-xs">
                                {job.status}
                              </Badge>
                            </div>
                            <div className="flex justify-between text-xs text-gray-600 mb-2">
                              <span>{job.code_type.toUpperCase()}</span>
                              <span>
                                {job.processed_codes}/{job.total_codes}
                              </span>
                            </div>
                            {job.status === "processing" && (
                              <Progress value={(job.processed_codes / job.total_codes) * 100} className="h-1 mb-2" />
                            )}
                            {job.status === "completed" && (
                              <div className="flex gap-2">
                                {job.total_codes === 1 ? (
                                  <Button
                                    onClick={() => redownloadJob(job)}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-xs"
                                    disabled={isProcessing}
                                  >
                                    {printMode === "download" ? (
                                      <>
                                        <Download className="w-3 h-3 mr-1" />
                                        Download
                                      </>
                                    ) : (
                                      <>
                                        <Printer className="w-3 h-3 mr-1" />
                                        Print
                                      </>
                                    )}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-xs"
                                    disabled
                                    title="Bulk jobs require original CSV data"
                                  >
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    CSV Required
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {jobs.length > 0 && (
                      <Button
                        onClick={() => {
                          if (confirm("Are you sure you want to clear all job history?")) {
                            setJobs([])
                            saveJobsToLocalStorage([])
                          }
                        }}
                        variant="outline"
                        className="w-full mt-4"
                        size="sm"
                      >
                        Clear History
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
