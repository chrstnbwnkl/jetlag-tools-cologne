import { Ruler, Circle, X, Layers } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { Measurement, MeasurementTool } from "@/types/measurements"
import { formatDistance, SNAP_DISTANCES } from "@/lib/utils"

interface MeasurementMenuProps {
  activeTool: MeasurementTool
  measurements: Measurement[]
  pendingDistance: number | null
  pendingRadius: number | null
  hasLocation: boolean
  onSelectTool: (tool: MeasurementTool) => void
  onRemoveMeasurement: (id: string) => void
  onClearAll: () => void
}

export function MeasurementMenu({
  activeTool,
  measurements,
  pendingDistance,
  pendingRadius,
  hasLocation,
  onSelectTool,
  onRemoveMeasurement,
  onClearAll,
}: MeasurementMenuProps) {
  return (
    <>
      {/* Active tool indicator */}
      {activeTool !== "none" && (
        <div className="fixed top-0 left-0 right-0 z-10" style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 24 }}>
          <div className="mx-auto max-w-md">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/5" style={{ padding: 20 }}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-500 tracking-wide">
                    {activeTool === "distance"
                      ? (pendingDistance !== null ? "Distance" : "Tap start point")
                      : (pendingRadius !== null ? "Radius" : "Tap center, drag to size")}
                  </p>
                  <p className="text-[28px] font-semibold text-gray-900 tracking-tight leading-tight">
                    {activeTool === "distance" && pendingDistance !== null && formatDistance(pendingDistance)}
                    {activeTool === "circle" && pendingRadius !== null && formatDistance(pendingRadius)}
                    {((activeTool === "distance" && pendingDistance === null) ||
                      (activeTool === "circle" && pendingRadius === null)) && "—"}
                  </p>
                  {activeTool === "circle" && pendingRadius === null && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Snaps near {SNAP_DISTANCES.map(d => formatDistance(d)).join(", ")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onSelectTool("none")}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu trigger button */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="fixed bottom-8 right-8 z-10 w-14 h-14 bg-white/90 backdrop-blur-xl rounded-full shadow-lg shadow-black/10 flex items-center justify-center hover:bg-white transition-colors">
            <Layers className="w-6 h-6 text-gray-700" />
          </button>
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-0 bg-white/95 backdrop-blur-xl"
          style={{ padding: 0 }}
        >
          <div style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 32 }}>
            {/* Handle indicator */}
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-9 h-1 bg-gray-300 rounded-full" />
            </div>

            <SheetHeader className="pb-5">
              <SheetTitle className="text-left text-lg font-semibold text-gray-900">
                Measure
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6">
              {/* Location status */}
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${hasLocation ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-[13px] text-gray-500">
                  {hasLocation ? "Location available" : "Waiting for location..."}
                </span>
              </div>

              {/* Tool buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onSelectTool(activeTool === "distance" ? "none" : "distance")}
                  className={`h-24 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                    activeTool === "distance"
                      ? "bg-[#FF3B30] text-white shadow-lg shadow-red-500/25"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Ruler className="w-7 h-7" strokeWidth={1.5} />
                  <span className="text-[15px] font-medium">Distance</span>
                </button>
                <button
                  onClick={() => onSelectTool(activeTool === "circle" ? "none" : "circle")}
                  className={`h-24 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                    activeTool === "circle"
                      ? "bg-[#007AFF] text-white shadow-lg shadow-blue-500/25"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Circle className="w-7 h-7" strokeWidth={1.5} />
                  <span className="text-[15px] font-medium">Circle</span>
                </button>
              </div>

              {/* Saved measurements */}
              {measurements.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wider">
                      Saved
                    </p>
                    <button
                      onClick={onClearAll}
                      className="text-[13px] text-red-500 font-medium hover:text-red-600 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {measurements.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              m.type === "distance" ? "bg-red-100" : "bg-blue-100"
                            }`}
                          >
                            {m.type === "distance" ? (
                              <Ruler className="w-4 h-4 text-[#FF3B30]" strokeWidth={2} />
                            ) : (
                              <Circle className="w-4 h-4 text-[#007AFF]" strokeWidth={2} />
                            )}
                          </div>
                          <div>
                            <p className="text-[15px] font-semibold text-gray-900">
                              {formatDistance(m.value)}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {m.type === "distance" ? "Distance" : "Radius"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => onRemoveMeasurement(m.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-gray-400 text-center pt-1">
                    Long press on map to delete
                  </p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
