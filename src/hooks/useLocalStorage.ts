import { useState, useEffect, useCallback } from "react"
import type { StoredState, Measurement, MapViewState } from "@/types/measurements"

const STORAGE_KEY = "jetlag-map-state"

const DEFAULT_STATE: StoredState = {
  view: {
    center: [6.9578, 50.9422], // Cologne, Germany
    zoom: 13,
  },
  measurements: [],
}

function loadState(): StoredState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error("Failed to load state from localStorage:", e)
  }
  return DEFAULT_STATE
}

function saveState(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error("Failed to save state to localStorage:", e)
  }
}

export function useLocalStorage() {
  const [state, setState] = useState<StoredState>(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const updateView = useCallback((view: MapViewState) => {
    setState((prev) => ({
      ...prev,
      view,
    }))
  }, [])

  const addMeasurement = useCallback((measurement: Measurement) => {
    setState((prev) => ({
      ...prev,
      measurements: [...prev.measurements, measurement],
    }))
  }, [])

  const removeMeasurement = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      measurements: prev.measurements.filter((m) => m.id !== id),
    }))
  }, [])

  const clearMeasurements = useCallback(() => {
    setState((prev) => ({
      ...prev,
      measurements: [],
    }))
  }, [])

  return {
    view: state.view,
    measurements: state.measurements,
    updateView,
    addMeasurement,
    removeMeasurement,
    clearMeasurements,
  }
}
