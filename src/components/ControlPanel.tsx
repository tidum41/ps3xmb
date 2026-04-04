import { useRef, useState } from "react"
import { ChevronDown, ChevronRight, Minus, RotateCcw } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerEyeDropper,
  ColorPickerHexDisplay,
} from "@/components/ui/color-picker"
import { cn } from "@/lib/utils"
import type { PS3Params } from "./PS3Canvas"
import { DEFAULT_PARAMS } from "./PS3Canvas"

// ─── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = [
  { name: "Default",   swatch: "#CBCBCB", wave: [0.80, 0.80, 0.82] as [number,number,number], bg: [0.18, 0.18, 0.20] as [number,number,number] },
  { name: "January",   swatch: "#D8BF1A", wave: [0.85, 0.75, 0.10] as [number,number,number], bg: [0.13, 0.11, 0.02] as [number,number,number] },
  { name: "February",  swatch: "#6DB217", wave: [0.43, 0.70, 0.09] as [number,number,number], bg: [0.06, 0.13, 0.02] as [number,number,number] },
  { name: "March",     swatch: "#E17E9A", wave: [0.88, 0.49, 0.60] as [number,number,number], bg: [0.18, 0.07, 0.11] as [number,number,number] },
  { name: "April",     swatch: "#178816", wave: [0.09, 0.53, 0.09] as [number,number,number], bg: [0.02, 0.11, 0.02] as [number,number,number] },
  { name: "May",       swatch: "#9A61C8", wave: [0.60, 0.38, 0.78] as [number,number,number], bg: [0.11, 0.07, 0.17] as [number,number,number] },
  { name: "June",      swatch: "#02CDC7", wave: [0.01, 0.80, 0.78] as [number,number,number], bg: [0.02, 0.13, 0.13] as [number,number,number] },
  { name: "July",      swatch: "#0C76C0", wave: [0.05, 0.46, 0.75] as [number,number,number], bg: [0.02, 0.08, 0.17] as [number,number,number] },
  { name: "August",    swatch: "#B444C0", wave: [0.71, 0.27, 0.75] as [number,number,number], bg: [0.13, 0.05, 0.17] as [number,number,number] },
  { name: "September", swatch: "#E5A708", wave: [0.90, 0.65, 0.03] as [number,number,number], bg: [0.17, 0.11, 0.01] as [number,number,number] },
  { name: "October",   swatch: "#875B1E", wave: [0.53, 0.36, 0.12] as [number,number,number], bg: [0.11, 0.07, 0.02] as [number,number,number] },
  { name: "November",  swatch: "#E3412A", wave: [0.89, 0.25, 0.16] as [number,number,number], bg: [0.19, 0.05, 0.03] as [number,number,number] },
  { name: "December",  swatch: "#111115", wave: [0.13, 0.13, 0.16] as [number,number,number], bg: [0.03, 0.03, 0.05] as [number,number,number] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rgbToHex(rgb: [number, number, number]): string {
  return "#" + rgb.map(v => {
    const h = Math.round(v * 255).toString(16)
    return h.length === 1 ? "0" + h : h
  }).join("")
}
function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ]
}

// ─── Layout constants ─────────────────────────────────────────────────────────
const PANEL_W     = 240
const PILL_W      = 72
const PILL_H      = 32
const EDGE_PAD    = 10
const BODY_BASE_H = 428
const BODY_EFF_H  = 580

const SPRING  = "cubic-bezier(0.16, 1, 0.3, 1)"
const EASE_IN = "cubic-bezier(0.4, 0, 1, 1)"

/**
 * Computes the container box geometry.
 *
 * Key invariant: the header row (PILL_H tall) always renders at pillPos.y on screen.
 * - flipped=false → container top = pillPos.y, body grows DOWNWARD
 * - flipped=true  → container bottom = pillPos.y + PILL_H, body grows UPWARD
 *
 * Because top+height animates with identical easing, the bottom edge stays
 * constant during the flipped close animation, keeping "Menu" perfectly still.
 */
function getGeometry(
  pillPos: { x: number; y: number },
  isOpen: boolean,
  bodyH: number,
  flipped: boolean,
) {
  const vw = window.innerWidth
  const w  = isOpen ? PANEL_W : PILL_W
  const h  = isOpen ? PILL_H + bodyH : PILL_H
  const r  = isOpen ? 12 : PILL_H / 2

  // Right-align panel edge with pill right edge
  const rightEdge = pillPos.x + PILL_W
  const left = Math.max(EDGE_PAD, Math.min(rightEdge - w, vw - w - EDGE_PAD))

  // top: keep header at pillPos.y in both states and both directions
  let top: number
  if (flipped && isOpen) {
    // Container grows upward; bottom = pillPos.y + PILL_H
    top = Math.max(EDGE_PAD, pillPos.y + PILL_H - h)
  } else {
    top = Math.max(EDGE_PAD, pillPos.y)
  }

  return { w, h, r, left, top }
}

