import { AuthGate } from "@/components/auth-gate"
import { ImageCombiner } from "@/components/image-combiner"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="sr-only">
        <h1>Free AI Image Generator - Open Banana</h1>
        <p>
          Create and edit stunning images with AI. Powered by Nano Banana 2. Generate AI images from text, edit and
          combine multiple images. Free tier available, sign in to generate, instant results.
        </p>
      </div>
      <AuthGate>
        <ImageCombiner />
      </AuthGate>
    </main>
  )
}
