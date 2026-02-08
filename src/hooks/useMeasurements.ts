import { useState, useCallback } from "react"
import type { MeasurementTool } from "@/types/measurements"

export function useMeasurements() {
  const [activeTool, setActiveTool] = useState<MeasurementTool>("none")
  const [pendingDistance, setPendingDistance] = useState<number | null>(null)
  const [pendingRadius, setPendingRadius] = useState<number | null>(null)

  const selectTool = useCallback((tool: MeasurementTool) => {
    setActiveTool(tool)
    setPendingDistance(null)
    setPendingRadius(null)
  }, [])

  const cancelTool = useCallback(() => {
    setActiveTool("none")
    setPendingDistance(null)
    setPendingRadius(null)
  }, [])

  return {
    activeTool,
    pendingDistance,
    pendingRadius,
    selectTool,
    cancelTool,
    setPendingDistance,
    setPendingRadius,
  }
}
