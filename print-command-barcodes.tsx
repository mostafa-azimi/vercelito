"use client"

import { useState } from "react"
import { ChevronDown, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

export default function PrintCommandBarcodes() {
  const [selectedCommands, setSelectedCommands] = useState<string[]>([])

  const commands = [
    { id: "sh0001", name: "Print Invoice" },
    { id: "sh0002", name: "Print Label" },
    { id: "sh0003", name: "Print Label And Invoice" },
    { id: "sh0004", name: "Complete Order" },
    { id: "sh0005", name: "Get Weight" },
    { id: "sh0008", name: "Next Order" },
    { id: "sh0009", name: "Take ParcelView Snapshot" },
    { id: "sh0010", name: "Add New Package" },
    { id: "sh0011", name: "Ok/Confirm" },
    { id: "sh0012", name: "Add New Pallet" },
    { id: "sh0013", name: "Add New Inner Box" },
    { id: "sh0014", name: "Go Home" },
    { id: "sh0015", name: "Cancel" },
    { id: "sh0016", name: "Work Order Next Stage" },
    { id: "sh0017", name: "Toggle WFH and Shipping" },
    { id: "sh-hospital", name: "Send To Hospital" },
  ]

  const toggleCommand = (id: string) => {
    setSelectedCommands((prev) => (prev.includes(id) ? prev.filter((commandId) => commandId !== id) : [...prev, id]))
  }

  const selectAll = () => {
    if (selectedCommands.length === commands.length) {
      setSelectedCommands([])
    } else {
      setSelectedCommands(commands.map((command) => command.id))
    }
  }

  return (
    <div className="min-h-screen bg-[#f13a3a]">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-4xl font-bold text-white">Print Command Barcodes</h1>
          <div className="w-12 h-12">
            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" />
              <path d="M2 17L12 22L22 17" />
              <path d="M2 12L12 17L22 12" />
            </svg>
            <span className="text-white font-bold text-lg ml-2">ShipHero</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Card className="bg-white rounded-lg shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle>Select Commands</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#ffeeee] text-[#f13a3a] text-sm px-3 py-1 rounded-full">
                      {selectedCommands.length} of {commands.length} selected
                    </span>
                    <Button
                      variant="outline"
                      className="border-[#f13a3a] text-[#f13a3a] hover:bg-[#ffeeee] hover:text-[#f13a3a]"
                      onClick={selectAll}
                    >
                      Select All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {commands.map((command) => (
                    <div
                      key={command.id}
                      className="flex items-start gap-2 p-4 border border-gray-100 rounded-lg bg-[#fffafa]"
                    >
                      <Checkbox
                        id={command.id}
                        checked={selectedCommands.includes(command.id)}
                        onCheckedChange={() => toggleCommand(command.id)}
                        className="mt-1"
                      />
                      <div>
                        <label htmlFor={command.id} className="font-medium cursor-pointer">
                          {command.name}
                        </label>
                        <p className="text-sm text-gray-500">{command.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="bg-white rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle>Label Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="font-medium">Label Size</label>
                    <div className="relative mt-1">
                      <button
                        type="button"
                        className="flex items-center justify-between w-full p-3 text-left border rounded-md focus:outline-none focus:ring-2 focus:ring-[#f13a3a]"
                      >
                        <span className="text-gray-500">Select label size</span>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                  Generate PDF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p>Selected: {selectedCommands.length} commands</p>
                    <p>Pages: {selectedCommands.length > 0 ? selectedCommands.length : 0}</p>
                  </div>
                  <Button className="w-full bg-[#ff9999] hover:bg-[#ff7777] text-white">
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
