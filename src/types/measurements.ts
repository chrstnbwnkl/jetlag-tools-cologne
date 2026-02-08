import type { Feature, Point, Polygon, LineString } from "geojson"

export interface Measurement {
  id: string
  type: "distance" | "circle"
  geometry: Feature<LineString | Polygon>
  value: number // meters for distance, radius in meters for circle
  center?: [number, number] // For circles: [lng, lat]
  createdAt: string
}

export interface StoredState {
  view: {
    center: [number, number] // [lng, lat]
    zoom: number
  }
  measurements: Measurement[]
}

export interface GeolocationState {
  position: GeolocationPosition | null
  error: GeolocationPositionError | null
  loading: boolean
}

export type MeasurementTool = "none" | "distance" | "circle"

export interface MapViewState {
  center: [number, number]
  zoom: number
}
