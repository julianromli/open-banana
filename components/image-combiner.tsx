"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Dithering } from "@paper-design/shaders-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMobile } from "@/hooks/use-mobile"
import { useToast } from "@/hooks/use-toast" // Assuming useToast is available and imported
import { Sparkles, RotateCcw, Loader2, Copy } from "lucide-react" // Added Copy icon
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog" // Added Dialog components

interface GeneratedImage {
  url: string
  prompt: string
  description?: string
}

interface Generation {
  id: string
  status: "loading" | "complete" | "error"
  progress: number
  imageUrl: string | null
  prompt: string
  error?: string
  timestamp: number
  abortController?: AbortController
  thumbnailLoaded?: boolean
}

const randomPrompts = [
  "A cyberpunk cityscape with neon lights reflecting on wet streets at midnight",
  "A majestic dragon soaring through clouds above ancient mountain peaks",
  "A cozy coffee shop in a treehouse with fairy lights and hanging plants",
  "An underwater palace made of coral with bioluminescent sea creatures",
  "A steampunk airship floating above Victorian London in golden hour",
  "A magical forest with glowing mushrooms and ethereal mist",
  "A futuristic space station orbiting a purple nebula",
  "A vintage diner on Route 66 with classic cars parked outside",
  "A crystal cave with rainbow light refractions and floating gems",
  "A Japanese garden in autumn with koi pond and red maple trees",
  "A post-apocalyptic library overgrown with vines and nature",
  "A floating island with waterfalls cascading into clouds below",
  "A neon-lit arcade from the 80s with retro gaming machines",
  "A medieval castle on a cliff during a thunderstorm",
  "A bioluminescent alien jungle with exotic flora and fauna",
  "A cozy cabin in snowy mountains with smoke from the chimney",
  "A surreal desert with giant clock towers and melting timepieces",
  "A Victorian greenhouse filled with exotic plants and butterflies",
  "A cybernetic wolf howling at a digital moon in cyberspace",
  "A floating market in Venice with gondolas and colorful awnings",
  "A crystal palace made of ice with aurora borealis overhead",
  "A retro-futuristic diner on Mars with Earth visible in the sky",
  "A mystical portal in an ancient stone circle at dawn",
  "A steampunk laboratory with brass instruments and glowing vials",
  "A underwater city with glass domes and swimming mermaids",
  "A giant tree house city connected by rope bridges",
  "A neon samurai in a rain-soaked Tokyo alleyway",
  "A magical bookstore where books float and pages turn themselves",
  "A desert oasis with palm trees and a crystal-clear spring",
  "A space elevator reaching from Earth to a orbital station",
  "A haunted mansion with glowing windows on a foggy night",
  "A robot garden where mechanical flowers bloom with LED petals",
  "A pirate ship sailing through clouds in the sky",
  "A crystal dragon perched on a mountain of gemstones",
  "A cyberpunk street market with holographic vendors",
  "A fairy tale cottage with a thatched roof and flower garden",
  "A futuristic subway station with levitating trains",
  "A magical academy floating in the clouds with flying students",
  "A bioluminescent coral reef city with mermaid inhabitants",
  "A steampunk clocktower with gears visible through glass panels",
  "A post-apocalyptic greenhouse dome in a wasteland",
  "A dragon's hoard in a crystal cave filled with treasure",
  "A cybernetic forest where trees have circuit board bark",
  "A floating monastery on a mountain peak above the clouds",
  "A retro space diner with alien customers and robot waiters",
  "A magical winter wonderland with ice sculptures and snow fairies",
  "A underwater volcano with thermal vents and exotic sea life",
  "A steampunk carnival with mechanical rides and brass decorations",
  "A crystal city built inside a massive geode",
  "A cyberpunk rooftop garden with neon plants and digital rain",
  "A medieval tavern with a roaring fireplace and wooden beams",
  "A space whale swimming through a nebula of stars",
  "A magical potion shop with floating ingredients and glowing bottles",
  "A post-apocalyptic overgrown subway station with nature reclaiming it",
  "A crystal bridge spanning between two floating islands",
  "A cybernetic phoenix rising from digital flames",
  "A cozy lighthouse on a rocky coast during a storm",
  "A steampunk airship dock with multiple vessels and brass fittings",
  "A magical mirror maze with reflections showing different worlds",
  "A bioluminescent mushroom forest with glowing spores floating",
  "A futuristic greenhouse on Mars growing Earth plants",
  "A dragon sleeping on a pile of books in an ancient library",
  "A cyberpunk street art mural that moves and changes colors",
  "A floating tea house above cherry blossom trees in spring",
  "A crystal waterfall flowing upward into the sky",
  "A steampunk submarine exploring an underwater canyon",
  "A magical snow globe containing a miniature winter village",
  "A post-apocalyptic rooftop garden with solar panels and plants",
  "A cybernetic butterfly garden with holographic flowers",
  "A medieval blacksmith shop with glowing forge and sparks",
  "A space elevator cable stretching into a starry sky",
  "A magical treehouse library with books growing on branches",
  "A bioluminescent cave system with underground rivers",
  "A steampunk observatory with a massive brass telescope",
  "A crystal palace floating in aurora-filled skies",
  "A cyberpunk food truck serving neon-colored dishes",
  "A cozy bookshop cat cafe with felines reading books",
  "A post-apocalyptic wind farm with nature growing around turbines",
  "A magical ice skating rink with frozen waterfalls as backdrop",
  "A underwater steampunk city with brass submarines",
  "A dragon's nest built in the crown of a giant tree",
  "A cybernetic garden where flowers bloom in binary patterns",
  "A floating wizard tower surrounded by levitating rocks",
  "A crystal mine with workers harvesting rainbow gems",
  "A steampunk train station with ornate Victorian architecture",
  "A magical aurora dancing over a frozen lake",
  "A bioluminescent alien forest with singing plants",
  "A post-apocalyptic arcade where nature has taken over the games",
  "A cyberpunk temple with holographic monks meditating",
  "A cozy hobbit hole with round doors and flower gardens",
  "A crystal cathedral with stained glass windows casting rainbow light",
  "A steampunk circus with mechanical performers and brass instruments",
  "A magical bookstore where stories come alive and walk around",
]

const RENT_API_KEY_LINK = "https://wa.link/sbi0cp"

