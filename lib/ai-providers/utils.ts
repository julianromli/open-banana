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

export function getBytePlusSize(aspectRatio: string): string {
  return ASPECT_RATIO_TO_BYTEPLUS_SIZE[aspectRatio] || ASPECT_RATIO_TO_BYTEPLUS_SIZE["1:1"]
}

export function getFalSize(aspectRatio: string): string {
  return ASPECT_RATIO_TO_FAL_SIZE[aspectRatio] || ASPECT_RATIO_TO_FAL_SIZE["1:1"]
}
