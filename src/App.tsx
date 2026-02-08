import { Map } from "@/components/Map"
import { MeasurementMenu } from "@/components/MeasurementMenu"
import { useGeolocation } from "@/hooks/useGeolocation"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { useMeasurements } from "@/hooks/useMeasurements"

function App() {
  const { coordinates } = useGeolocation()
  const {
    view,
    measurements,
    updateView,
    addMeasurement,
    removeMeasurement,
    clearMeasurements,
  } = useLocalStorage()
  const {
    activeTool,
    pendingDistance,
    pendingRadius,
    selectTool,
    setPendingDistance,
    setPendingRadius,
  } = useMeasurements()

  return (
    <div className="w-full h-full relative">
      <Map
        initialView={view}
        measurements={measurements}
        userLocation={coordinates}
        activeTool={activeTool}
        onViewChange={updateView}
        onMeasurementAdd={addMeasurement}
        onMeasurementRemove={removeMeasurement}
        onPendingDistanceChange={setPendingDistance}
        onPendingRadiusChange={setPendingRadius}
      />
      <MeasurementMenu
        activeTool={activeTool}
        measurements={measurements}
        pendingDistance={pendingDistance}
        pendingRadius={pendingRadius}
        hasLocation={coordinates !== null}
        onSelectTool={selectTool}
        onRemoveMeasurement={removeMeasurement}
        onClearAll={clearMeasurements}
      />
    </div>
  )
}

export default App
