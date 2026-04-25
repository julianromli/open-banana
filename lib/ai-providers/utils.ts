import type { ImageQuality } from "./types"

// BytePlus uses explicit dimensions
export const ASPECT_RATIO_TO_BYTEPLUS_SIZE: Record<string, string> = {
  "1:1": "2048x2048",
  "2:3": "1664x2496",
  "3:2": "2496x1664",
  "3:4": "1728x2304",
  "4:3": "2304x1728",
  "9:16": "1440x2560",
  "16:9": "2560x1440",
  "21:9": "3024x1296",
}

// fal.ai uses preset names
export const ASPECT_RATIO_TO_FAL_SIZE: Record<string, string> = {
  "1:1": "square_hd",
  "2:3": "portrait_4_3",
  "3:2": "landscape_4_3",
  "3:4": "portrait_4_3",
  "4:3": "landscape_4_3",
  "9:16": "portrait_16_9",
  "16:9": "landscape_16_9",
  "21:9": "landscape_16_9",
}

// Nano Banana base dimensions at 1K quality
export const ASPECT_RATIO_TO_NANO_BASE_SIZE: Record<string, string> = {
  "1:1": "1024x1024",
  "2:3": "832x1248",
  "3:2": "1248x832",
  "3:4": "864x1152",
  "4:3": "1152x864",
  "9:16": "720x1280",
  "16:9": "1280x720",
  "21:9": "1512x648",
}

export const QUALITY_MULTIPLIER: Record<ImageQuality, number> = {
  "1K": 1,
  "2K": 2,
  "4K": 4,
}

export const DEFAULT_QUALITY: ImageQuality = "1K"

export function getBytePlusSize(aspectRatio: string): string {
  return ASPECT_RATIO_TO_BYTEPLUS_SIZE[aspectRatio] || ASPECT_RATIO_TO_BYTEPLUS_SIZE["1:1"]
}

export function getFalSize(aspectRatio: string): string {
  return ASPECT_RATIO_TO_FAL_SIZE[aspectRatio] || ASPECT_RATIO_TO_FAL_SIZE["1:1"]
}

export function parseSize(size: string): { width: number; height: number } {
  const [width, height] = size.split("x").map(Number)
  return { width, height }
}

export function formatSize(width: number, height: number): string {
  return `${Math.round(width)}x${Math.round(height)}`
}

export function getNanoBananaSize(aspectRatio: string, quality: ImageQuality = "1K"): string {
  const baseSize = ASPECT_RATIO_TO_NANO_BASE_SIZE[aspectRatio] || ASPECT_RATIO_TO_NANO_BASE_SIZE["1:1"]
  const { width, height } = parseSize(baseSize)
  const multiplier = QUALITY_MULTIPLIER[quality] || 1
  return formatSize(width * multiplier, height * multiplier)
}
