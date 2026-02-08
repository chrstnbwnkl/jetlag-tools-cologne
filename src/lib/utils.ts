import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const SNAP_DISTANCES = [500, 1000, 2000, 5000] as const
export const SNAP_THRESHOLD = 20 // meters

export function snapToNearest(meters: number): number {
  // Find the closest snap distance
  const closest = SNAP_DISTANCES.reduce((prev, curr) =>
    Math.abs(curr - meters) < Math.abs(prev - meters) ? curr : prev
  )

  // Only snap if within threshold
  if (Math.abs(closest - meters) <= SNAP_THRESHOLD) {
    return closest
  }

  return Math.round(meters)
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}
