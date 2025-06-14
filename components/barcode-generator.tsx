"use client"

import type React from "react"

import type { ReactElement } from "react"

import { useState, useRef } from "react"
import { Upload, Zap, AlertCircle, FileDown, Printer, Palette } from "lucide-react"
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
import {
  createBarcodeWithText,
  createBarcodeWithCustomLayout,
  printBarcode,
  printMultipleBarcodes,
  validateAndSanitizeInput,
  parseCSVData,
} from "@/lib/barcode-generator"
import { downloadCSVTemplate } from "@/lib/csv-template"
import { LabelDesigner, type LabelElement } from "./label-designer"

export default function BarcodeGenerator(): ReactElement {
  const [codeType, setCodeType] = useState<"qr" | "code128">("qr")
  const [labelSize, setLabelSize] = useState("4x6")
  const [singleText1, setSingleText1] = useState("")
  const [singleData, setSingleData] = useState("")
  const [singleText2, setSingleText2] = useState("")
  const [singleText3, setSingleText3] = useState("")
  const [displayBarcodeData, setDisplayBarcodeData] = useState(true)
  const [jobName, setJobName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [csvData, setCsvData] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const [labelElements, setLabelElements] = useState<LabelElement[]>([])
  const [useCustomLayout, setUseCustomLayout] = useState(false)
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [savedTemplates, setSavedTemplates] = useState<
    Array<{
      id: string
      name: string
      labelSize: string
      codeType: "qr" | "code128"
      elements: LabelElement[]
      createdAt: string
    }>
  >([])
  const [templateName, setTemplateName] = useState("")
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none")
  const [selectedBulkTemplateId, setSelectedBulkTemplateId] = useState<string>("none")

  const labelSizes = [
    { value: "2x1", label: '2" x 1"', thermal: [50.8, 25.4], letter: [50.8, 25.4] },
    { value: "2x2", label: '2" x 2"', thermal: [50.8, 50.8], letter: [50.8, 50.8] },
    { value: "3x1", label: '3" x 1"', thermal: [76.2, 25.4], letter: [76.2, 25.4] },
    { value: "3x3", label: '3" x 3"', thermal: [76.2, 76.2], letter: [76.2, 76.2] },
    { value: "4x1", label: '4" x 1"', thermal: [101.6, 25.4], letter: [101.6, 25.4] },
    { value: "4x2", label: '4" x 2"', thermal: [101.6, 50.8], letter: [101.6, 50.8] },
    { value: "4x4", label: '4" x 4"', thermal: [101.6, 101.6], letter: [101.6, 101.6] },
    { value: "4x6", label: '4" x 6"', thermal: [101.6, 152.4], letter: [101.6, 152.4] },
    { value: "8.5x11", label: '8.5" x 11"', thermal: [215.9, 279.4], letter: [215.9, 279.4] },
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

  // Validate input data in real-time
  const validateSingleData = (data: string) => {
    if (!data) {
      setValidationWarnings([])
      return
    }

    const validation = validateAndSanitizeInput(data, codeType)
    setValidationWarnings(validation.errors)
  }

  // Handle data input changes with validation
  const handleDataChange = (value: string) => {
    setSingleData(value)
    validateSingleData(value)
  }

  const generateSingleCode = async () => {
    if (!singleData) return

    setIsProcessing(true)
    try {
      let barcodeDataUrl: string

      // Check if we should use a saved template or custom layout
      if (selectedTemplateId && selectedTemplateId !== "none") {
        const template = savedTemplates.find((t) => t.id === selectedTemplateId)
        if (template) {
          // Use the saved template layout
          barcodeDataUrl = await createBarcodeWithCustomLayout(
            singleData,
            template.codeType,
            template.elements,
            template.labelSize,
          )
        } else {
          // Fallback to standard template
          barcodeDataUrl = await createBarcodeWithText(
            singleData,
            codeType,
            singleText2 || undefined,
            singleText3 || undefined,
            displayBarcodeData,
            labelSize,
          )
        }
      } else if (useCustomLayout && labelElements.length > 0) {
        // Use custom layout from designer
        barcodeDataUrl = await createBarcodeWithCustomLayout(singleData, codeType, labelElements, labelSize)
      } else {
        // Use standard template
        barcodeDataUrl = await createBarcodeWithText(
          singleData,
          codeType,
          singleText2 || undefined,
          singleText3 || undefined,
          displayBarcodeData,
          labelSize,
        )
      }

      // Create filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const filename = `${codeType}-${singleText1 || "barcode"}-${timestamp}.png`

      // Either download or print based on mode
      printBarcode(barcodeDataUrl, `${codeType.toUpperCase()} - ${singleText1 || singleData}`)

      // Create a new job object
      const newJob: BarcodeJob = {
        id: `local-${Date.now()}`, // Unique ID for localStorage
        job_name: `Single ${codeType.toUpperCase()} - ${singleText1 || singleData}`,
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

      // Clear form and validation warnings
      setSingleText1("")
      setSingleData("")
      setSingleText2("")
      setSingleText3("")
      setValidationWarnings([])
    } catch (error) {
      console.error("Error generating code:", error)
      // Show user-friendly error message
      alert(`Error generating barcode: ${error.message}`)
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
      // Parse and validate CSV
      const csvParseResult = parseCSVData(csvData)

      if (!csvParseResult.isValid) {
        throw new Error(`CSV validation failed: ${csvParseResult.errors.join(", ")}`)
      }

      if (csvParseResult.errors.length > 0) {
        console.warn("CSV parsing warnings:", csvParseResult.errors)
      }

      const csvItems = csvParseResult.data

      console.log("Parsed CSV items:", csvItems)

      if (csvItems.length === 0) {
        throw new Error("No valid data rows found in CSV.")
      }

      // Expand items based on quantity
      const expandedItems: any[] = []
      csvItems.forEach((csvItem) => {
        const quantity = csvItem.quantity || 1
        for (let i = 0; i < quantity; i++) {
          expandedItems.push({
            sku: csvItem.sku || `item-${expandedItems.length + 1}`,
            data: csvItem.data,
            text_1: csvItem.text_1,
            text_2: csvItem.text_2,
            text_3: csvItem.text_3,
            copy_number: quantity > 1 ? i + 1 : undefined,
            total_copies: quantity > 1 ? quantity : undefined,
          })
        }
      })

      console.log(`Generating ${expandedItems.length} barcodes...`)

      // Generate all barcodes
      const barcodeImages: { dataUrl: string; filename: string; sku: string; data: string }[] = []
      const totalItems = expandedItems.length
      const errors: string[] = []

      for (let i = 0; i < expandedItems.length; i++) {
        const item = expandedItems[i]

        try {
          console.log(`Generating barcode ${i + 1}/${totalItems} for:`, item.data)

          let barcodeDataUrl: string

          // Check if we should use a saved template
          if (selectedBulkTemplateId && selectedBulkTemplateId !== "none") {
            const template = savedTemplates.find((t) => t.id === selectedBulkTemplateId)
            if (template) {
              // Use the saved template layout
              barcodeDataUrl = await createBarcodeWithCustomLayout(
                item.data,
                template.codeType,
                template.elements,
                template.labelSize,
              )
            } else {
              // Fallback to standard template
              barcodeDataUrl = await createBarcodeWithText(
                item.data,
                codeType,
                item.text_2 || undefined,
                item.text_3 || undefined,
                displayBarcodeData,
                labelSize,
              )
            }
          } else {
            // Use standard template
            barcodeDataUrl = await createBarcodeWithText(
              item.data,
              codeType,
              item.text_2 || undefined,
              item.text_3 || undefined,
              displayBarcodeData,
              labelSize,
            )
          }

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
          errors.push(`Item ${i + 1} (${item.data}): ${error.message}`)
          // Continue with other items instead of failing completely
        }
      }

      console.log(`Generated ${barcodeImages.length} barcode images, creating PDF...`)

      // Show errors if any
      if (errors.length > 0) {
        console.warn("Some barcodes failed to generate:", errors)
        alert(
          `Warning: ${errors.length} barcodes failed to generate. Check console for details. Continuing with ${barcodeImages.length} successful barcodes.`,
        )
      }

      // Create a single PDF with all barcodes
      if (barcodeImages.length > 0) {
        try {
          printMultipleBarcodes(barcodeImages)
          console.log("Print initiated")
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
        processed_codes: barcodeImages.length,
        status: barcodeImages.length === expandedItems.length ? "completed" : "completed",
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

        printBarcode(barcodeDataUrl, `${job.code_type.toUpperCase()} - ${job.job_name}`)
      } else {
        // For bulk jobs, show a message that we can't regenerate without original data
        alert(
          "Bulk job re-download requires the original CSV data. Please use the bulk upload feature again with your CSV file.",
        )
      }
    } catch (error) {
      console.error("Error re-downloading job:", error)
      alert(`Error re-downloading job: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Load templates from localStorage
  const loadTemplatesFromLocalStorage = () => {
    try {
      const templates = localStorage.getItem("barcode-templates")
      return templates ? JSON.parse(templates) : []
    } catch (error) {
      console.error("Failed to load templates:", error)
      return []
    }
  }

  // Save templates to localStorage
  const saveTemplatesToLocalStorage = (templates: any[]) => {
    try {
      localStorage.setItem("barcode-templates", JSON.stringify(templates))
    } catch (error) {
      console.error("Failed to save templates:", error)
    }
  }

  // Initialize templates
  useState(() => {
    setSavedTemplates(loadTemplatesFromLocalStorage())
  })

  // Save current design as template
  const saveAsTemplate = () => {
    if (!templateName.trim() || labelElements.length === 0) {
      alert("Please enter a template name and add elements to your design")
      return
    }

    const newTemplate = {
      id: `template-${Date.now()}`,
      name: templateName.trim(),
      labelSize,
      codeType,
      elements: labelElements,
      createdAt: new Date().toISOString(),
    }

    const updatedTemplates = [newTemplate, ...savedTemplates]
    setSavedTemplates(updatedTemplates)
    saveTemplatesToLocalStorage(updatedTemplates)

    setTemplateName("")
    setShowSaveTemplate(false)
    alert(`Template "${newTemplate.name}" saved successfully!`)
  }

  // Load template
  const loadTemplate = (template: any) => {
    setLabelSize(template.labelSize)
    setCodeType(template.codeType)
    setLabelElements(template.elements)
    alert(`Template "${template.name}" loaded successfully!`)
  }

  // Delete template
  const deleteTemplate = (templateId: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      const updatedTemplates = savedTemplates.filter((t) => t.id !== templateId)
      setSavedTemplates(updatedTemplates)
      saveTemplatesToLocalStorage(updatedTemplates)
    }
  }

  let elementType: "text" | "barcode" | null = null
  let elementContent = ""

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, fieldType: string, content: string) => {
    switch (fieldType) {
      case "barcode":
        elementType = "barcode"
        elementContent = singleData || "SAMPLE123"
        break
      case "text1":
        elementType = "text"
        elementContent = content || "Text 1"
        break
      case "text2":
        elementType = "text"
        elementContent = content || "Text 2"
        break
      case "text3":
        elementType = "text"
        elementContent = content || "Text 3"
        break
      case "jsonVar":
        elementType = "text"
        elementContent = content
        break
      default:
        return
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
                        <TabsList className="grid w-full max-w-lg grid-cols-3 bg-gray-100 p-1 rounded-lg">
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
                            Bulk
                          </TabsTrigger>
                          <TabsTrigger
                            value="designer"
                            className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                          >
                            <Palette className="w-4 h-4 mr-2" />
                            Designer
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
                              Text 2 (Optional)
                            </Label>
                            <Input
                              id="topText"
                              placeholder="e.g., Price, Category"
                              value={singleText2}
                              onChange={(e) => setSingleText2(e.target.value)}
                              className="border-gray-300 focus:border-[#f13a3a] focus:ring-[#f13a3a]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="bottomText" className="text-sm font-medium text-gray-700">
                              Text 3 (Optional)
                            </Label>
                            <Input
                              id="bottomText"
                              placeholder="e.g., Location, Status"
                              value={singleText3}
                              onChange={(e) => setSingleText3(e.target.value)}
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
                            onChange={(e) => handleDataChange(e.target.value)}
                            className="min-h-[100px] border-gray-300 focus:border-[#f13a3a] focus:ring-[#f13a3a] resize-none"
                          />

                          {/* Validation warnings */}
                          {validationWarnings.length > 0 && (
                            <div className="space-y-1">
                              {validationWarnings.map((warning, index) => (
                                <Alert key={index} className="bg-yellow-50 border-yellow-200">
                                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                                  <AlertDescription className="text-yellow-800 text-sm">
                                    <strong>Warning:</strong> {warning}
                                  </AlertDescription>
                                </Alert>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <Label htmlFor="displayData" className="text-sm font-medium text-gray-700">
                            Display {codeType === "qr" ? "QR Code" : "Barcode"} Data Text
                          </Label>
                          <Switch
                            id="displayData"
                            checked={displayBarcodeData}
                            onCheckedChange={setDisplayBarcodeData}
                            className="scale-50 data-[state=checked]:bg-[#f13a3a]"
                          />
                        </div>

                        {/* Add this new template selection section */}
                        {savedTemplates.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Use Saved Template (Optional)</Label>
                            <div className="flex gap-2">
                              <Select
                                value={selectedTemplateId}
                                onValueChange={(value) => {
                                  setSelectedTemplateId(value)
                                  if (value && value !== "none") {
                                    const template = savedTemplates.find((t) => t.id === value)
                                    if (template) {
                                      setLabelSize(template.labelSize)
                                      setCodeType(template.codeType)
                                      setUseCustomLayout(true)
                                      setLabelElements(template.elements)
                                    }
                                  } else {
                                    setUseCustomLayout(false)
                                    setLabelElements([])
                                  }
                                }}
                              >
                                <SelectTrigger className="flex-1 border-gray-300">
                                  <SelectValue placeholder="Choose a template..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No template (standard layout)</SelectItem>
                                  {savedTemplates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name} ({template.labelSize} • {template.codeType.toUpperCase()})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedTemplateId && selectedTemplateId !== "none" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTemplateId("none")
                                    setUseCustomLayout(false)
                                    setLabelElements([])
                                  }}
                                  className="px-3"
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                            {selectedTemplateId && selectedTemplateId !== "none" && (
                              <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                                ✓ Template applied - your barcode will use the custom layout from "
                                {savedTemplates.find((t) => t.id === selectedTemplateId)?.name}"
                              </div>
                            )}
                          </div>
                        )}

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
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-500 text-right">
                              <div>Download CSV template</div>
                              <div>with sample data format</div>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => downloadCSVTemplate(codeType)}
                              className="border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              <FileDown className="w-4 h-4 mr-2" />
                              CSV Template
                            </Button>
                          </div>
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
                            className="scale-50 data-[state=checked]:bg-[#f13a3a]"
                          />
                        </div>

                        {/* Add this new template selection section */}
                        {savedTemplates.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Use Saved Template (Optional)</Label>
                            <div className="flex gap-2">
                              <Select
                                value={selectedBulkTemplateId}
                                onValueChange={(value) => {
                                  setSelectedBulkTemplateId(value)
                                  if (value && value !== "none") {
                                    const template = savedTemplates.find((t) => t.id === value)
                                    if (template) {
                                      setLabelSize(template.labelSize)
                                      setCodeType(template.codeType)
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger className="flex-1 border-gray-300">
                                  <SelectValue placeholder="Choose a template..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No template (standard layout)</SelectItem>
                                  {savedTemplates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name} ({template.labelSize} • {template.codeType.toUpperCase()})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedBulkTemplateId && selectedBulkTemplateId !== "none" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedBulkTemplateId("none")}
                                  className="px-3"
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                            {selectedBulkTemplateId && selectedBulkTemplateId !== "none" && (
                              <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                                ✓ Template applied - all barcodes will use the custom layout from "
                                {savedTemplates.find((t) => t.id === selectedBulkTemplateId)?.name}"
                              </div>
                            )}
                          </div>
                        )}

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
                              CSV format: SKU, Data, Text_1, Text_2, Text_3, Quantity
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
                          ) : (
                            <>
                              <Printer className="w-4 h-4 mr-2" />
                              Generate & Print All Barcodes
                            </>
                          )}
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="designer" className="p-6 space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium text-gray-900">
                            Custom {codeType === "qr" ? "QR Code" : "Barcode"} Designer
                          </h3>
                        </div>

                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">📱 How to Design Your Label:</h4>
                          <ol className="text-xs text-gray-600 space-y-1">
                            <li>1. Fill in the text fields below</li>
                            <li>2. Drag the small icons next to filled fields into the preview area</li>
                            <li>3. Click and drag elements to reposition them</li>
                            <li>4. Drag corners to resize elements</li>
                            <li>5. Use the properties panel to fine-tune styling</li>
                          </ol>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium text-gray-700">Save Design as Template</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                                disabled={labelElements.length === 0}
                                className="text-xs"
                              >
                                {showSaveTemplate ? "Cancel" : "Save Template"}
                              </Button>
                            </div>

                            {showSaveTemplate && (
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Enter template name..."
                                  value={templateName}
                                  onChange={(e) => setTemplateName(e.target.value)}
                                  className="flex-1 text-sm"
                                />
                                <Button
                                  onClick={saveAsTemplate}
                                  size="sm"
                                  className="bg-[#f13a3a] hover:bg-[#d63031] text-white"
                                >
                                  Save
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-gray-700">Load Saved Template</Label>
                            {savedTemplates.length === 0 ? (
                              <p className="text-xs text-gray-500 italic">No saved templates yet</p>
                            ) : (
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {savedTemplates.slice(0, 5).map((template) => (
                                  <div
                                    key={template.id}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{template.name}</div>
                                      <div className="text-gray-500">
                                        {template.labelSize} • {template.codeType.toUpperCase()}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => loadTemplate(template)}
                                        className="text-xs px-2 py-1 h-6"
                                      >
                                        Load
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => deleteTemplate(template.id)}
                                        className="text-xs px-2 py-1 h-6 text-red-600 hover:text-red-700"
                                      >
                                        ×
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="designerSku" className="text-sm font-medium text-gray-700">
                              Text 1 (Optional)
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="designerSku"
                                placeholder="e.g., Product Name, SKU"
                                value={singleText1}
                                onChange={(e) => setSingleText1(e.target.value)}
                                className="border-gray-300 focus:border-[#f13a3a] focus:ring-[#f13a3a] flex-1"
                              />
                              {singleText1 && (
                                <div
                                  draggable
                                  onDragStart={(e) =>
                                    e.dataTransfer.setData(
                                      "text/plain",
                                      JSON.stringify({ fieldType: "text1", content: singleText1 }),
                                    )
                                  }
                                  className="w-8 h-8 bg-green-100 border border-green-300 rounded flex items-center justify-center cursor-move hover:bg-green-200 transition-colors"
                                  title="Drag to add to label"
                                >
                                  📝
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="designerData" className="text-sm font-medium text-gray-700">
                              {codeType === "qr" ? "QR Code" : "Barcode"} Data (Required)
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="designerData"
                                placeholder={
                                  codeType === "qr"
                                    ? "Enter product code, SKU, or text to encode"
                                    : "Enter numbers or text to encode in barcode"
                                }
                                value={singleData}
                                onChange={(e) => handleDataChange(e.target.value)}
                                className="border-gray-300 focus:border-[#f13a3a] focus:ring-[#f13a3a] flex-1"
                              />
                              {singleData && (
                                <div
                                  draggable
                                  onDragStart={(e) =>
                                    e.dataTransfer.setData(
                                      "text/plain",
                                      JSON.stringify({ fieldType: "barcode", content: singleData }),
                                    )
                                  }
                                  className="w-8 h-8 bg-blue-100 border border-blue-300 rounded flex items-center justify-center cursor-move hover:bg-blue-200 transition-colors"
                                  title="Drag to add barcode to label"
                                >
                                  {codeType === "qr" ? "📱" : "|||"}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="designerTopText" className="text-sm font-medium text-gray-700">
                              Text 2 (Optional)
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="designerTopText"
                                placeholder="e.g., Price, Category"
                                value={singleText2}
                                onChange={(e) => setSingleText2(e.target.value)}
                                className="border-gray-300 focus:border-[#f13a3a] focus:ring-[#f13a3a] flex-1"
                              />
                              {singleText2 && (
                                <div
                                  draggable
                                  onDragStart={(e) =>
                                    e.dataTransfer.setData(
                                      "text/plain",
                                      JSON.stringify({ fieldType: "text2", content: singleText2 }),
                                    )
                                  }
                                  className="w-8 h-8 bg-green-100 border border-green-300 rounded flex items-center justify-center cursor-move hover:bg-green-200 transition-colors"
                                  title="Drag to add to label"
                                >
                                  📝
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="designerBottomText" className="text-sm font-medium text-gray-700">
                              Text 3 (Optional)
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="designerBottomText"
                                placeholder="e.g., Location, Status"
                                value={singleText3}
                                onChange={(e) => setSingleText3(e.target.value)}
                                className="border-gray-300 focus:border-[#f13a3a] focus:ring-[#f13a3a] flex-1"
                              />
                              {singleText3 && (
                                <div
                                  draggable
                                  onDragStart={(e) =>
                                    e.dataTransfer.setData(
                                      "text/plain",
                                      JSON.stringify({ fieldType: "text3", content: singleText3 }),
                                    )
                                  }
                                  className="w-8 h-8 bg-green-100 border border-green-300 rounded flex items-center justify-center cursor-move hover:bg-green-200 transition-colors"
                                  title="Drag to add to label"
                                >
                                  📝
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Add after the existing draggable fields */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">JSON Variables (for bulk uploads)</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div
                              draggable
                              onDragStart={(e) =>
                                e.dataTransfer.setData(
                                  "text/plain",
                                  JSON.stringify({ fieldType: "jsonVar", content: "{{Text_1}}" }),
                                )
                              }
                              className="p-2 bg-purple-100 border border-purple-300 rounded flex items-center justify-center cursor-move hover:bg-purple-200 transition-colors text-xs"
                              title="Drag to add text_1 variable"
                            >
                              📋 {{ Text_1 }}
                            </div>
                            <div
                              draggable
                              onDragStart={(e) =>
                                e.dataTransfer.setData(
                                  "text/plain",
                                  JSON.stringify({ fieldType: "jsonVar", content: "{{Text_2}}" }),
                                )
                              }
                              className="p-2 bg-purple-100 border border-purple-300 rounded flex items-center justify-center cursor-move hover:bg-purple-200 transition-colors text-xs"
                              title="Drag to add text_2 variable"
                            >
                              📋 {{ Text_2 }}
                            </div>
                            <div
                              draggable
                              onDragStart={(e) =>
                                e.dataTransfer.setData(
                                  "text/plain",
                                  JSON.stringify({ fieldType: "jsonVar", content: "{{Text_3}}" }),
                                )
                              }
                              className="p-2 bg-purple-100 border border-purple-300 rounded flex items-center justify-center cursor-move hover:bg-purple-200 transition-colors text-xs"
                              title="Drag to add text_3 variable"
                            >
                              📋 {{ Text_3 }}
                            </div>
                            <div
                              draggable
                              onDragStart={(e) =>
                                e.dataTransfer.setData(
                                  "text/plain",
                                  JSON.stringify({ fieldType: "jsonVar", content: "{{Data}}" }),
                                )
                              }
                              className="p-2 bg-purple-100 border border-purple-300 rounded flex items-center justify-center cursor-move hover:bg-purple-200 transition-colors text-xs"
                              title="Drag to add data variable"
                            >
                              📋 {{ Data }}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            These variables will be replaced with actual CSV data during bulk generation
                          </div>
                        </div>

                        {/* Validation warnings */}
                        {validationWarnings.length > 0 && (
                          <div className="space-y-1">
                            {validationWarnings.map((warning, index) => (
                              <Alert key={index} className="bg-yellow-50 border-yellow-200">
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                <AlertDescription className="text-yellow-800 text-sm">
                                  <strong>Warning:</strong> {warning}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        )}

                        <LabelDesigner
                          labelSize={labelSize}
                          codeType={codeType}
                          elements={labelElements}
                          onElementsChange={setLabelElements}
                          text1={singleText1}
                          text2={singleText2}
                          text3={singleText3}
                          barcodeData={singleData}
                        />

                        <Button
                          onClick={generateSingleCode}
                          disabled={!singleData || isProcessing || (useCustomLayout && labelElements.length === 0)}
                          className="w-full bg-[#f13a3a] hover:bg-[#d63031] text-white"
                        >
                          {isProcessing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Printer className="w-4 h-4 mr-2" />
                              Generate & Print Design
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

                {/* Templates */}
                {savedTemplates.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 flex-shrink-0">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900">Saved Templates</h3>
                    </div>
                    <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
                      {savedTemplates.map((template) => (
                        <div key={template.id} className="p-2 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-xs text-gray-900 truncate">{template.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {template.codeType.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600 mb-2">
                            {template.labelSize} • {template.elements.length} elements
                          </div>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => loadTemplate(template)}
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-6"
                            >
                              Load
                            </Button>
                            <Button
                              onClick={() => deleteTemplate(template.id)}
                              variant="outline"
                              size="sm"
                              className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                                    <>
                                      <Printer className="w-3 h-3 mr-1" />
                                      Print
                                    </>
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
