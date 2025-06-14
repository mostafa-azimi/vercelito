"use client"

import React from "react"

import { useState, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type LabelElement = {
  id: string
  type: "barcode" | "text" | "data-text"
  x: number
  y: number
  width: number
  height: number
  content?: string
  fontSize?: number
  fontWeight?: "normal" | "bold"
  textAlign?: "left" | "center" | "right"
}

interface LabelDesignerProps {
  labelSize: string
  codeType: "qr" | "code128"
  elements: LabelElement[]
  onElementsChange: (elements: LabelElement[]) => void
  text1?: string
  text2?: string
  text3?: string
  barcodeData?: string
}

type DragMode = "move" | "resize" | null
type ResizeHandle = "se" | "sw" | "ne" | "nw" | null

export function LabelDesigner({
  labelSize,
  codeType,
  elements,
  onElementsChange,
  text1,
  text2,
  text3,
  barcodeData,
}: LabelDesignerProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<DragMode>(null)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [snapLines, setSnapLines] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] })
  const canvasRef = useRef<HTMLDivElement>(null)

  // Add these new state variables after the existing useState declarations
  const [draggedField, setDraggedField] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Grid settings
  const gridSize = 10

  // Label dimensions in pixels (scaled for display) - ensure all values are valid numbers
  const labelDimensions = {
    "2x1": { width: 200, height: 100, scale: 0.6 },
    "2x2": { width: 200, height: 200, scale: 0.7 },
    "3x1": { width: 240, height: 80, scale: 0.7 },
    "3x3": { width: 240, height: 240, scale: 0.8 },
    "4x1": { width: 320, height: 80, scale: 0.8 },
    "4x2": { width: 300, height: 150, scale: 0.8 },
    "4x4": { width: 300, height: 300, scale: 1.0 },
    "4x6": { width: 300, height: 450, scale: 1.0 },
    "8.5x11": { width: 400, height: 520, scale: 1.2 },
  }

  // Get dimensions with fallback to prevent NaN
  const getDimensions = () => {
    const dims = labelDimensions[labelSize as keyof typeof labelDimensions]
    if (!dims) {
      return { width: 300, height: 300, scale: 1.0 }
    }
    return {
      width: Number.isFinite(dims.width) ? dims.width : 300,
      height: Number.isFinite(dims.height) ? dims.height : 300,
      scale: Number.isFinite(dims.scale) ? dims.scale : 1.0,
    }
  }

  const { width: canvasWidth, height: canvasHeight, scale } = getDimensions()

  // Snap to grid function
  const snapToGridValue = (value: number) => {
    if (!snapToGrid) return value
    return Math.round(value / gridSize) * gridSize
  }

  // Calculate snap lines for alignment
  const calculateSnapLines = (currentElement: LabelElement) => {
    const snapThreshold = 5
    const xLines: number[] = []
    const yLines: number[] = []

    // Add canvas center lines
    xLines.push(canvasWidth / 2) // Vertical center line
    yLines.push(canvasHeight / 2) // Horizontal center line

    elements.forEach((element) => {
      if (element.id === currentElement.id) return

      // Vertical snap lines (x positions)
      const elementLeft = element.x
      const elementRight = element.x + element.width
      const elementCenterX = element.x + element.width / 2

      // Check alignment with current element
      const currentLeft = currentElement.x
      const currentRight = currentElement.x + currentElement.width
      const currentCenterX = currentElement.x + currentElement.width / 2

      if (Math.abs(currentLeft - elementLeft) < snapThreshold) xLines.push(elementLeft)
      if (Math.abs(currentLeft - elementRight) < snapThreshold) xLines.push(elementRight)
      if (Math.abs(currentLeft - elementCenterX) < snapThreshold) xLines.push(elementCenterX)

      if (Math.abs(currentRight - elementLeft) < snapThreshold) xLines.push(elementLeft)
      if (Math.abs(currentRight - elementRight) < snapThreshold) xLines.push(elementRight)
      if (Math.abs(currentRight - elementCenterX) < snapThreshold) xLines.push(elementCenterX)

      if (Math.abs(currentCenterX - elementLeft) < snapThreshold) xLines.push(elementLeft)
      if (Math.abs(currentCenterX - elementRight) < snapThreshold) xLines.push(elementRight)
      if (Math.abs(currentCenterX - elementCenterX) < snapThreshold) xLines.push(elementCenterX)

      // Horizontal snap lines (y positions)
      const elementTop = element.y
      const elementBottom = element.y + element.height
      const elementCenterY = element.y + element.height / 2

      // Check alignment with current element
      const currentTop = currentElement.y
      const currentBottom = currentElement.y + currentElement.height
      const currentCenterY = currentElement.y + currentElement.height / 2

      if (Math.abs(currentTop - elementTop) < snapThreshold) yLines.push(elementTop)
      if (Math.abs(currentTop - elementBottom) < snapThreshold) yLines.push(elementBottom)
      if (Math.abs(currentTop - elementCenterY) < snapThreshold) yLines.push(elementCenterY)

      if (Math.abs(currentBottom - elementTop) < snapThreshold) yLines.push(elementTop)
      if (Math.abs(currentBottom - elementBottom) < snapThreshold) yLines.push(elementBottom)
      if (Math.abs(currentBottom - elementCenterY) < snapThreshold) yLines.push(elementCenterY)

      if (Math.abs(currentCenterY - elementTop) < snapThreshold) yLines.push(elementTop)
      if (Math.abs(currentCenterY - elementBottom) < snapThreshold) yLines.push(elementBottom)
      if (Math.abs(currentCenterY - elementCenterY) < snapThreshold) yLines.push(elementCenterY)
    })

    return { x: [...new Set(xLines)], y: [...new Set(yLines)] }
  }

  // Add these drag handler functions before the existing functions
  const handleFieldDragStart = (e: React.DragEvent, fieldType: string, content: string) => {
    setDraggedField(fieldType)
    e.dataTransfer.setData("text/plain", JSON.stringify({ fieldType, content }))
    e.dataTransfer.effectAllowed = "copy"
  }

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setIsDragOver(true)
  }

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDraggedField(null)

    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const dropX = e.clientX - rect.left
    const dropY = e.clientY - rect.top

    try {
      const dragData = JSON.parse(e.dataTransfer.getData("text/plain"))
      const { fieldType, content } = dragData

      let elementType: LabelElement["type"]
      let elementContent = content

      switch (fieldType) {
        case "barcode":
          elementType = "barcode"
          elementContent = barcodeData || "SAMPLE123"
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

      const newElement: LabelElement = {
        id: `${elementType}-${Date.now()}`,
        type: elementType,
        x: snapToGridValue(Math.max(0, Math.min(dropX - 50, canvasWidth - 100))),
        y: snapToGridValue(Math.max(0, Math.min(dropY - 15, canvasHeight - 30))),
        width: elementType === "barcode" ? Math.round(120 * scale) : Math.round(100 * scale),
        height: elementType === "barcode" ? Math.round(120 * scale) : Math.round(30 * scale),
        content: elementContent,
        fontSize: elementType === "barcode" ? undefined : Math.round(14 * scale),
        fontWeight: "normal",
        textAlign: "center",
      }

      onElementsChange([...elements, newElement])
    } catch (error) {
      console.error("Error parsing drag data:", error)
    }
  }

  const addElement = (type: LabelElement["type"]) => {
    const baseWidth = type === "barcode" ? 120 : 100
    const baseHeight = type === "barcode" ? 120 : 30
    const baseFontSize = type === "barcode" ? undefined : 14

    const newElement: LabelElement = {
      id: `${type}-${Date.now()}`,
      type,
      x: snapToGridValue(20),
      y: snapToGridValue(20),
      width: Math.round(baseWidth * scale),
      height: Math.round(baseHeight * scale),
      content: type === "text" ? "Sample Text" : type === "data-text" ? barcodeData || "Data" : "",
      fontSize: baseFontSize ? Math.round(baseFontSize * scale) : undefined,
      fontWeight: "normal",
      textAlign: "center",
    }
    onElementsChange([...elements, newElement])
  }

  const updateElement = (id: string, updates: Partial<LabelElement>) => {
    onElementsChange(elements.map((el) => (el.id === id ? { ...el, ...updates } : el)))
  }

  const deleteElement = (id: string) => {
    onElementsChange(elements.filter((el) => el.id !== id))
    setSelectedElement(null)
  }

  const getResizeHandle = (e: React.MouseEvent, element: LabelElement): ResizeHandle => {
    if (!canvasRef.current) return null

    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const handleSize = 8
    const elementRight = element.x + element.width
    const elementBottom = element.y + element.height

    // Check each corner
    if (
      mouseX >= elementRight - handleSize &&
      mouseX <= elementRight + handleSize &&
      mouseY >= elementBottom - handleSize &&
      mouseY <= elementBottom + handleSize
    ) {
      return "se" // Southeast
    }
    if (
      mouseX >= element.x - handleSize &&
      mouseX <= element.x + handleSize &&
      mouseY >= elementBottom - handleSize &&
      mouseY <= elementBottom + handleSize
    ) {
      return "sw" // Southwest
    }
    if (
      mouseX >= elementRight - handleSize &&
      mouseX <= elementRight + handleSize &&
      mouseY >= element.y - handleSize &&
      mouseY <= element.y + handleSize
    ) {
      return "ne" // Northeast
    }
    if (
      mouseX >= element.x - handleSize &&
      mouseX <= element.x + handleSize &&
      mouseY >= element.y - handleSize &&
      mouseY <= element.y + handleSize
    ) {
      return "nw" // Northwest
    }

    return null
  }

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault()
    setSelectedElement(elementId)

    const element = elements.find((el) => el.id === elementId)
    if (!element || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const handle = getResizeHandle(e, element)

    if (handle) {
      // Resize mode
      setDragMode("resize")
      setResizeHandle(handle)
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    } else {
      // Move mode
      setDragMode("move")
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - rect.left - element.x,
        y: e.clientY - rect.top - element.y,
      })
    }
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !selectedElement || !canvasRef.current) return

      const element = elements.find((el) => el.id === selectedElement)
      if (!element) return

      const rect = canvasRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      if (dragMode === "move") {
        let newX = mouseX - dragOffset.x
        let newY = mouseY - dragOffset.y

        // Apply grid snapping
        if (snapToGrid) {
          newX = snapToGridValue(newX)
          newY = snapToGridValue(newY)
        }

        // Constrain to canvas bounds
        newX = Math.max(0, Math.min(canvasWidth - element.width, newX))
        newY = Math.max(0, Math.min(canvasHeight - element.height, newY))

        // Calculate and show snap lines
        const tempElement = { ...element, x: newX, y: newY }
        const lines = calculateSnapLines(tempElement)
        setSnapLines(lines)

        updateElement(selectedElement, { x: newX, y: newY })
      } else if (dragMode === "resize" && resizeHandle) {
        let newWidth = element.width
        let newHeight = element.height
        let newX = element.x
        let newY = element.y

        switch (resizeHandle) {
          case "se": // Southeast - resize from bottom-right
            newWidth = Math.max(20, mouseX - element.x)
            newHeight = Math.max(20, mouseY - element.y)
            break
          case "sw": // Southwest - resize from bottom-left
            newWidth = Math.max(20, element.x + element.width - mouseX)
            newHeight = Math.max(20, mouseY - element.y)
            newX = Math.min(element.x, mouseX)
            break
          case "ne": // Northeast - resize from top-right
            newWidth = Math.max(20, mouseX - element.x)
            newHeight = Math.max(20, element.y + element.height - mouseY)
            newY = Math.min(element.y, mouseY)
            break
          case "nw": // Northwest - resize from top-left
            newWidth = Math.max(20, element.x + element.width - mouseX)
            newHeight = Math.max(20, element.y + element.height - mouseY)
            newX = Math.min(element.x, mouseX)
            newY = Math.min(element.y, mouseY)
            break
        }

        // Apply grid snapping to dimensions
        if (snapToGrid) {
          newWidth = snapToGridValue(newWidth)
          newHeight = snapToGridValue(newHeight)
          newX = snapToGridValue(newX)
          newY = snapToGridValue(newY)
        }

        // Constrain to canvas bounds
        newX = Math.max(0, newX)
        newY = Math.max(0, newY)
        newWidth = Math.min(newWidth, canvasWidth - newX)
        newHeight = Math.min(newHeight, canvasHeight - newY)

        updateElement(selectedElement, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        })
      }
    },
    [isDragging, selectedElement, dragOffset, dragMode, resizeHandle, canvasWidth, canvasHeight, snapToGrid, elements],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragMode(null)
    setResizeHandle(null)
    setSnapLines({ x: [], y: [] })
  }, [])

  // Add event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const resetLayout = () => {
    const barcodeWidth = Math.round(120 * scale)
    const barcodeHeight = Math.round(120 * scale)
    const textHeight = Math.round(25 * scale)
    const fontSize = Math.round(14 * scale)
    const smallFontSize = Math.round(12 * scale)

    const defaultElements: LabelElement[] = [
      {
        id: "barcode-default",
        type: "barcode",
        x: snapToGridValue(Math.max(0, (canvasWidth - barcodeWidth) / 2)),
        y: snapToGridValue(40),
        width: barcodeWidth,
        height: barcodeHeight,
        content: barcodeData || "SAMPLE123",
      },
    ]

    if (text1) {
      defaultElements.unshift({
        id: "text1-default",
        type: "text",
        x: snapToGridValue(20),
        y: snapToGridValue(10),
        width: Math.max(40, canvasWidth - 40),
        height: textHeight,
        content: text1,
        fontSize: fontSize,
        fontWeight: "bold",
        textAlign: "center",
      })
    }

    if (text2) {
      defaultElements.push({
        id: "text2-default",
        type: "text",
        x: snapToGridValue(20),
        y: snapToGridValue(Math.max(30, canvasHeight - 30)),
        width: Math.max(40, canvasWidth - 40),
        height: textHeight,
        content: text2,
        fontSize: smallFontSize,
        fontWeight: "normal",
        textAlign: "center",
      })
    }

    onElementsChange(defaultElements)
    setSelectedElement(null)
  }

  const selectedElementData = selectedElement ? elements.find((el) => el.id === selectedElement) : null

  // Generate grid lines
  const generateGridLines = () => {
    const lines = []

    // Vertical lines
    for (let x = 0; x <= canvasWidth; x += gridSize) {
      lines.push(
        <line key={`v-${x}`} x1={x} y1={0} x2={x} y2={canvasHeight} stroke="#e5e7eb" strokeWidth="0.5" opacity="0.5" />,
      )
    }

    // Horizontal lines
    for (let y = 0; y <= canvasWidth; y += gridSize) {
      lines.push(
        <line key={`h-${y}`} x1={0} y1={y} x2={canvasWidth} y2={y} stroke="#e5e7eb" strokeWidth="0.5" opacity="0.5" />,
      )
    }

    return lines
  }

  // Validate canvas dimensions before rendering
  if (!Number.isFinite(canvasWidth) || !Number.isFinite(canvasHeight) || canvasWidth <= 0 || canvasHeight <= 0) {
    return (
      <div className="space-y-4">
        <div className="p-4 text-center text-red-600 border border-red-200 rounded-lg">
          Error: Invalid label dimensions. Please select a valid label size.
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Canvas */}
      <div className="lg:col-span-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Label Preview ({labelSize}) - {canvasWidth}x{canvasHeight}px
          </Label>
          <div
            ref={canvasRef}
            className={`relative border-2 ${
              isDragOver ? "border-[#f13a3a] border-solid bg-red-50" : "border-gray-300 border-dashed"
            } bg-white mx-auto overflow-hidden transition-colors`}
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              cursor: isDragging ? "grabbing" : "default",
            }}
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
          >
            {/* Grid */}
            {showGrid && (
              <svg className="absolute inset-0 pointer-events-none" width={canvasWidth} height={canvasHeight}>
                {generateGridLines()}
              </svg>
            )}

            {/* Snap lines */}
            {(snapLines.x.length > 0 || snapLines.y.length > 0 || showGrid) && (
              <svg className="absolute inset-0 pointer-events-none" width={canvasWidth} height={canvasHeight}>
                {/* Center guide lines (always visible when grid is on) */}
                {showGrid && (
                  <>
                    <line
                      x1={canvasWidth / 2}
                      y1={0}
                      x2={canvasWidth / 2}
                      y2={canvasHeight}
                      stroke="#3b82f6"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                      opacity="0.3"
                    />
                    <line
                      x1={0}
                      y1={canvasHeight / 2}
                      x2={canvasWidth}
                      y2={canvasHeight / 2}
                      stroke="#3b82f6"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                      opacity="0.3"
                    />
                  </>
                )}

                {/* Active snap lines */}
                {snapLines.x.map((x, index) => (
                  <line
                    key={`snap-x-${index}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={canvasHeight}
                    stroke="#f13a3a"
                    strokeWidth="2"
                    strokeDasharray="2,2"
                  />
                ))}
                {snapLines.y.map((y, index) => (
                  <line
                    key={`snap-y-${index}`}
                    x1={0}
                    y1={y}
                    x2={canvasWidth}
                    y2={y}
                    stroke="#f13a3a"
                    strokeWidth="2"
                    strokeDasharray="2,2"
                  />
                ))}
              </svg>
            )}

            {/* Elements */}
            {elements.map((element) => {
              // Validate element dimensions
              const elementWidth = Number.isFinite(element.width) && element.width > 0 ? element.width : 100
              const elementHeight = Number.isFinite(element.height) && element.height > 0 ? element.height : 30
              const elementX = Number.isFinite(element.x) ? element.x : 0
              const elementY = Number.isFinite(element.y) ? element.y : 0

              return (
                <div
                  key={element.id}
                  className={`absolute select-none ${
                    selectedElement === element.id
                      ? "ring-2 ring-[#f13a3a] ring-opacity-50"
                      : "hover:ring-1 hover:ring-gray-400"
                  }`}
                  style={{
                    left: `${elementX}px`,
                    top: `${elementY}px`,
                    width: `${elementWidth}px`,
                    height: `${elementHeight}px`,
                    cursor: isDragging ? "grabbing" : "move",
                  }}
                  onMouseDown={(e) => handleMouseDown(e, element.id)}
                >
                  {element.type === "barcode" ? (
                    <div className="w-full h-full bg-gray-200 border-2 border-gray-400 flex items-center justify-center text-xs text-gray-600 font-mono">
                      {codeType === "qr" ? (
                        <div className="text-center">
                          <div className="text-lg">⊞</div>
                          <div>QR CODE</div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-lg">||||||||</div>
                          <div>CODE 128</div>
                        </div>
                      )}
                    </div>
                  ) : element.type === "data-text" ? (
                    <div
                      className="w-full h-full flex items-center justify-center text-gray-600 px-1 bg-blue-50 border border-blue-200"
                      style={{
                        fontSize: `${element.fontSize || 14}px`,
                        fontWeight: element.fontWeight || "normal",
                        textAlign: element.textAlign || "center",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {barcodeData || "BARCODE DATA"}
                    </div>
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-gray-800 px-1 bg-green-50 border border-green-200"
                      style={{
                        fontSize: `${element.fontSize || 14}px`,
                        fontWeight: element.fontWeight || "normal",
                        textAlign: element.textAlign || "center",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {element.content || "Text"}
                    </div>
                  )}

                  {/* Resize handles */}
                  {selectedElement === element.id && (
                    <>
                      {/* Corner handles */}
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-[#f13a3a] rounded-full cursor-nw-resize"></div>
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#f13a3a] rounded-full cursor-ne-resize"></div>
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#f13a3a] rounded-full cursor-sw-resize"></div>
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#f13a3a] rounded-full cursor-se-resize"></div>
                    </>
                  )}
                </div>
              )
            })}

            {elements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm text-center p-4">
                <div>
                  <div className="mb-2">📱 Drag the small icons next to the input fields above</div>
                  <div className="text-xs">Fill in the fields first, then drag the icons that appear</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Properties Panel */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-gray-700">Element Properties</Label>

          {selectedElementData ? (
            <div className="space-y-3 p-3 border border-gray-200 rounded-lg">
              <div className="text-sm font-medium text-gray-900 capitalize">
                {selectedElementData.type === "data-text"
                  ? "Data Display (shows barcode content)"
                  : selectedElementData.type === "barcode"
                    ? `${codeType.toUpperCase()} Code`
                    : "Custom Text"}
              </div>

              {selectedElementData.type !== "barcode" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Content</Label>
                    <Input
                      value={selectedElementData.content || ""}
                      onChange={(e) => updateElement(selectedElementData.id, { content: e.target.value })}
                      className="text-xs"
                      placeholder="Enter text..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Font Size</Label>
                      <Input
                        type="number"
                        value={selectedElementData.fontSize || 14}
                        onChange={(e) => {
                          const value = Number.parseInt(e.target.value)
                          if (Number.isFinite(value) && value > 0) {
                            updateElement(selectedElementData.id, { fontSize: value })
                          }
                        }}
                        className="text-xs"
                        min="8"
                        max="48"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Weight</Label>
                      <Select
                        value={selectedElementData.fontWeight || "normal"}
                        onValueChange={(value: "normal" | "bold") =>
                          updateElement(selectedElementData.id, { fontWeight: value })
                        }
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="bold">Bold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Alignment</Label>
                    <Select
                      value={selectedElementData.textAlign || "center"}
                      onValueChange={(value: "left" | "center" | "right") =>
                        updateElement(selectedElementData.id, { textAlign: value })
                      }
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Width</Label>
                  <Input
                    type="number"
                    value={selectedElementData.width}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value)
                      if (Number.isFinite(value) && value > 0) {
                        updateElement(selectedElementData.id, { width: value })
                      }
                    }}
                    className="text-xs"
                    min="20"
                    max={canvasWidth}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Height</Label>
                  <Input
                    type="number"
                    value={selectedElementData.height}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value)
                      if (Number.isFinite(value) && value > 0) {
                        updateElement(selectedElementData.id, { height: value })
                      }
                    }}
                    className="text-xs"
                    min="20"
                    max={canvasHeight}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">X Position</Label>
                  <Input
                    type="number"
                    value={selectedElementData.x}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value)
                      if (Number.isFinite(value) && value >= 0) {
                        updateElement(selectedElementData.id, {
                          x: Math.min(value, canvasWidth - selectedElementData.width),
                        })
                      }
                    }}
                    className="text-xs"
                    min="0"
                    max={canvasWidth - selectedElementData.width}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Y Position</Label>
                  <Input
                    type="number"
                    value={selectedElementData.y}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value)
                      if (Number.isFinite(value) && value >= 0) {
                        updateElement(selectedElementData.id, {
                          y: Math.min(value, canvasHeight - selectedElementData.height),
                        })
                      }
                    }}
                    className="text-xs"
                    min="0"
                    max={canvasHeight - selectedElementData.height}
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500 mt-2">Tip: Drag corners to resize, drag element to move</div>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm border border-gray-200 rounded-lg">
              Select an element to edit its properties
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-gray-700">Live Preview</Label>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-2 text-center">Actual Size Preview</div>
            <div
              className="mx-auto bg-white border border-gray-300 relative"
              style={{
                width: `${Math.min(200, canvasWidth * 0.8)}px`,
                height: `${Math.min(200, canvasHeight * 0.8)}px`,
                transform: `scale(${Math.min(1, 200 / Math.max(canvasWidth, canvasHeight))})`,
                transformOrigin: "top center",
              }}
            >
              {elements.map((element) => {
                const previewScale = Math.min(1, 200 / Math.max(canvasWidth, canvasHeight))
                return (
                  <div
                    key={`preview-${element.id}`}
                    className="absolute"
                    style={{
                      left: `${element.x * previewScale}px`,
                      top: `${element.y * previewScale}px`,
                      width: `${element.width * previewScale}px`,
                      height: `${element.height * previewScale}px`,
                    }}
                  >
                    {element.type === "barcode" ? (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-xs">
                        {codeType === "qr" ? "QR" : "|||"}
                      </div>
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-gray-800 text-xs"
                        style={{
                          fontSize: `${Math.max(8, (element.fontSize || 14) * previewScale)}px`,
                          fontWeight: element.fontWeight || "normal",
                          textAlign: element.textAlign || "center",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {element.type === "data-text" ? barcodeData || "DATA" : element.content || "TEXT"}
                      </div>
                    )}
                  </div>
                )
              })}
              {elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                  Empty Label
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