/** True when the pill is low enough that the panel should expand upward */
function shouldFlip(pillY: number, bodyH: number) {
  const vh = window.innerHeight
  const spaceBelow = vh - pillY - PILL_H - EDGE_PAD
  const spaceAbove = pillY - EDGE_PAD
  return spaceBelow < bodyH && spaceAbove >= bodyH
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ColorRow({ label, value, onChange }: {
  label: string; value: [number,number,number]; onChange: (v: [number,number,number]) => void
}) {
  const hex = rgbToHex(value)
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] text-white/50 w-[72px] shrink-0">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="h-6 w-6 shrink-0 rounded-md border border-white/20 cursor-pointer hover:scale-105 active:scale-95 transition-transform focus:outline-none"
            style={{ backgroundColor: hex }}
            aria-label={`Pick ${label.toLowerCase()} color`}
          />
        </PopoverTrigger>
        <PopoverContent side="left" sideOffset={10} className="w-52 p-0 overflow-hidden">
          <ColorPicker value={hex} onChange={onChange}>
            <ColorPickerSelection className="h-36 rounded-t-xl" />
            <div className="px-3 py-2.5 space-y-2">
              <ColorPickerHue />
              <div className="flex items-center gap-1.5">
                <ColorPickerEyeDropper />
                <ColorPickerHexDisplay />
              </div>
            </div>
          </ColorPicker>
        </PopoverContent>
      </Popover>
      <input
        type="text"
        value={hex.toUpperCase()}
        onChange={e => { if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) onChange(hexToRgb(e.target.value)) }}
        className="flex-1 min-w-0 h-6 bg-white/5 border border-white/10 rounded px-2 text-[11px] font-mono text-white/60 focus:outline-none focus:border-white/30 focus:text-white/90 transition-colors"
        maxLength={7} spellCheck={false}
      />
    </div>
  )
}

