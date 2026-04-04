// Adapted from shadcn color-picker pattern
// Simplified: no alpha, hex-only format output, RGB 0-1 onChange for PS3Params

import Color from "color"
import { PipetteIcon } from "lucide-react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── Context ──────────────────────────────────────────────────────────────────
interface ColorPickerContextValue {
  hue: number
  saturation: number
  lightness: number
  setHue: (h: number) => void
  setSaturation: (s: number) => void
  setLightness: (l: number) => void
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(undefined)

export function useColorPickerCtx() {
  const ctx = useContext(ColorPickerContext)
  if (!ctx) throw new Error("useColorPickerCtx must be used inside <ColorPicker>")
  return ctx
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export type ColorPickerProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  /** Hex string e.g. "#CCCCD1" */
  value?: string
  /** Called with [r, g, b] each 0–1 whenever user changes the color */
  onChange?: (rgb: [number, number, number]) => void
}

export function ColorPicker({
  value = "#808080",
  onChange,
  className,
  children,
  ...props
}: ColorPickerProps) {
  const init = Color(value).hsl()
  const [hue, setHueState] = useState(init.hue())
  const [saturation, setSatState] = useState(init.saturationl())
  const [lightness, setLightState] = useState(init.lightness())

  // Sync when value prop changes from outside
  useEffect(() => {
    try {
      const c = Color(value).hsl()
      setHueState(c.hue())
      setSatState(c.saturationl())
      setLightState(c.lightness())
    } catch { /* ignore invalid */ }
  }, [value])

  function setHue(h: number) {
    setHueState(h)
    emit(h, saturation, lightness)
  }
  function setSaturation(s: number) {
    setSatState(s)
    emit(hue, s, lightness)
  }
  function setLightness(l: number) {
    setLightState(l)
    emit(hue, saturation, l)
  }

  function emit(h: number, s: number, l: number) {
    if (!onChange) return
    const [r, g, b] = Color.hsl(h, s, l).rgb().array()
    onChange([r / 255, g / 255, b / 255])
  }

  return (
    <ColorPickerContext.Provider value={{ hue, saturation, lightness, setHue, setSaturation, setLightness }}>
      <div className={cn("flex flex-col", className)} {...props}>
        {children}
      </div>
    </ColorPickerContext.Provider>
  )
}

// ─── Selection gradient ────────────────────────────────────────────────────────
export const ColorPickerSelection = memo(function ColorPickerSelection({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const { hue, saturation, lightness, setSaturation, setLightness } = useColorPickerCtx()

  // Derive crosshair position from HSL
  const posX = saturation / 100
  // Invert: top-left is white (high lightness, low sat), bottom is black (low lightness)
  // At full saturation, top = 50% lightness, bottom = 0%. We approximate:
  const posY = 1 - lightness / 50 // rough inverse; clamped below

  const background = `
    linear-gradient(0deg, #000, transparent),
    linear-gradient(90deg, #fff, transparent),
    hsl(${hue}, 100%, 50%)
  `

  const updateFromPointer = useCallback(
    (e: PointerEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      const s = x * 100
      // Compute lightness: top-left=100%, top-right=50%, bottom=0%
      const topL = 100 - x * 50
      const l = topL * (1 - y)
      setSaturation(s)
      setLightness(l)
    },
    [setSaturation, setLightness]
  )

  useEffect(() => {
    if (!isDragging) return
    function onMove(e: PointerEvent) { updateFromPointer(e) }
    function onUp() { setIsDragging(false) }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [isDragging, updateFromPointer])

  return (
    <div
      ref={containerRef}
      className={cn("relative cursor-crosshair select-none", className)}
      style={{ background }}
      onPointerDown={e => {
        e.preventDefault()
        setIsDragging(true)
        updateFromPointer(e.nativeEvent)
      }}
      {...props}
    >
      <div
        className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
        style={{
          left: `${posX * 100}%`,
          top: `${Math.max(0, Math.min(1, posY)) * 100}%`,
        }}
      />
    </div>
  )
})

// ─── Hue rail ─────────────────────────────────────────────────────────────────
export function ColorPickerHue({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  const { hue, setHue } = useColorPickerCtx()

  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-4 w-full touch-none select-none items-center", className)}
      min={0}
      max={360}
      step={1}
      value={[hue]}
      onValueChange={([h]) => setHue(h)}
      {...props}
    >
      <SliderPrimitive.Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)]">
        <SliderPrimitive.Range className="absolute h-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 cursor-grab rounded-full border-2 border-white bg-white shadow-md focus-visible:outline-none active:cursor-grabbing" />
    </SliderPrimitive.Root>
  )
}

// ─── Eyedropper ───────────────────────────────────────────────────────────────
export function ColorPickerEyeDropper({ className, ...props }: ComponentProps<typeof Button>) {
  const { setHue, setSaturation, setLightness } = useColorPickerCtx()

  async function handleClick() {
    try {
      // @ts-expect-error — EyeDropper API is experimental
      const result = await new EyeDropper().open()
      const c = Color(result.sRGBHex).hsl()
      setHue(c.hue())
      setSaturation(c.saturationl())
      setLightness(c.lightness())
    } catch { /* cancelled or unsupported */ }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      onClick={handleClick}
      className={cn("h-7 w-7 shrink-0 text-white/40 hover:text-white/80 hover:bg-white/8", className)}
      {...props}
    >
      <PipetteIcon size={14} />
    </Button>
  )
}

// ─── Hex display ──────────────────────────────────────────────────────────────
export function ColorPickerHexDisplay({
  className,
  ...props
}: HTMLAttributes<HTMLInputElement>) {
  const { hue, saturation, lightness } = useColorPickerCtx()
  const hex = Color.hsl(hue, saturation, lightness).hex()

  return (
    <input
      readOnly
      type="text"
      value={hex.toUpperCase()}
      className={cn(
        "flex-1 min-w-0 h-7 bg-white/5 border border-white/10 rounded px-2 text-[11px] font-mono text-white/60 focus:outline-none select-all cursor-text",
        className
      )}
      {...props}
    />
  )
}
