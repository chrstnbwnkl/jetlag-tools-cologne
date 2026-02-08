import { useState, useEffect, useCallback } from "react"
import type { GeolocationState } from "@/types/measurements"

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: true,
  })

  const updatePosition = useCallback((position: GeolocationPosition) => {
    setState({
      position,
      error: null,
      loading: false,
    })
  }, [])

  const handleError = useCallback((error: GeolocationPositionError) => {
    setState((prev) => ({
      ...prev,
      error,
      loading: false,
    }))
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        position: null,
        error: {
          code: 2,
          message: "Geolocation is not supported by this browser",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError,
        loading: false,
      })
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      updatePosition,
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [updatePosition, handleError])

  const coordinates = state.position
    ? {
        lat: state.position.coords.latitude,
        lng: state.position.coords.longitude,
        accuracy: state.position.coords.accuracy,
      }
    : null

  return {
    ...state,
    coordinates,
  }
}