function ControlRow({ label, value, children, className }: {
  label: string; value: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/50">{label}</span>
        <span className="text-[11px] font-mono text-white/30 tabular-nums">{value}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ControlPanel({ params, onChange }: {
  params: PS3Params; onChange: (p: PS3Params) => void
}) {
  const [isOpen,      setIsOpen]      = useState(true)
  const [effectsOpen, setEffectsOpen] = useState(false)
  const [isDragging,  setIsDragging]  = useState(false)

  const [pillPos, setPillPos] = useState(() => ({
    x: window.innerWidth  - PILL_W - 20,
    y: window.innerHeight - PILL_H - 20,
  }))

  // Locked when panel opens; stays constant for the full open→close animation
  const [flipped, setFlipped] = useState(() =>
    shouldFlip(window.innerHeight - PILL_H - 20, BODY_BASE_H)
  )

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const didDrag = useRef(false)

  // ── Derived ───────────────────────────────────────────────────────────────
  const bodyH = effectsOpen ? BODY_EFF_H : BODY_BASE_H
  const geo   = getGeometry(pillPos, isOpen, bodyH, flipped)

  // Arrow direction: points toward where the panel body is (or will be)
  // When closed, preview based on current pill position; when open, use locked flipped value
  const wouldFlip  = shouldFlip(pillPos.y, bodyH)
  const curFlipped = isOpen ? flipped : wouldFlip
  const arrowDeg   = (isOpen !== curFlipped) ? 180 : 0

  const dur    = isOpen ? `280ms ${SPRING}` : `200ms ${EASE_IN}`
  const morphT = isDragging ? "none" : [
    `width ${dur}`,
    `height ${dur}`,
    `border-radius ${isOpen ? `260ms ${SPRING}` : `180ms ${EASE_IN}`}`,
    `left ${dur}`,
    `top ${dur}`,
  ].join(", ")

  // ── Drag ──────────────────────────────────────────────────────────────────
  function startDrag(e: React.PointerEvent, el: HTMLElement) {
    if ((e.target as HTMLElement).closest("button, input, [role=slider]")) return
    e.preventDefault()
    el.setPointerCapture(e.pointerId)
    didDrag.current = false
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pillPos.x, origY: pillPos.y }
    setIsDragging(true)
  }

  function moveDrag(e: React.PointerEvent) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) + Math.abs(dy) > 4) didDrag.current = true
    if (!didDrag.current) return   // don't touch pillPos until threshold crossed

    const vw = window.innerWidth
    const vh = window.innerHeight
    const cw = isOpen ? PANEL_W : PILL_W

    const minX = EDGE_PAD + cw - PILL_W
    const maxX = vw - PILL_W - EDGE_PAD

    // Y bounds depend on which direction the panel currently extends
    let minY: number, maxY: number
    if (!isOpen) {
      minY = EDGE_PAD
      maxY = vh - PILL_H - EDGE_PAD
    } else if (flipped) {
      // Panel extends upward: panel top = pillPos.y - bodyH ≥ EDGE_PAD
      minY = EDGE_PAD + bodyH
      maxY = vh - PILL_H - EDGE_PAD
    } else {
      // Panel extends downward: panel bottom = pillPos.y + PILL_H + bodyH ≤ vh - EDGE_PAD
      minY = EDGE_PAD
      maxY = vh - PILL_H - bodyH - EDGE_PAD
    }

    setPillPos({
      x: Math.max(minX, Math.min(dragRef.current.origX + dx, maxX)),
      y: Math.max(minY, Math.min(dragRef.current.origY + dy, maxY)),
    })
  }

  function endDrag() {
    setIsDragging(false)
    const wasDrag = didDrag.current
    dragRef.current = null
    didDrag.current = false
    if (!wasDrag) {
      if (isOpen) {
        setIsOpen(false)
      } else {
        // Lock expansion direction at the moment of opening
        setFlipped(shouldFlip(pillPos.y, bodyH))
        setIsOpen(true)
      }
    }
  }

  function set<K extends keyof PS3Params>(key: K, val: PS3Params[K]) {
    onChange({ ...params, [key]: val })
  }
  function fmt(n: number, d = 2) { return n.toFixed(d) }

  const activePreset = PRESETS.findIndex(p =>
    p.wave.every((v, i) => Math.abs(v - params.waveColor[i]) < 0.01) &&
    p.bg.every((v, i)   => Math.abs(v - params.bgColor[i])   < 0.01)
  )

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Single morphing container */}
      <div
        style={{
          position:       "fixed",
          left:           geo.left,
          top:            geo.top,
          width:          geo.w,
          height:         geo.h,
          borderRadius:   geo.r,
          overflow:       "hidden",
          zIndex:         50,
          transition:     morphT,
          background:     "rgba(8,8,10,0.97)",
          backdropFilter: "blur(28px) saturate(130%)",
          border:         "1px solid rgba(255,255,255,0.14)",
          boxShadow:      "0 0 0 0.5px rgba(255,255,255,0.07), 0 8px 24px rgba(0,0,0,0.55)",
          touchAction:    "none",
          color:          "white",
          userSelect:     "none",
          display:        "flex",
          // column-reverse puts the header at the bottom so it anchors at pillPos.y
          // when the panel grows upward; header-at-top is the default downward case
          flexDirection:  flipped ? "column-reverse" : "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header — drag handle, always visible ── */}
        <div
          className="relative flex items-center justify-center flex-shrink-0"
          style={{ height: PILL_H, cursor: isDragging ? "grabbing" : "grab" }}
          onPointerDown={e => startDrag(e, e.currentTarget)}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
        >
          {/* Centered: arrow + label — offset left by half the button area to stay optically centred when open */}
          <div
            className="flex items-center gap-1 pointer-events-none select-none"
            style={{ transform: isOpen ? "translateX(-26px)" : "none", transition: isDragging ? "none" : "transform 200ms ease" }}
          >
            <ChevronDown
              className="h-3 w-3 text-white/50 flex-shrink-0"
              style={{
                transform:  `rotate(${arrowDeg}deg)`,
                transition: isDragging ? "none" : "transform 220ms ease-in-out",
              }}
            />
            <span className="text-[11px] font-medium tracking-wide text-white/60">menu</span>
          </div>

          {/* Reset + Minimize — fade out when closed */}
          <div
            className="absolute right-1.5 flex items-center gap-0.5"
            style={{
              opacity:       isOpen ? 1 : 0,
              pointerEvents: isOpen ? "auto" : "none",
              transition:    "opacity 150ms",
            }}
          >
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-white/25 hover:text-white/60 hover:bg-white/8"
              onClick={() => onChange({ ...DEFAULT_PARAMS })}
              title="Reset"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-white/25 hover:text-white/60 hover:bg-white/8"
              onClick={() => setIsOpen(false)}
              title="Minimize"
            >
              <Minus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* ── Panel body — clipped by overflow:hidden when pill-sized ── */}
        <div
          style={{ pointerEvents: isOpen ? "auto" : "none" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Theme swatches */}
          <div className="px-3 pb-2.5">
            <p className="text-[10px] text-white/30 mb-1.5">Theme</p>
            <div className="flex gap-1.5 flex-wrap">
              {PRESETS.map((preset, i) => (
                <button
                  key={preset.name}
                  title={preset.name}
                  onClick={() => onChange({ ...params, waveColor: preset.wave, bgColor: preset.bg })}
                  className={cn(
                    "rounded-full transition-all cursor-pointer flex-shrink-0",
                    activePreset === i
                      ? "ring-2 ring-white/65 ring-offset-1 ring-offset-[#08080a] scale-110"
                      : "opacity-55 hover:opacity-100 hover:scale-110"
                  )}
                  style={{ backgroundColor: preset.swatch, width: 18, height: 18 }}
                />
              ))}
            </div>
          </div>

          <Separator className="bg-white/8" />

          {/* Colors */}
          <div className="px-3 py-3 space-y-2.5">
            <ColorRow label="Wave"       value={params.waveColor} onChange={v => set("waveColor", v)} />
            <ColorRow label="Background" value={params.bgColor}   onChange={v => set("bgColor", v)} />
          </div>

          <Separator className="bg-white/8" />

          {/* Wave controls */}
          <div className="px-3 py-2.5 space-y-3">
            <ControlRow label="Intensity" value={fmt(params.intensity)}>
              <Slider min={0} max={4} step={0.01} value={[params.intensity]}
                onValueChange={([v]) => set("intensity", v)} />
            </ControlRow>
            <ControlRow label="Speed" value={fmt(params.speed)}>
              <Slider min={0.05} max={3} step={0.05} value={[params.speed]}
                onValueChange={([v]) => set("speed", v)} />
            </ControlRow>
            <ControlRow label="Y offset" value={`${Math.round(params.yOffset)}px`}>
              <Slider min={-200} max={200} step={1} value={[params.yOffset]}
                onValueChange={([v]) => set("yOffset", v)} />
            </ControlRow>
          </div>

          <Separator className="bg-white/8" />

          {/* Cursor */}
          <div className="px-3 py-2.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/50">Cursor</span>
              <Switch checked={params.mouseEnabled} onCheckedChange={v => set("mouseEnabled", v)} />
            </div>
            <ControlRow
              label="Reactivity"
              value={fmt(params.mouseStrength, 3)}
              className={cn(!params.mouseEnabled && "opacity-30 pointer-events-none")}
            >
              <Slider min={0} max={0.3} step={0.005} value={[params.mouseStrength]}
                disabled={!params.mouseEnabled}
                onValueChange={([v]) => set("mouseStrength", v)} />
            </ControlRow>
          </div>

          <Separator className="bg-white/8" />

          {/* Effects */}
          <button
            className="flex w-full items-center justify-between px-3 py-2.5 text-[11px] text-white/35 hover:text-white/65 transition-colors cursor-pointer"
            onClick={() => setEffectsOpen(o => !o)}
          >
            <span>Effects</span>
            {effectsOpen
              ? <ChevronDown  className="h-3 w-3" />
              : <ChevronRight className="h-3 w-3" />
            }
          </button>

          {effectsOpen && (
            <div className="px-3 pb-3 space-y-3">
              <ControlRow label="Halftone" value={fmt(params.halftone)}>
                <Slider min={0} max={1} step={0.01} value={[params.halftone]}
                  onValueChange={([v]) => set("halftone", v)} />
              </ControlRow>
              <ControlRow
                label="Dot size"
                value={`${fmt(params.halftoneSize, 1)}px`}
                className={cn(params.halftone === 0 && "opacity-30")}
              >
                <Slider min={2} max={18} step={0.5} value={[params.halftoneSize]}
                  onValueChange={([v]) => set("halftoneSize", v)} />
              </ControlRow>
              <Separator className="bg-white/8" />
              <ControlRow label="Film grain" value={fmt(params.grain)}>
                <Slider min={0} max={1} step={0.01} value={[params.grain]}
                  onValueChange={([v]) => set("grain", v)} />
              </ControlRow>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
