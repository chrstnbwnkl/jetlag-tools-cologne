import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import * as turf from "@turf/turf"
import type { MapViewState, Measurement, MeasurementTool } from "@/types/measurements"
import { snapToNearest } from "@/lib/utils"

interface MapProps {
  initialView: MapViewState
  measurements: Measurement[]
  userLocation: { lat: number; lng: number } | null
  activeTool: MeasurementTool
  onViewChange: (view: MapViewState) => void
  onMeasurementAdd: (measurement: Measurement) => void
  onMeasurementRemove: (id: string) => void
  onPendingDistanceChange: (distance: number | null) => void
  onPendingRadiusChange: (radius: number | null) => void
}

const LONG_PRESS_DURATION = 500 // ms

export function Map({
  initialView,
  measurements,
  userLocation,
  activeTool,
  onViewChange,
  onMeasurementAdd,
  onMeasurementRemove,
  onPendingDistanceChange,
  onPendingRadiusChange,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const activeToolRef = useRef<MeasurementTool>("none")
  const distanceStartRef = useRef<[number, number] | null>(null)
  const circleCenterRef = useRef<[number, number] | null>(null)
  const mapLoadedRef = useRef(false)
  const measurementsRef = useRef<Measurement[]>(measurements)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTargetRef = useRef<string | null>(null)

  // Keep refs in sync
  activeToolRef.current = activeTool
  measurementsRef.current = measurements

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: initialView.center,
      zoom: initialView.zoom,
      attributionControl: false,
    })

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left")

    map.on("moveend", () => {
      const center = map.getCenter()
      onViewChange({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
      })
    })

    mapRef.current = map

    // Add sources for measurements after map loads
    map.on("load", () => {
      // Source for stored measurements (circles and lines)
      map.addSource("measurements", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })

      // Source for measurement points (centers, endpoints)
      map.addSource("measurement-points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })

      // Circle fill layer
      map.addLayer({
        id: "measurements-circles-fill",
        type: "fill",
        source: "measurements",
        filter: ["==", ["get", "type"], "circle"],
        paint: {
          "fill-color": "#007AFF",
          "fill-opacity": 0.12,
        },
      })

      // Circle outline layer
      map.addLayer({
        id: "measurements-circles-line",
        type: "line",
        source: "measurements",
        filter: ["==", ["get", "type"], "circle"],
        paint: {
          "line-color": "#007AFF",
          "line-width": 2,
        },
      })

      // Distance line layer
      map.addLayer({
        id: "measurements-lines",
        type: "line",
        source: "measurements",
        filter: ["==", ["get", "type"], "distance"],
        paint: {
          "line-color": "#FF3B30",
          "line-width": 2.5,
          "line-dasharray": [4, 3],
        },
      })

      // Measurement points (circle centers, line endpoints)
      map.addLayer({
        id: "measurement-points",
        type: "circle",
        source: "measurement-points",
        paint: {
          "circle-radius": 6,
          "circle-color": "#ffffff",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": ["get", "color"],
        },
      })

      // Source for pending circle
      map.addSource("pending-circle", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })

      map.addLayer({
        id: "pending-circle-fill",
        type: "fill",
        source: "pending-circle",
        paint: {
          "fill-color": "#34C759",
          "fill-opacity": 0.15,
        },
      })

      map.addLayer({
        id: "pending-circle-line",
        type: "line",
        source: "pending-circle",
        paint: {
          "line-color": "#34C759",
          "line-width": 2,
        },
      })

      // Source for pending distance line
      map.addSource("pending-distance", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })

      map.addLayer({
        id: "pending-distance-line",
        type: "line",
        source: "pending-distance",
        paint: {
          "line-color": "#FF9500",
          "line-width": 2.5,
          "line-dasharray": [4, 3],
        },
      })

      // Source for pending points
      map.addSource("pending-points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })

      map.addLayer({
        id: "pending-points",
        type: "circle",
        source: "pending-points",
        paint: {
          "circle-radius": 6,
          "circle-color": "#ffffff",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": ["get", "color"],
        },
      })

      mapLoadedRef.current = true
      updateMeasurementsOnMap(map, measurementsRef.current)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Helper to update measurements and points on map
  function updateMeasurementsOnMap(map: maplibregl.Map, measurements: Measurement[]) {
    const measurementsSource = map.getSource("measurements") as maplibregl.GeoJSONSource
    const pointsSource = map.getSource("measurement-points") as maplibregl.GeoJSONSource

    if (measurementsSource) {
      measurementsSource.setData({
        type: "FeatureCollection",
        features: measurements.map((m) => ({
          ...m.geometry,
          properties: {
            ...m.geometry.properties,
            type: m.type,
            id: m.id,
          },
        })),
      })
    }

    if (pointsSource) {
      const points: GeoJSON.Feature[] = []

      measurements.forEach((m) => {
        if (m.type === "circle" && m.center) {
          points.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: m.center },
            properties: { id: m.id, color: "#007AFF" },
          })
        } else if (m.type === "distance") {
          const coords = (m.geometry as GeoJSON.Feature<GeoJSON.LineString>).geometry.coordinates
          points.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: coords[0] },
            properties: { id: m.id, color: "#FF3B30" },
          })
          points.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: coords[1] },
            properties: { id: m.id, color: "#FF3B30" },
          })
        }
      })

      pointsSource.setData({
        type: "FeatureCollection",
        features: points,
      })
    }
  }

  // Update measurements on map when they change
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    updateMeasurementsOnMap(map, measurements)
  }, [measurements])

  // Update user location marker
  useEffect(() => {
    const map = mapRef.current
    if (!map || !userLocation) return

    if (!userMarkerRef.current) {
      const el = document.createElement("div")
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 bg-blue-500/30 rounded-full location-pulse"></div>
          <div class="w-4 h-4 bg-white rounded-full shadow-lg border-[3px] border-blue-500"></div>
        </div>
      `
      userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map)
    } else {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat])
    }
  }, [userLocation])

  // Handle map interactions
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const clearLongPress = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      longPressTargetRef.current = null
    }

    const handleTouchStart = (e: maplibregl.MapTouchEvent) => {
      clearLongPress()

      // Check if touching a measurement
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["measurements-circles-fill", "measurements-lines", "measurement-points"],
      })

      if (features.length > 0 && features[0].properties?.id) {
        longPressTargetRef.current = features[0].properties.id
        longPressTimerRef.current = window.setTimeout(() => {
          if (longPressTargetRef.current) {
            // Vibrate if supported
            if (navigator.vibrate) navigator.vibrate(50)
            onMeasurementRemove(longPressTargetRef.current)
            longPressTargetRef.current = null
          }
        }, LONG_PRESS_DURATION)
      }
    }

    const handleTouchEnd = () => {
      clearLongPress()
    }

    const handleTouchMove = () => {
      clearLongPress()
    }

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const tool = activeToolRef.current
      if (tool === "none") return

      const clickedPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat]

      if (tool === "distance") {
        if (!distanceStartRef.current) {
          // First click: set start point
          distanceStartRef.current = clickedPoint
          updatePendingPoints(map, [clickedPoint], "#FF9500")
        } else {
          // Second click: complete measurement
          const startPoint = distanceStartRef.current
          const distance = turf.distance(
            turf.point(startPoint),
            turf.point(clickedPoint),
            { units: "meters" }
          )

          const line = turf.lineString([startPoint, clickedPoint])

          const measurement: Measurement = {
            id: crypto.randomUUID(),
            type: "distance",
            geometry: line,
            value: distance,
            createdAt: new Date().toISOString(),
          }

          onMeasurementAdd(measurement)
          // Reset for next measurement, but stay in distance mode
          distanceStartRef.current = null
          clearPending(map)
          onPendingDistanceChange(null)
        }
      } else if (tool === "circle") {
        // Set circle center on click
        circleCenterRef.current = clickedPoint
        updatePendingPoints(map, [clickedPoint], "#34C759")
      }
    }

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      const tool = activeToolRef.current
      if (tool === "none") return

      const mousePoint: [number, number] = [e.lngLat.lng, e.lngLat.lat]

      if (tool === "distance" && distanceStartRef.current) {
        const startPoint = distanceStartRef.current
        const distance = turf.distance(
          turf.point(startPoint),
          turf.point(mousePoint),
          { units: "meters" }
        )

        onPendingDistanceChange(distance)

        const line = turf.lineString([startPoint, mousePoint])
        const source = map.getSource("pending-distance") as maplibregl.GeoJSONSource
        if (source) {
          source.setData({ type: "FeatureCollection", features: [line] })
        }
        updatePendingPoints(map, [startPoint, mousePoint], "#FF9500")
      } else if (tool === "circle" && circleCenterRef.current) {
        const center = circleCenterRef.current
        const rawRadius = turf.distance(
          turf.point(center),
          turf.point(mousePoint),
          { units: "meters" }
        )

        const snappedRadius = snapToNearest(rawRadius)
        onPendingRadiusChange(snappedRadius)

        const circle = turf.circle(center, snappedRadius, { steps: 64, units: "meters" })
        const source = map.getSource("pending-circle") as maplibregl.GeoJSONSource
        if (source) {
          source.setData({ type: "FeatureCollection", features: [circle] })
        }
        updatePendingPoints(map, [center], "#34C759")
      }
    }

    const handleMouseUp = (e: maplibregl.MapMouseEvent) => {
      const tool = activeToolRef.current
      if (tool !== "circle" || !circleCenterRef.current) return

      const center = circleCenterRef.current
      const mousePoint: [number, number] = [e.lngLat.lng, e.lngLat.lat]

      const rawRadius = turf.distance(
        turf.point(center),
        turf.point(mousePoint),
        { units: "meters" }
      )

      // Only create circle if radius > 50m
      if (rawRadius < 50) {
        circleCenterRef.current = null
        clearPending(map)
        onPendingRadiusChange(null)
        return
      }

      const snappedRadius = snapToNearest(rawRadius)
      const circle = turf.circle(center, snappedRadius, { steps: 64, units: "meters" })

      const measurement: Measurement = {
        id: crypto.randomUUID(),
        type: "circle",
        geometry: circle,
        value: snappedRadius,
        center,
        createdAt: new Date().toISOString(),
      }

      onMeasurementAdd(measurement)
      // Reset for next circle, but stay in circle mode
      circleCenterRef.current = null
      clearPending(map)
      onPendingRadiusChange(null)
    }

    map.on("touchstart", handleTouchStart)
    map.on("touchend", handleTouchEnd)
    map.on("touchmove", handleTouchMove)
    map.on("click", handleClick)
    map.on("mousemove", handleMouseMove)
    map.on("mouseup", handleMouseUp)

    return () => {
      clearLongPress()
      map.off("touchstart", handleTouchStart)
      map.off("touchend", handleTouchEnd)
      map.off("touchmove", handleTouchMove)
      map.off("click", handleClick)
      map.off("mousemove", handleMouseMove)
      map.off("mouseup", handleMouseUp)
    }
  }, [onMeasurementAdd, onMeasurementRemove, onPendingDistanceChange, onPendingRadiusChange])

  function updatePendingPoints(map: maplibregl.Map, points: [number, number][], color: string) {
    const source = map.getSource("pending-points") as maplibregl.GeoJSONSource
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: points.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: p },
          properties: { color },
        })),
      })
    }
  }

  function clearPending(map: maplibregl.Map) {
    const pendingCircle = map.getSource("pending-circle") as maplibregl.GeoJSONSource
    const pendingDistance = map.getSource("pending-distance") as maplibregl.GeoJSONSource
    const pendingPoints = map.getSource("pending-points") as maplibregl.GeoJSONSource

    const empty = { type: "FeatureCollection" as const, features: [] }
    if (pendingCircle) pendingCircle.setData(empty)
    if (pendingDistance) pendingDistance.setData(empty)
    if (pendingPoints) pendingPoints.setData(empty)
  }

  // Clear pending visuals when tool changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return

    if (activeTool === "none") {
      clearPending(map)
      distanceStartRef.current = null
      circleCenterRef.current = null
      onPendingDistanceChange(null)
      onPendingRadiusChange(null)
    }
  }, [activeTool, onPendingDistanceChange, onPendingRadiusChange])

  // Change cursor based on active tool
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    map.getCanvas().style.cursor = activeTool !== "none" ? "crosshair" : ""
  }, [activeTool])

  return <div ref={containerRef} className="w-full h-full" />
}
