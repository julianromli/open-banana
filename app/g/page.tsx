import { AuthGate } from "@/components/auth-gate"
import ImageCombiner from "@/components/image-combiner"

export default function GPage() {
  return (
    <AuthGate>
      <ImageCombiner />
    </AuthGate>
  )
}
