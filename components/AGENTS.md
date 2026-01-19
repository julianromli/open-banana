# components/AGENTS.md

## Package Identity
- **Purpose**: React UI components for Open Banana - Shadcn primitives + custom feature components
- **Primary Tech**: React 19, Radix UI primitives, Shadcn UI (new-york style), Lucide React icons

## Setup & Run
```bash
# Add new Shadcn component
npx shadcn@latest add [component-name]

# Example: add a new card component
npx shadcn@latest add card

# View available components
npx shadcn@latest add --help
```

**Shadcn Config**: `components.json` (root) - Uses `new-york` style, RSC enabled, Tailwind v4

## Directory Structure
```
components/
├── ui/                     # Shadcn UI primitives (auto-generated)
│   ├── button.tsx          # Button with variants
│   ├── dialog.tsx          # Modal dialogs
│   ├── select.tsx          # Dropdown selects
│   └── toast.tsx           # Toast notifications
├── image-combiner.tsx      # Main feature: AI image generation UI
└── theme-provider.tsx      # next-themes provider wrapper
```

## Patterns & Conventions

### Component Organization
| Type | Location | Example |
|------|----------|---------|
| Shadcn primitives | `components/ui/` | `button.tsx`, `dialog.tsx` |
| Feature components | `components/` | `image-combiner.tsx` |
| Providers/Context | `components/` | `theme-provider.tsx` |

### Preferred Patterns

#### ✅ **DO: Use `cn()` for conditional classes**
```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  className
)} />
```

#### ✅ **DO: Use Radix primitives via Shadcn**
```typescript
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog'
```

#### ✅ **DO: Use `cva` for variant props (like Button)**
```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", destructive: "..." },
    size: { default: "...", sm: "...", lg: "..." }
  },
  defaultVariants: { variant: "default", size: "default" }
})
```

#### ✅ **DO: Forward refs for DOM elements**
```typescript
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <button ref={ref} className={cn("...", className)} {...props} />
  )
)
Button.displayName = "Button"
```

#### ✅ **DO: Use `"use client"` for interactive components**
```typescript
"use client"

import { useState } from "react"
// ... component with hooks/state
```

#### ❌ **DON'T: Hardcode colors - use CSS variables**
```typescript
// ❌ Bad
className="bg-black text-white"

// ✅ Good  
className="bg-background text-foreground"
className="bg-primary text-primary-foreground"
```

#### ❌ **DON'T: Put business logic in UI primitives**
```typescript
// ❌ Bad - API call in Button component
// ✅ Good - Keep UI primitives purely presentational
```

### Shadcn Component Reference

**Button variants** (from `components/ui/button.tsx`):
```typescript
variant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
size: "default" | "sm" | "lg" | "icon"
```

**Toast variants** (from `components/ui/toast.tsx`):
```typescript
variant: "default" | "destructive"
```

### Custom Hooks Integration
```typescript
// Toast notifications
import { useToast } from '@/hooks/use-toast'
const { toast } = useToast()
toast({ title: "Success!", description: "Action completed." })

// Mobile detection
import { useMobile } from '@/hooks/use-mobile'
const isMobile = useMobile()
```

## Touch Points / Key Files
| Purpose | File |
|---------|------|
| Shadcn Config | `components.json` (root) |
| Class Utility | `lib/utils.ts` - `cn()` function |
| Button Pattern | `components/ui/button.tsx` - cva + variants |
| Dialog Pattern | `components/ui/dialog.tsx` - Radix composition |
| Toast Hook | `hooks/use-toast.ts` - state management |
| Main Feature | `components/image-combiner.tsx` - complex component |

## JIT Index Hints
```bash
# Find all component exports
rg -n "export (function|const) \w+" components

# Find Shadcn UI components
ls components/ui

# Find Lucide icon imports
rg -n "lucide-react" components

# Find "use client" components
rg -n "^\"use client\"" components

# Find cn() usage
rg -n "cn\(" components

# Find variant definitions
rg -n "variants:" components
```

## Common Gotchas

### Tailwind CSS v4
- Uses `@import "tailwindcss"` syntax (not `@tailwind` directives)
- CSS variables in `@theme inline` block (see `app/globals.css`)
- Custom variant: `@custom-variant dark (&:is(.dark *))`

### Hydration Issues
- Use `next-themes` for theme switching (see `theme-provider.tsx`)
- Wrap theme-dependent UI in `useEffect` or use `suppressHydrationWarning`

### Radix Accessibility
- All Radix primitives include keyboard navigation
- Use `asChild` prop to forward to custom elements:
  ```typescript
  <Button asChild><Link href="/page">Navigate</Link></Button>
  ```

### Icons
- Use Lucide React: `import { Icon } from "lucide-react"`
- Icons in buttons: automatically sized via `[&_svg]:size-4`

## Pre-PR Checks
```bash
# Build validates JSX and prop types
pnpm build

# Manual check: verify responsive design on mobile/desktop
```
