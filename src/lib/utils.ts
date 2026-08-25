import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Stable SVG attribute so Node SSR and the browser agree on Math.sin/cos. */
export function svgCoord(n: number) {
  return n.toFixed(3)
}
