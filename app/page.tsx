import { ImageCombiner } from "@/components/image-combiner"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="sr-only">
        <h1>Free AI Image Generator - Open Banana</h1>
        <p>
          Create and edit stunning images with AI. Powered by Gemini 2.5 Flash. Generate AI images from text, edit and
          combine multiple images. Free, no signup required, instant results.
        </p>
      </div>
      <ImageCombiner />
    </main>
  )
}