export function ImageCombiner() {
  const isMobile = useMobile()

  const [toastState, setToastState] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false)
  const [originalPrompt, setOriginalPrompt] = useState("")
  const [improvedPrompt, setImprovedPrompt] = useState("")
  const { toast } = useToast()
  const [isDragOver, setIsDragOver] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string>("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [image1, setImage1] = useState<File | null>(null)
  const [image1Preview, setImage1Preview] = useState<string>("")
  const [image1Url, setImage1Url] = useState<string>("")
  const [image2, setImage2] = useState<File | null>(null)
  const [image2Preview, setImage2Preview] = useState<string>("")
  const [image2Url, setImage2Url] = useState<string>("")
  const [useUrls, setUseUrls] = useState<boolean>(false)
  const [isConvertingHeic, setIsConvertingHeic] = useState(false)
  const [heicProgress, setHeicProgress] = useState(0)

  const [generations, setGenerations] = useState<Generation[]>([])
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null)

  const [userApiKey, setUserApiKey] = useState<string>("")
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)

  const [showPromptModal, setShowPromptModal] = useState(false)
  const [modalPromptText, setModalPromptText] = useState("")

  // Remove these old states as they're replaced by generations array
  // const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null)
  // const [isLoading, setIsLoading] = useState(false)
  // const [progress, setProgress] = useState(0)
  // const [abortController, setAbortController] = useState<AbortController | null>(null)
  // const currentGenerationIdRef = useRef<string | null>(null)

  const selectedGeneration = generations.find((g) => g.id === selectedGenerationId) || generations[0]
  const isLoading = generations.some((g) => g.status === "loading")
  const generatedImage =
    selectedGeneration?.status === "complete" && selectedGeneration.imageUrl
      ? { url: selectedGeneration.imageUrl, prompt: selectedGeneration.prompt }
      : null

  const [aspectRatio, setAspectRatio] = useState<string>("square")
  const [numVariations, setNumVariations] = useState(1)
  const [availableAspectRatios, setAvailableAspectRatios] = useState<
    Array<{ value: string; label: string; ratio: number; icon: React.ReactNode }>
  >([
    {
      value: "square",
      label: "1:1",
      ratio: 1,
      icon: (
        <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      ),
    },
    {
      value: "portrait",
      label: "9:16",
      ratio: 9 / 16,
      icon: (
        <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="8" y="4" width="8" height="16" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      ),
    },
    {
      value: "landscape",
      label: "16:9",
      ratio: 16 / 9,
      icon: (
        <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="4" y="8" width="16" height="8" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      ),
    },
    {
      value: "wide",
      label: "21:9",
      ratio: 21 / 9,
      icon: (
        <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="2" y="9" width="20" height="6" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      ),
    },
  ])
  // const [abortController, setAbortController] = useState<AbortController | null>(null) // Removed as it's now per-generation
  // const currentGenerationIdRef = useRef<string | null>(null) // Removed as it's now per-generation

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const savedApiKey = localStorage.getItem("gemini-api-key")
    if (savedApiKey) {
      setUserApiKey(savedApiKey)
    }
  }, [])

  useEffect(() => {
    if (selectedGeneration?.status === "complete" && selectedGeneration?.imageUrl) {
      setImageLoaded(false)
    }
  }, [selectedGenerationId, selectedGeneration?.imageUrl])

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastState({ message, type })
    setTimeout(() => setToastState(null), 3000)
  }

  const validateImageFormat = (file: File): boolean => {
    const supportedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "image/gif",
      "image/bmp",
      "image/tiff",
    ]

    // Check MIME type first
    if (supportedTypes.includes(file.type.toLowerCase())) {
      return true
    }

    // Fallback: check file extension for HEIC files (browsers sometimes don't set correct MIME type)
    const fileName = file.name.toLowerCase()
    const supportedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".gif", ".bmp", ".tiff"]

    return supportedExtensions.some((ext) => fileName.endsWith(ext))
  }

  const hasImages = useUrls ? image1Url || image2Url : image1 || image2
  const currentMode = hasImages ? "image-editing" : "text-to-image"

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]

        // Handle image files - always handle images regardless of focus
        if (item.type.startsWith("image/")) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            if (useUrls) {
              setUseUrls(false)
            }
            // Find first available slot
            if (!useUrls && !image1) {
              handleImageUpload(file, 1)
            } else if (!useUrls && !image2) {
              handleImageUpload(file, 2)
            } else {
              handleImageUpload(file, 1) // Replace first image
            }
          }
          return
        }

        // Handle text (URLs) - only if no input is focused or if it's a URL
        if (item.type === "text/plain") {
          item.getAsString((text) => {
            const trimmedText = text.trim()
            // Check if it's a URL
            if (trimmedText.match(/^https?:\/\/.+/)) {
              const activeElement = document.activeElement
              const isInputFocused = activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA"

              // If focused on a URL input, let it handle the paste naturally
              if (isInputFocused && activeElement?.getAttribute("type") === "url") {
                return
              }

              // Otherwise, handle it globally
              e.preventDefault()
              // Switch to URLs mode if not already
              if (!useUrls) {
                setUseUrls(true)
              }
              // Find first available URL slot
              if (!image1Url) {
                handleUrlChange(trimmedText, 1)
              } else if (!image2Url) {
                handleUrlChange(trimmedText, 2)
              } else {
                handleUrlChange(trimmedText, 1) // Replace first URL
              }
            }
          })
          return
        }
      }
    }

    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [useUrls, image1, image2, image1Url, image2Url])

  const compressImage = async (file: File, maxWidth = 1280, quality = 0.75): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height
            height = maxWidth
          }
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg", // Use JPEG for better compression
                lastModified: Date.now(),
              })
              console.log("[v0] Image compressed from", file.size, "to", blob.size, "bytes")
              resolve(compressedFile)
            } else {
              resolve(file) // Fallback to original if compression fails
            }
          },
          "image/jpeg",
          quality,
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }

  const convertHeicToPng = async (file: File): Promise<File> => {
    try {
      setHeicProgress(0)

      // Simulate progress during conversion
      const progressInterval = setInterval(() => {
        setHeicProgress((prev) => {
          if (prev >= 95) return prev
          return prev + Math.random() * 15 + 5
        })
      }, 50)

      // Import heic-to dynamically
      const { heicTo } = await import("heic-to")

      setHeicProgress(70)

      const convertedBlob = await heicTo({
        blob: file,
        type: "image/jpeg",
        quality: 0.9,
      })

      setHeicProgress(90)

      const convertedFile = new File([convertedBlob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
        type: "image/jpeg",
      })

      clearInterval(progressInterval)
      setHeicProgress(100)

      // Small delay to show 100%
      await new Promise((resolve) => setTimeout(resolve, 200))

      return convertedFile
    } catch (error) {
      console.error("[v0] HEIC conversion error:", error)
      throw new Error("Could not convert HEIC image. Please try using a different image format.")
    }
  }

  const detectAspectRatio = (width: number, height: number): string => {
    const ratio = width / height

    // Default options that are always visible
    const defaultOptions = ["square", "portrait", "landscape", "wide"]

    // All possible aspect ratios
    const allRatios = [
      {
        value: "square",
        label: "1:1",
        ratio: 1,
        icon: (
          <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        ),
      },
      {
        value: "portrait",
        label: "9:16",
        ratio: 9 / 16,
        icon: (
          <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="8" y="4" width="8" height="16" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        ),
      },
      {
        value: "landscape",
        label: "16:9",
        ratio: 16 / 9,
        icon: (
          <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="8" width="16" height="8" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        ),
      },
      {
        value: "wide",
        label: "21:9",
        ratio: 21 / 9,
        icon: (
          <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="2" y="9" width="20" height="6" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        ),
      },
      {
        value: "4:3",
        label: "4:3",
        ratio: 4 / 3,
        icon: (
          <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="5" y="7" width="14" height="10" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        ),
      },
      {
        value: "3:2",
        label: "3:2",
        ratio: 3 / 2,
        icon: (
          <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="8" width="16" height="8" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        ),
      },
      {
        value: "2:3",
        label: "2:3",
        ratio: 2 / 3,
        icon: (
          <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="8" y="4" width="8" height="16" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        ),
      },
      {
        value: "3:4",
        label: "3:4",
        ratio: 3 / 4,
        icon: (
          <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="7" y="5" width="10" height="14" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        ),
      },
      {
        value: "5:4",
        label: "5:4",
        ratio: 5 / 4,
        icon: (
          <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="5" y="7" width="14" height="10" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        ),
      },
      {
        value: "4:5",
        label: "4:5",
        ratio: 4 / 5,
        icon: (
          <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="7" y="5" width="10" height="14" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        ),
      },
    ]

    // Find the closest match
    let closestMatch = allRatios[0]
    let smallestDiff = Math.abs(ratio - closestMatch.ratio)

    for (const option of allRatios) {
      const diff = Math.abs(ratio - option.ratio)
      if (diff < smallestDiff) {
        smallestDiff = diff
        closestMatch = option
      }
    }

    // If the best match is not in default options, add it to available options
    if (!defaultOptions.includes(closestMatch.value)) {
      setAvailableAspectRatios((prev) => {
        // Check if this ratio is already in the list
        const exists = prev.some((r) => r.value === closestMatch.value)
        if (!exists) {
          // Add the new ratio and sort by ratio value
          return [...prev, closestMatch].sort((a, b) => a.ratio - b.ratio)
        }
        return prev
      })
    }

    return closestMatch.value
  }

  const handleImageUpload = async (file: File, imageNumber: 1 | 2) => {
    console.log("[v0] Uploading image:", file.name, "for position:", imageNumber)

    if (!validateImageFormat(file)) {
      showToast("Please select a valid image file.", "error")
      return
    }

    let processedFile = file
    const isHeic =
      file.type.toLowerCase().includes("heic") ||
      file.type.toLowerCase().includes("heif") ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif")

    if (isHeic) {
      try {
        console.log("[v0] Converting HEIC image to JPEG...")
        setIsConvertingHeic(true)
        processedFile = await convertHeicToPng(file)
        console.log("[v0] HEIC conversion successful")
        setIsConvertingHeic(false)
      } catch (error) {
        console.error("[v0] Error converting HEIC:", error)
        setIsConvertingHeic(false)
        showToast("Error converting HEIC image. Please try a different format.", "error")
        return
      }
    }

    try {
      console.log("[v0] Compressing image for optimal API performance...")
      processedFile = await compressImage(processedFile)
      console.log("[v0] Image compression successful")
    } catch (error) {
      console.error("[v0] Error compressing image:", error)
      // Continue with uncompressed image if compression fails
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      console.log("[v0] Image loaded successfully, setting preview for image", imageNumber)

      const img = new Image()
      img.onload = () => {
        const isFirstImage = imageNumber === 1 || (!image1 && !image1Preview && !image1Url)

        if (isFirstImage) {
          const detectedRatio = detectAspectRatio(img.width, img.height)
          setAspectRatio(detectedRatio)
          console.log("[v0] Auto-detected aspect ratio:", detectedRatio, "from dimensions:", img.width, "x", img.height)
          showToast(`Aspect ratio set to ${detectedRatio}`, "success")
        } else {
          console.log("[v0] Skipping aspect ratio detection for second image")
        }
      }
      img.src = result

      if (imageNumber === 1) {
        setImage1(processedFile) // Use processed file instead of original
        setImage1Preview(result)
        console.log("[v0] Image 1 preview set:", result.substring(0, 50) + "...")
      }
      if (imageNumber === 2) {
        setImage2(processedFile) // Use processed file instead of original
        setImage2Preview(result)
        console.log("[v0] Image 2 preview set:", result.substring(0, 50) + "...")
      }
    }
    reader.onerror = (error) => {
      console.error("[v0] Error reading file:", error)
      showToast("Error reading the image file. Please try again.", "error")
    }
    reader.readAsDataURL(processedFile) // Read processed file instead of original
  }

  const handleDrop = (e: React.DragEvent, imageNumber: 1 | 2) => {
    e.preventDefault()
    setIsDragOver(false)
    console.log("[v0] File dropped for image", imageNumber)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      console.log("[v0] Valid image file dropped:", file.name)
      handleImageUpload(file, imageNumber)
    } else {
      console.log("[v0] Invalid file type or no file:", file?.type)
      showToast("Please drop a valid image file", "error")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, imageNumber: 1 | 2) => {
    console.log("[v0] File input changed for image", imageNumber)
    const file = e.target.files?.[0]
    if (file) {
      console.log("[v0] File selected:", file.name, file.type)
      handleImageUpload(file, imageNumber)
      e.target.value = ""
    } else {
      console.log("[v0] No file selected")
    }
  }

  const handleUrlChange = (url: string, imageNumber: 1 | 2) => {
    console.log("[v0] URL changed for image", imageNumber, ":", url)
    if (imageNumber === 1) {
      setImage1Url(url)
      setImage1Preview(url)
      setImage1(null)
    }
    if (imageNumber === 2) {
      setImage2Url(url)
      setImage2Preview(url)
      setImage2(null)
    }
  }

  const preloadImage = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = reject
      img.src = url
    })
  }

  const openFullscreen = () => {
    if (generatedImage?.url) {
      setFullscreenImageUrl(generatedImage.url)
      setShowFullscreen(true)
    }
  }

  const openImageFullscreen = (imageUrl: string) => {
    setFullscreenImageUrl(imageUrl)
    setShowFullscreen(true)
  }

  const closeFullscreen = () => {
    setShowFullscreen(false)
    setFullscreenImageUrl("")
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showFullscreen) {
        closeFullscreen()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [showFullscreen])

  useEffect(() => {
    if (showFullscreen) {
      // Save current overflow value
      const originalOverflow = document.body.style.overflow
      // Prevent scrolling
      document.body.style.overflow = "hidden"

      // Restore on cleanup
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [showFullscreen])

  const cancelGeneration = (generationId: string) => {
    const generation = generations.find((g) => g.id === generationId)
    if (generation?.abortController) {
      generation.abortController.abort()
    }

    // Immediately mark as cancelled
    setGenerations((prev) =>
      prev.map((gen) =>
        gen.id === generationId && gen.status === "loading"
          ? { ...gen, status: "error" as const, error: "Cancelled by user", progress: 0, abortController: undefined }
          : gen,
      ),
    )
    showToast("Generation cancelled", "error")
  }

  const improvePrompt = async () => {
    if (prompt.trim().length < 3) {
      toast({
        title: "Prompt too short",
        description: "Please enter at least 3 characters",
        variant: "destructive",
      })
      return
    }

    // Removed character limit check
    // if (prompt.trim().length > 500) {
    //   toast({
    //     title: "Prompt too long",
    //     description: "Please keep your prompt under 500 characters",
    //     variant: "destructive",
    //   })
    //   return
    // }

    setIsImprovingPrompt(true)
    setOriginalPrompt(prompt) // Save original for undo

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      if (userApiKey) {
        headers["x-api-key"] = userApiKey
      }

      const response = await fetch("/api/improve-prompt", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: prompt.trim(),
          mode: currentMode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to improve prompt")
      }

      // Replace prompt with improved version
      setPrompt(data.improvedPrompt)
      setImprovedPrompt(data.improvedPrompt)

      toast({
        title: "Prompt improved",
      })
    } catch (error: any) {
      console.error("[v0] Error improving prompt:", error)
      toast({
        title: "Failed to improve prompt",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsImprovingPrompt(false)
    }
  }

  const undoImprovement = () => {
    setPrompt(originalPrompt)
    setOriginalPrompt("")
    setImprovedPrompt("")
    toast({
      title: "Restored original prompt",
    })
  }

  useEffect(() => {
    if (originalPrompt && improvedPrompt && prompt !== improvedPrompt) {
      setOriginalPrompt("")
      setImprovedPrompt("")
    }
  }, [prompt, improvedPrompt, originalPrompt])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") {
        e.preventDefault()
        if (canImprove) {
          improvePrompt()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [prompt, isImprovingPrompt, isLoading])

  const generateImage = async () => {
    if (currentMode === "image-editing" && !useUrls && !image1) return
    if (currentMode === "image-editing" && useUrls && !image1Url) return
    if (!prompt.trim()) return

    const generationPromises = []

    for (let i = 0; i < numVariations; i++) {
      const generationId = `gen-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const controller = new AbortController()

      const newGeneration: Generation = {
        id: generationId,
        status: "loading",
        progress: 0,
        imageUrl: null,
        prompt: prompt,
        timestamp: Date.now() + i, // Add offset to ensure unique timestamps
        abortController: controller,
      }

      setGenerations((prev) => [newGeneration, ...prev])

      // Set the first generation as selected
      if (i === 0) {
        setSelectedGenerationId(generationId)
      }

      // Start progress interval for this generation
      const progressInterval = setInterval(() => {
        setGenerations((prev) =>
          prev.map((gen) => {
            if (gen.id === generationId && gen.status === "loading") {
              const next =
                gen.progress >= 98
                  ? 98
                  : gen.progress >= 96
                    ? gen.progress + 0.2
                    : gen.progress >= 90
                      ? gen.progress + 0.5
                      : gen.progress >= 75
                        ? gen.progress + 0.8
                        : gen.progress >= 50
                          ? gen.progress + 1
                          : gen.progress >= 25
                            ? gen.progress + 1.2
                            : gen.progress + 1.5
              return { ...gen, progress: Math.min(next, 98) }
            }
            return gen
          }),
        )
      }, 100)

      // Create the generation promise
      const generationPromise = (async () => {
        try {
          const formData = new FormData()
          formData.append("mode", currentMode)
          formData.append("prompt", prompt)
          formData.append("aspectRatio", aspectRatio)

          if (currentMode === "image-editing") {
            if (useUrls) {
              formData.append("image1Url", image1Url)
              if (image2Url) {
                formData.append("image2Url", image2Url)
              }
            } else {
              if (image1) {
                formData.append("image1", image1)
              }
              if (image2) {
                formData.append("image2", image2)
              }
            }
          }

          const headers: HeadersInit = {}
          if (userApiKey) {
            headers["x-api-key"] = userApiKey
          }

          const response = await fetch("/api/generate-image", {
            method: "POST",
            body: formData,
            headers,
            signal: controller.signal,
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({
              error: "Unknown error",
              details: `Server returned ${response.status}`,
              errorType: "UNKNOWN_ERROR",
            }))

            clearInterval(progressInterval)

            let userFriendlyMessage = errorData.error || "Failed to generate image"
            let detailedMessage = errorData.details || ""

            // Handle specific error types
            if (response.status === 429) {
              if (errorData.resetTime) {
                const resetDate = new Date(errorData.resetTime)
                const resetTime = resetDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                userFriendlyMessage = `Rate limit reached. Try again after ${resetTime}`
              } else {
                userFriendlyMessage = "Too many requests. Please try again later or use your own API key."
              }
            } else if (response.status === 401) {
              userFriendlyMessage = "Invalid API key"
              detailedMessage = "Please check your API key and try again."
            } else if (response.status === 403) {
              userFriendlyMessage = "Access denied"
              detailedMessage = "Your API key doesn't have permission to use this feature."
            } else if (response.status === 400) {
              // Content policy or invalid request
              if (errorData.errorType === "CONTENT_POLICY_VIOLATION") {
                userFriendlyMessage = "Content not allowed"
                detailedMessage = "Your prompt may contain inappropriate content. Try a different description."
              } else if (errorData.errorType === "IMAGE_ERROR") {
                userFriendlyMessage = "Image format error"
                detailedMessage = "Please use images in JPEG, PNG, or WebP format under 20MB."
              } else {
                userFriendlyMessage = "Invalid request"
              }
            } else if (response.status === 503 || response.status === 504) {
              userFriendlyMessage = "Service temporarily unavailable"
              detailedMessage = "The image generation service is experiencing issues. Please try again in a moment."
            } else if (response.status >= 500) {
              userFriendlyMessage = "Server error"
              detailedMessage = "Something went wrong on our end. Please try again."
            }

            setGenerations((prev) =>
              prev.map((gen) =>
                gen.id === generationId
                  ? {
                      ...gen,
                      status: "error" as const,
                      error: userFriendlyMessage,
                      progress: 0,
                      abortController: undefined,
                    }
                  : gen,
              ),
            )

            showToast(detailedMessage ? `${userFriendlyMessage}: ${detailedMessage}` : userFriendlyMessage, "error")
            return
          }

          const data = await response.json()

          try {
            await preloadImage(data.url)
          } catch (error) {
            console.error("[v0] Error preloading image:", error)
            // Continue anyway if preload fails
          }

          clearInterval(progressInterval)

          setGenerations((prev) =>
            prev.map((gen) => {
              if (gen.id === generationId) {
                // Only update if it's still in loading state (not cancelled)
                if (gen.status === "loading") {
                  return {
                    ...gen,
                    status: "complete" as const,
                    progress: 100,
                    imageUrl: data.url,
                    abortController: undefined,
                    thumbnailLoaded: true, // Mark as loaded immediately since we preloaded
                  }
                }
                // If it was cancelled, keep the cancelled state
                return gen
              }
              return gen
            }),
          )

          if (selectedGenerationId === generationId) {
            setImageLoaded(true)
          }
        } catch (error) {
          clearInterval(progressInterval)

          if (error instanceof Error && error.name === "AbortError") {
            console.log("[v0] Generation fetch aborted for:", generationId)
            return
          }

          console.error("[v0] Error generating image:", error)

          let errorMessage = "Unknown error occurred"

          if (error instanceof TypeError) {
            if (error.message.includes("fetch")) {
              errorMessage = "Network error. Please check your connection and try again."
            } else {
              errorMessage = "Something went wrong. Please try again."
            }
          } else if (error instanceof Error) {
            // Parse common error patterns
            if (error.message.includes("timeout")) {
              errorMessage = "Request timed out. Try a simpler prompt or smaller images."
            } else if (error.message.includes("network")) {
              errorMessage = "Network error. Please check your connection."
            } else if (error.message.includes("quota") || error.message.includes("limit")) {
              errorMessage = "API quota exceeded. Please try again later or use your own API key."
            } else {
              errorMessage = error.message
            }
          }

          setGenerations((prev) =>
            prev.map((gen) =>
              gen.id === generationId && gen.status === "loading"
                ? {
                    ...gen,
                    status: "error" as const,
                    error: errorMessage,
                    progress: 0,
                    abortController: undefined,
                  }
                : gen,
            ),
          )

          showToast(`Error: ${errorMessage}`, "error")
        }
      })()

      generationPromises.push(generationPromise)
    }

    // Wait for all generations to complete
    await Promise.all(generationPromises)
  }

  const downloadImage = async () => {
    if (generatedImage) {
      try {
        const firstWord = generatedImage.prompt.trim().split(/\s+/)[0] || "image"
        const slug = firstWord
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
        const filename = `openbanana-${slug}.png`

        const response = await fetch(generatedImage.url)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename // Use generated filename instead of hardcoded one
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error("Error downloading image:", error)
        window.open(generatedImage.url, "_blank")
      }
    }
  }

  const openImageInNewTab = () => {
    if (generatedImage) {
      window.open(generatedImage.url, "_blank")
    }
  }

  const copyImageToClipboard = async () => {
    if (generatedImage) {
      try {
        setToastState({ message: "Copying image...", type: "success" })

        // Ensure window is focused
        window.focus()

        // Try direct fetch first (works in development), fallback to proxy
        let response
        try {
          response = await fetch(generatedImage.url, { mode: "cors" })
        } catch {
          // Fallback to proxy for production CORS issues
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(generatedImage.url)}`
          response = await fetch(proxyUrl)
        }

        if (!response.ok) {
          throw new Error("Failed to fetch image")
        }

        const blob = await response.blob()
        const clipboardItem = new ClipboardItem({ "image/png": blob })
        await navigator.clipboard.write([clipboardItem])

        setToastState({ message: "Image copied to clipboard!", type: "success" })
        setTimeout(() => setToastState(null), 2000)
      } catch (error) {
        console.error("Error copying image:", error)
        if (error instanceof Error && error.message.includes("not focused")) {
          setToastState({ message: "Please click on the page first, then try copying again", type: "error" })
        } else {
          setToastState({ message: "Failed to copy image to clipboard", type: "error" })
        }
      }
    }
  }

  const clearImage = (imageNumber: 1 | 2) => {
    if (imageNumber === 1) {
      setImage1(null)
      setImage1Preview("")
      setImage1Url("")
    } else {
      setImage2(null)
      setImage2Preview("")
      setImage2Url("")
    }
  }

  // Modified to use the selected generation's image URL
  const useGeneratedAsInput = async () => {
    if (!selectedGeneration?.imageUrl) return

    try {
      // Download the image and convert it to a File object
      const response = await fetch(selectedGeneration.imageUrl)
      const blob = await response.blob()
      const file = new File([blob], "generated-image.png", { type: "image/png" })

      // Check if image1 is empty, use it first
      if (!image1Preview && !image1) {
        setImage1(file)
        setImage1Preview(URL.createObjectURL(file))
        setImage1Url("")
        showToast("Image loaded into Input 1", "success")
      }
      // If image1 is occupied, use image2
      else if (!image2Preview && !image2) {
        setImage2(file)
        setImage2Preview(URL.createObjectURL(file))
        setImage2Url("")
        showToast("Image loaded into Input 2", "success")
      }
      // If both slots are occupied, replace image1
      else {
        setImage1(file)
        setImage1Preview(URL.createObjectURL(file))
        setImage1Url("")
        showToast("Image replaced in Input 1", "success")
      }
    } catch (error) {
      console.error("Error loading image as input:", error)
      showToast("Error loading image", "error")
    }
  }

  const canGenerate = prompt.trim().length > 0 && (currentMode === "text-to-image" || (useUrls ? image1Url : image1))

  const handleGlobalDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true)
    }
  }

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      if (!useUrls && !image1) {
        handleImageUpload(file, 1)
      } else if (!useUrls && !image2) {
        handleImageUpload(file, 2)
      } else if (!useUrls && image1 && !image2) {
        handleImageUpload(file, 2)
      } else {
        handleImageUpload(file, 1)
      }
    } else {
      showToast("Please drop a valid image file", "error")
    }
  }

  const autoResizeTextarea = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }

  useEffect(() => {
    autoResizeTextarea()
  }, [prompt])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      if (canGenerate) {
        generateImage()
      }
    }
  }

  const handleApiKeyChange = (key: string) => {
    setUserApiKey(key)
    if (key) {
      localStorage.setItem("gemini-api-key", key)
    } else {
      localStorage.removeItem("gemini-api-key")
    }
  }

  // Removed character limit logic from canImprove
  const canImprove = prompt.trim().length >= 3 && !isImprovingPrompt && !isLoading
  // const charCount = prompt.length
  // const charLimit = 500
  // const charCountColor = charCount > 490 ? "text-red-400" : charCount > 400 ? "text-yellow-400" : "text-gray-500"

  const copyPromptToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      })
    }
  }

  return (
    <div
      className="bg-background min-h-screen flex items-center justify-center select-none"
      onDragEnter={handleGlobalDragEnter}
      onDragLeave={handleGlobalDragLeave}
      onDragOver={handleGlobalDragOver}
      onDrop={handleGlobalDrop}
    >
      {toastState && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300 select-none">
          <div
            className={cn(
              "bg-black/90 backdrop-blur-sm border rounded-lg p-4 shadow-lg max-w-sm",
              toastState.type === "success" ? "border-green-500/50 text-green-100" : "border-red-500/50 text-red-100",
            )}
          >
            <div className="flex items-center gap-3">
              {toastState.type === "success" ? (
                <svg
                  className="w-5 h-5 text-green-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-red-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12m0 0l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              )}
              <p className="text-sm font-medium">{toastState.message}</p>
            </div>
          </div>
        </div>
      )}

      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center select-none">
          <div className="bg-white/10 border-2 border-dashed border-white/50 rounded-xl p-8 md:p-12 text-center mx-4">
            <svg
              className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Drop Images Here</h3>
            <p className="text-gray-300 text-sm md:text-base">Release to upload your images</p>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-0 select-none">
        <Dithering
          colorBack="#00000000"
          colorFront="#614B00"
          speed={0.43}
          shape="wave"
          type="4x4"
          pxSize={3}
          scale={1.13}
          style={{
            backgroundColor: "#000000",
            height: "100vh",
            width: "100vw",
          }}
        />
      </div>

      <div
        className={cn(
          "relative z-10 p-2 md:p-6 w-full max-w-6xl mx-auto select-none transition-all duration-700 ease-out",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
      >
        <div className="bg-black/70 backdrop-blur-sm border-0 p-3 md:p-8 rounded-xl">
          <div
            className={cn(
              "mb-4 md:mb-8 transition-all duration-700 ease-out delay-100",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            <div className="flex items-center justify-between">
              <h1 className="text-lg md:text-2xl font-bold text-white select-none">
                OPEN BANANA
                <span className="sr-only"> - Free AI Image Generator</span>
              </h1>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.open(RENT_API_KEY_LINK, "_blank")}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-3 bg-transparent border-gray-600 text-white hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>Rent API Key</span>
                </Button>
                <Button
                  onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "text-xs h-7 px-3 bg-transparent border-gray-600 text-white hover:bg-gray-700 flex items-center gap-2",
                    userApiKey && "border-green-500/50 text-green-300",
                  )}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                  <span>{userApiKey ? "API Key Set" : "Add API Key"}</span>
                </Button>
              </div>
            </div>

            {showApiKeyInput && (
              <div className="mt-4 p-4 bg-black/50 border border-gray-600 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-xs text-gray-300 space-y-1">
                    <p>Enter your Google AI API key to bypass rate limits and use your own quota.</p>
                    <p className="text-gray-400">
                      Get your free API key at{" "}
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        Google AI Studio
                      </a>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={userApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Enter your Gemini API key..."
                    className="flex-1 p-2 bg-black/50 border border-gray-600 text-white text-xs focus:outline-none focus:ring-2 focus:ring-white rounded select-text"
                  />
                  {userApiKey && (
                    <Button
                      onClick={() => handleApiKeyChange("")}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto px-3 bg-transparent border-gray-600 text-white hover:bg-gray-700"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {userApiKey && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    API key saved locally. Rate limits bypassed!
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-12">
            <div
              className={cn(
                "space-y-4 md:space-y-8 transition-all duration-700 ease-out delay-200",
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
              )}
            >
              {/* Input Section */}
              <div className="space-y-4 md:space-y-8">
                <div className="flex items-center justify-between gap-1 md:gap-2 select-none">
                  <h3 className="text-sm md:text-lg font-semibold flex items-center gap-1 md:gap-2 text-white flex-shrink-0">
                    <svg
                      className="hidden md:block w-4 h-4 lg:w-5 lg:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
                    </svg>
                    <span>Input</span>
                  </h3>
                  <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger
                        size="sm"
                        className="w-24 sm:w-28 md:w-32 !h-7 md:!h-10 bg-black/50 border-gray-600 text-white text-xs md:text-sm !px-2 !py-0 md:!px-4 md:!py-0 whitespace-nowrap flex items-center rounded-none [&>span]:leading-none [&>span]:flex [&>span]:items-center min-h-0"
                      >
                        <SelectValue placeholder="1:1" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/95 border-gray-600 text-white z-50">
                        {availableAspectRatios.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-xs md:text-sm">
                            <div className="flex items-center gap-2">
                              {option.icon}
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="inline-flex h-7 md:h-10 bg-black/50 border border-gray-600 px-2 py-0 md:px-4 md:py-0 flex-shrink-0 items-center rounded-none">
                      <span className="text-xs md:text-sm font-medium text-gray-300 whitespace-nowrap leading-none flex items-center">
                        {currentMode === "text-to-image" ? "Text-to-Image" : "Image-to-Image"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 md:space-y-6">
                  <div className="flex items-center justify-between mb-3 md:mb-6 select-none">
                    <label className="text-xs md:text-sm font-medium text-gray-300">
                      {currentMode === "text-to-image" ? "Describe your image" : "Describe how to edit the image..."}
                    </label>
                    <div className="flex gap-2">
                      <Button
                        onClick={improvePrompt}
                        disabled={!canImprove}
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs bg-transparent border-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
                        title="Improve prompt with AI (Ctrl+Shift+I)"
                      >
                        {isImprovingPrompt ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        Improve
                      </Button>
                      <Button
                        onClick={() => setPrompt("")}
                        disabled={!prompt.trim()}
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs bg-transparent border-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        currentMode === "text-to-image"
                          ? "Describe the image you want to generate..."
                          : "Describe how to edit the image..."
                      }
                      className="w-full min-h-16 md:min-h-32 p-2 md:p-4 bg-black/50 border border-gray-600 rounded resize-none focus:outline-none focus:ring-2 focus:ring-white text-white text-xs md:text-base select-text overflow-hidden"
                      style={{
                        fontSize: "16px", // Prevents zoom on iOS Safari
                        WebkitUserSelect: "text",
                        userSelect: "text",
                        paddingBottom: originalPrompt ? "2.5rem" : "0.5rem",
                      }}
                    />
                    {originalPrompt && (
                      <button
                        onClick={undoImprovement}
                        className="absolute bottom-2 left-2 p-1.5 bg-black/70 hover:bg-black/90 border border-gray-600 rounded transition-all text-white"
                        title="Restore original prompt"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 md:space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3 md:mb-6 select-none">
                      <label className="text-xs md:text-sm font-medium text-gray-300">Images</label>
                      <div className="inline-flex bg-black/50 border border-gray-600 rounded">
                        <button
                          onClick={() => setUseUrls(false)}
                          className={cn(
                            "px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm font-medium transition-all rounded-l",
                            !useUrls ? "bg-white text-black" : "text-gray-300 hover:text-white",
                          )}
                        >
                          Files
                        </button>
                        <button
                          onClick={() => setUseUrls(true)}
                          className={cn(
                            "px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm font-medium transition-all rounded-r",
                            useUrls ? "bg-white text-black" : "text-gray-300 hover:text-white",
                          )}
                        >
                          URLs
                        </button>
                      </div>
                    </div>

                    {useUrls ? (
                      <div className="space-y-2" style={{ minHeight: "80px" }}>
                        <div className="relative">
                          <input
                            type="url"
                            value={image1Url}
                            onChange={(e) => handleUrlChange(e.target.value, 1)}
                            placeholder="First image URL"
                            className="w-full p-2 md:p-3 pr-8 bg-black/50 border border-gray-600 text-white text-xs focus:outline-none focus:ring-2 focus:ring-white rounded select-text"
                          />
                          {image1Url && (
                            <button
                              onClick={() => clearImage(1)}
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="url"
                            value={image2Url}
                            onChange={(e) => handleUrlChange(e.target.value, 2)}
                            placeholder="Second image URL (optional)"
                            className="w-full p-2 md:p-3 pr-8 bg-black/50 border border-gray-600 text-white text-xs focus:outline-none focus:ring-2 focus:ring-white rounded select-text"
                          />
                          {image2Url && (
                            <button
                              onClick={() => clearImage(2)}
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 select-none" style={{ minHeight: "80px" }}>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:flex lg:justify-start lg:gap-4">
                          <div
                            className={cn(
                              "w-full h-[60px] sm:h-[80px] lg:w-[140px] lg:h-[120px] lg:flex-shrink-0 border border-gray-600 rounded flex items-center justify-center cursor-pointer hover:border-white transition-all bg-black/30 relative group",
                              image1Preview && "border-white",
                            )}
                            onDrop={(e) => handleDrop(e, 1)}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => {
                              if (image1Preview) {
                                openImageFullscreen(image1Preview)
                              } else {
                                document.getElementById("file1")?.click()
                              }
                            }}
                          >
                            {image1Preview ? (
                              <div className="w-full h-full p-1 sm:p-2 relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    clearImage(1)
                                  }}
                                  className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-10 bg-black/90 hover:bg-white/90 text-white hover:text-black rounded-full p-1 sm:p-1.5 transition-all shadow-lg border border-white/40 opacity-100"
                                >
                                  <svg
                                    className="w-3 h-3 sm:w-4 sm:h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                    viewBox="0 0 24 24"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                                <img
                                  src={image1Preview || "/placeholder.svg"}
                                  alt="First Image"
                                  className="w-full h-full object-contain rounded"
                                />
                              </div>
                            ) : (
                              <div className="text-center text-gray-300 py-1 sm:py-4">
                                <svg
                                  className="w-3 h-3 sm:w-5 sm:h-5 md:w-6 md:h-6 mx-auto mb-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                  />
                                </svg>
                                <p className="text-xs">Upload Image</p>
                              </div>
                            )}
                            <input
                              id="file1"
                              type="file"
                              accept="image/*,.heic,.heif"
                              className="hidden"
                              onChange={(e) => handleFileSelect(e, 1)}
                            />
                          </div>
                          <div
                            className={cn(
                              "w-full h-[60px] sm:h-[80px] lg:w-[140px] lg:h-[120px] lg:flex-shrink-0 border border-gray-600 rounded flex items-center justify-center cursor-pointer hover:border-white transition-all bg-black/30 relative group",
                              image2Preview && "border-white",
                            )}
                            onDrop={(e) => handleDrop(e, 2)}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => {
                              if (image2Preview) {
                                openImageFullscreen(image2Preview)
                              } else {
                                document.getElementById("file2")?.click()
                              }
                            }}
                          >
                            {image2Preview ? (
                              <div className="w-full h-full p-1 sm:p-2 relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    clearImage(2)
                                  }}
                                  className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-10 bg-black/90 hover:bg-white/90 text-white hover:text-black rounded-full p-1 sm:p-1.5 transition-all shadow-lg border border-white/40 opacity-100"
                                >
                                  <svg
                                    className="w-3 h-3 sm:w-4 sm:h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                    viewBox="0 0 24 24"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                                <img
                                  src={image2Preview || "/placeholder.svg"}
                                  alt="Second Image"
                                  className="w-full h-full object-contain rounded"
                                />
                              </div>
                            ) : (
                              <div className="text-center text-gray-300 py-1 sm:py-4">
                                <svg
                                  className="w-3 h-3 sm:w-5 sm:h-5 md:w-6 md:h-6 mx-auto mb-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                  />
                                </svg>
                                <p className="text-xs">Second Image</p>
                                <p className="text-xs text-gray-400">(optional)</p>
                              </div>
                            )}
                            <input
                              id="file2"
                              type="file"
                              accept="image/*,.heic,.heif"
                              className="hidden"
                              onChange={(e) => handleFileSelect(e, 2)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buttons for generation */}
                <div className="lg:hidden">
                  <Button
                    onClick={generateImage}
                    disabled={!canGenerate || isConvertingHeic}
                    className="w-full h-10 text-sm font-semibold bg-white text-black hover:bg-gray-200 rounded"
                  >
                    {isConvertingHeic ? "Converting HEIC..." : "Run"}
                  </Button>
                </div>

                <div className="pt-3 hidden lg:flex lg:items-end">
                  <Button
                    onClick={generateImage}
                    disabled={!canGenerate || isConvertingHeic}
                    className="w-full h-10 md:h-12 text-sm md:text-base font-semibold bg-white text-black hover:bg-gray-200 rounded"
                  >
                    {isConvertingHeic ? "Converting HEIC..." : "Run"}
                  </Button>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "space-y-4 md:space-y-8 select-none transition-all duration-700 ease-out delay-300",
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
              )}
            >
              {/* Result Section */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm md:text-lg font-semibold flex items-center gap-2 text-white">
                  <svg className="hidden md:block w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21,15 16,10 5,21" />
                  </svg>
                  Result
                </h3>
                {generatedImage && (
                  <div className="flex gap-1 md:gap-2">
                    <Button
                      onClick={useGeneratedAsInput}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2 bg-transparent border-gray-600 text-white hover:bg-gray-700 flex items-center gap-1"
                      title="Use as Input"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <span className="hidden sm:inline">Use as Input</span>
                    </Button>
                    <Button
                      onClick={copyImageToClipboard}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2 bg-transparent border-gray-600 text-white hover:bg-gray-700 flex items-center gap-1"
                      title="Copy"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v9a2 2 0 01-2 2H5z" />
                      </svg>
                      <span className="hidden sm:inline">Copy</span>
                    </Button>
                    <Button
                      onClick={downloadImage}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2 bg-transparent border-gray-600 text-white hover:bg-gray-700 flex items-center gap-1"
                      title="Download"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  </div>
                )}
              </div>

              <div className="relative h-48 md:h-80 flex items-center justify-center">
                {selectedGeneration?.status === "loading" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center px-4 select-none">
                    <div className="w-full max-w-md">
                      <div
                        className="relative h-4 md:h-8 bg-black/50 border border-gray-600 rounded overflow-hidden mb-4"
                        style={{ zIndex: 30 }}
                      >
                        <div
                          className="absolute inset-0 opacity-20"
                          style={{
                            backgroundImage: `
                              linear-gradient(90deg, transparent 0%, transparent 49%, #333 49%, #333 51%, transparent 51%),
                              linear-gradient(0deg, transparent 0%, transparent 49%, #333 49%, #333 51%, transparent 51%)
                            `,
                            backgroundSize: "8px 8px",
                          }}
                        />

                        <div
                          className="absolute top-0 left-0 h-full transition-all duration-100 ease-out"
                          style={{
                            width: `${selectedGeneration.progress}%`,
                            backgroundImage: `
                              repeating-linear-gradient(
                                90deg,
                                #614B00 0px,
                                #614B00 6px,
                                #735B00 6px,
                                #735B00 8px
                              ),
                              repeating-linear-gradient(
                                0deg,
                                #614B00 0px,
                                #614B00 6px,
                                #735B00 6px,
                                #735B00 8px
                              )
                            `,
                            backgroundSize: "8px 8px",
                          }}
                        />

                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs md:text-sm font-mono text-white/80" style={{ zIndex: 40 }}>
                            {Math.round(selectedGeneration.progress)}%
                          </span>
                        </div>
                      </div>

                      <div className="text-center space-y-2">
                        <p className="text-xs md:text-sm font-medium text-white animate-pulse">Running...</p>
                        <Button
                          onClick={() => cancelGeneration(selectedGeneration.id)}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-3 bg-transparent border-gray-600 text-white hover:bg-gray-700"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : isConvertingHeic ? (
                  <div className="w-full h-full flex flex-col items-center justify-center px-4 select-none">
                    <div className="w-full max-w-md">
                      <div
                        className="relative h-4 md:h-8 bg-black/50 border border-gray-600 rounded overflow-hidden mb-4"
                        style={{ zIndex: 30 }}
                      >
                        <div
                          className="absolute top-0 left-0 h-full transition-all duration-200 ease-out"
                          style={{
                            width: `${heicProgress}%`,
                            backgroundImage: `
                              repeating-linear-gradient(
                                90deg,
                                #614B00 0px,
                                #614B00 6px,
                                #735B00 6px,
                                #735B00 8px
                              ),
                              repeating-linear-gradient(
                                0deg,
                                #614B00 0px,
                                #614B00 6px,
                                #735B00 6px,
                                #735B00 8px
                              )
                            `,
                            backgroundSize: "8px 8px",
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span
                            className="text-xs md:text-sm font-mono text-white/90 font-semibold"
                            style={{ zIndex: 40 }}
                          >
                            {Math.round(heicProgress)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs md:text-sm font-medium text-white/90">Converting HEIC image...</p>
                      </div>
                    </div>
                  </div>
                ) : generatedImage ? (
                  <div className="w-full h-full flex flex-col select-none">
                    <div className="flex-1 flex items-center justify-center max-h-36 md:max-h-64 relative group">
                      <img
                        src={generatedImage.url || "/placeholder.svg"}
                        alt="Generated"
                        className={cn(
                          "max-w-full max-h-full object-contain rounded transition-all duration-700 ease-out",
                          imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
                        )}
                        onLoad={() => {
                          console.log("[v0] Preview image loaded")
                          setImageLoaded(true)
                        }}
                        onClick={openFullscreen}
                      />
                      <button
                        onClick={openFullscreen}
                        className="absolute top-1 right-1 md:top-2 md:right-2 bg-black/70 hover:bg-black/90 text-white p-1 md:p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                        title="View fullscreen"
                      >
                        <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                          />
                        </svg>
                      </button>
                    </div>
                    {generatedImage && (
                      <>
                        <div className="mt-2 md:mt-4 mb-12 md:mb-8 p-3 md:p-3 bg-black/50 border border-gray-600 rounded">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-xs md:text-sm font-semibold text-white">Prompt:</span>
                            {generatedImage.prompt.length > 200 && (
                              <button
                                onClick={() => {
                                  setModalPromptText(generatedImage.prompt)
                                  setShowPromptModal(true)
                                }}
                                className="text-xs text-gray-400 hover:text-white transition-colors flex-shrink-0"
                              >
                                Show more
                              </button>
                            )}
                          </div>
                          <p className="text-xs md:text-sm text-gray-300 break-words whitespace-pre-wrap line-clamp-3">
                            {generatedImage.prompt}
                          </p>
                        </div>

                        <Dialog open={showPromptModal} onOpenChange={setShowPromptModal}>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                            <DialogHeader>
                              <DialogTitle>Full Prompt</DialogTitle>
                              <DialogDescription>Complete image generation prompt</DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto">
                              <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                                {modalPromptText}
                              </p>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t">
                              <Button
                                variant="outline"
                                onClick={() => copyPromptToClipboard(modalPromptText)}
                                className="gap-2"
                              >
                                <Copy className="h-4 w-4" />
                                Copy
                              </Button>
                              <Button onClick={() => setShowPromptModal(false)}>Close</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 select-none">
                    <div className="w-8 h-8 md:w-16 md:h-16 mx-auto mb-3 border border-gray-600 rounded flex items-center justify-center bg-black/50">
                      <svg
                        className="w-4 h-4 md:w-8 md:h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21,15 16,10 5,21" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-400 font-medium py-1 md:py-2">Ready to generate</p>
                  </div>
                )}
              </div>

              {generations.length > 0 && (
                <div className="border-t border-gray-600/50 pt-8 mt-12 md:pt-6 md:mt-8 flex flex-col">
                  <h4 className="text-xs md:text-sm font-medium text-gray-400 mb-3 md:mb-2">History</h4>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent flex-1 items-end mb-1 mt-4">
                    {generations.map((gen, index) => (
                      <button
                        key={gen.id}
                        onClick={() => setSelectedGenerationId(gen.id)}
                        className={cn(
                          "relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded overflow-hidden transition-all",
                          selectedGeneration?.id === gen.id
                            ? "border-2 border-white"
                            : "border border-gray-600 hover:border-gray-500",
                          index === 0 && "animate-in fade-in-0 slide-in-from-left-4 duration-500",
                        )}
                      >
                        {gen.status === "loading" ? (
                          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                            <span className="text-sm md:text-base text-white/90 font-mono font-semibold">
                              {Math.round(gen.progress)}%
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                cancelGeneration(gen.id)
                              }}
                              className="mt-2 text-[10px] px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded border border-white/30 text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : gen.status === "error" ? (
                          <div
                            className="absolute inset-0 bg-red-900/50 flex flex-col items-center justify-center group"
                            title={gen.error || "Failed to generate"}
                          >
                            <svg className="w-6 h-6 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            <span className="text-[10px] text-red-200 mt-1 px-1 text-center">Failed</span>
                          </div>
                        ) : gen.imageUrl ? (
                          <>
                            <img
                              src={gen.imageUrl || "/placeholder.svg"}
                              alt="Generated"
                              className={cn(
                                "w-full h-full object-cover transition-all duration-700 ease-out",
                                gen.thumbnailLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
                              )}
                              loading="lazy"
                              onLoad={() => {
                                setGenerations((prev) =>
                                  prev.map((g) => (g.id === gen.id ? { ...g, thumbnailLoaded: true } : g)),
                                )
                              }}
                            />
                          </>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className={cn(
              "mt-4 md:mt-8 pt-6 md:pt-8 border-t border-gray-600/50 select-none",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            <div className="flex items-center justify-center gap-2 md:gap-3 flex-wrap">
              <a
                href="https://www.threads.com/faizintifada"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs md:text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2"
              >
                <span>follow @faizintifada on threads</span>
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {showFullscreen && fullscreenImageUrl && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8 select-none overflow-hidden"
          onClick={closeFullscreen}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={closeFullscreen}
              className="absolute top-4 right-4 z-10 bg-black/80 hover:bg-black/90 text-white p-2 rounded-full transition-all duration-200"
              title="Close (ESC)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <img
              src={fullscreenImageUrl || "/placeholder.svg"}
              alt="Fullscreen"
              className="max-w-full max-h-[90vh] object-contain mx-auto rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageCombiner
