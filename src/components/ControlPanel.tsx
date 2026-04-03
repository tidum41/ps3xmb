import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronRight, ChevronUp, RotateCcw } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
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

// ─── Month presets ────────────────────────────────────────────────────────────
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

// Compute where to place the panel so it stays fully in-viewport.
// The transform-origin is set to the corner nearest the pill so the spring
// open animation grows from the right place.
const PANEL_W  = 240
// Use the tallest possible state (effects expanded) so we never clip
const PANEL_H  = 610
const PILL_W   = 72
const PILL_H   = 32
const GAP      = 8
const EDGE_PAD = 10 // guaranteed clearance from every viewport edge

function computePanelLayout(pill: { x: number; y: number }) {
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Horizontal: place panel on whichever side has more room
  const roomRight = vw - (pill.x + PILL_W + GAP)
  const roomLeft  = pill.x - GAP
  const onLeft    = roomLeft > roomRight && roomLeft >= PANEL_W
  const rawLeft   = onLeft
    ? pill.x - PANEL_W - GAP
    : pill.x + PILL_W + GAP
  const panelLeft = Math.max(EDGE_PAD, Math.min(rawLeft, vw - PANEL_W - EDGE_PAD))

  // Vertical: anchor top to pill, shift up if it would clip bottom
  const rawTop   = pill.y
  const panelTop = Math.max(EDGE_PAD, Math.min(rawTop, vh - PANEL_H - EDGE_PAD))

  // transform-origin — corner closest to the pill
  const ox = onLeft ? "right" : "left"
  const oy = pill.y > vh * 0.6 ? "bottom" : "top"

  return {
    left: panelLeft,
    top:  panelTop,
    transformOrigin: `${ox} ${oy}`,
  }
}

// ─── ColorRow ─────────────────────────────────────────────────────────────────
function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: [number, number, number]
  onChange: (v: [number, number, number]) => void
}) {
  const hex = rgbToHex(value)
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] text-white/50 w-[72px] shrink-0">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="h-6 w-6 shrink-0 rounded-md border border-white/20 cursor-pointer hover:scale-105 active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
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
        onChange={e => {
          const v = e.target.value
          if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(hexToRgb(v))
        }}
        className="flex-1 min-w-0 h-6 bg-white/5 border border-white/10 rounded px-2 text-[11px] font-mono text-white/60 focus:outline-none focus:border-white/30 focus:text-white/90 transition-colors"
        maxLength={7}
        spellCheck={false}
      />
    </div>
  )
}

// ─── ControlRow ────────────────────────────────────────────────────────────────
function ControlRow({
  label,
  value,
  children,
  className,
}: {
  label: string
  value: string
  children: React.ReactNode
  className?: string
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

// ─── Main ─────────────────────────────────────────────────────────────────────
type PanelState = "open" | "closing" | "closed"

interface Props {
  params: PS3Params
  onChange: (p: PS3Params) => void
}

export default function ControlPanel({ params, onChange }: Props) {
  const [panelState, setPanelState] = useState<PanelState>("open")
  const [effectsOpen, setEffectsOpen] = useState(false)

  // Pill position — starts bottom-right
  const [pillPos, setPillPos] = useState(() => ({
    x: window.innerWidth  - PILL_W  - 20,
    y: window.innerHeight - PILL_H - 20,
  }))

  // Snapshot of pill position at open time (so panel doesn't jump if pill is dragged while open)
  const [openPos, setOpenPos] = useState(pillPos)

  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  // ── State machine helpers ──────────────────────────────────────────────
  function openPanel() {
    setOpenPos(pillPos)
    setPanelState("open")
  }

  const closePanel = useCallback(() => {
    setPanelState("closing")
    // closing animation is 160ms (ease-in), then unmount
    setTimeout(() => setPanelState("closed"), 160)
  }, [])

  // ── Draggable pill ─────────────────────────────────────────────────────
  function onPillPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = {
      startX: e.clientX, startY: e.clientY,
      origX: pillPos.x,  origY: pillPos.y,
    }
  }
  function onPillPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    const rawX = dragState.current.origX + dx
    const rawY = dragState.current.origY + dy
    // Clamp so the pill always stays within EDGE_PAD of every viewport edge
    const clampedX = Math.max(EDGE_PAD, Math.min(rawX, window.innerWidth  - PILL_W - EDGE_PAD))
    const clampedY = Math.max(EDGE_PAD, Math.min(rawY, window.innerHeight - PILL_H - EDGE_PAD))
    setPillPos({ x: clampedX, y: clampedY })
  }
  function onPillPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragState.current) return
    const moved = Math.abs(e.clientX - dragState.current.startX) +
                  Math.abs(e.clientY - dragState.current.startY)
    dragState.current = null
    if (moved < 5) openPanel()
  }

  function set<K extends keyof PS3Params>(key: K, val: PS3Params[K]) {
    onChange({ ...params, [key]: val })
  }
  function fmt(n: number, d = 2) { return n.toFixed(d) }

  const activePreset = PRESETS.findIndex(p =>
    p.wave.every((v, i) => Math.abs(v - params.waveColor[i]) < 0.01) &&
    p.bg.every((v, i)   => Math.abs(v - params.bgColor[i])   < 0.01)
  )

  const layout = computePanelLayout(openPos)

  // ── Closed / pill view ────────────────────────────────────────────────
  if (panelState === "closed") {
    return (
      <button
        onPointerDown={onPillPointerDown}
        onPointerMove={onPillPointerMove}
        onPointerUp={onPillPointerUp}
        className="fixed z-50 flex items-center gap-1.5 px-3 h-8 rounded-full border border-white/10 bg-black/55 backdrop-blur-xl text-white/50 text-[11px] hover:text-white/80 hover:bg-black/70 transition-colors select-none cursor-grab active:cursor-grabbing"
        style={{
          left: pillPos.x,
          top:  pillPos.y,
          touchAction: "none",
          animation: "pillIn 200ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        <style>{`
          @keyframes pillIn {
            from { opacity: 0; transform: scale(0.8); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}</style>
        <ChevronUp className="h-3 w-3 opacity-50" />
        Menu
      </button>
    )
  }

  // ── Open / closing panel ─────────────────────────────────────────────
  const isClosing = panelState === "closing"

  return (
    <>
      {/* Click-outside backdrop — sits above canvas, below panel */}
      <div
        className="fixed inset-0 z-40"
        onClick={closePanel}
        aria-hidden="true"
      />

      <style>{`
        @keyframes panelOpen {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes panelClose {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.88); }
        }
        @keyframes pillIn {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        className="fixed z-50 w-60"
        style={{
          left:            layout.left,
          top:             layout.top,
          transformOrigin: layout.transformOrigin,
          animation: isClosing
            ? "panelClose 160ms cubic-bezier(0.4,0,1,1) both"
            : "panelOpen  220ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
        // Prevent clicks inside panel from bubbling to the backdrop
        onClick={e => e.stopPropagation()}
      >
        {/* Glass card */}
        <div className="rounded-xl border border-white/[0.14] overflow-hidden text-white" style={{ background: "rgba(8,8,10,0.96)", backdropFilter: "blur(24px) saturate(120%)", boxShadow: "0 0 0 0.5px rgba(255,255,255,0.07), 0 12px 40px rgba(0,0,0,0.85)" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
            <span className="text-[11px] font-medium text-white/55 tracking-wide">Menu</span>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 text-white/25 hover:text-white/60 hover:bg-white/8"
                onClick={() => onChange({ ...DEFAULT_PARAMS })}
                title="Reset to defaults"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              {/* Arrow toggle — points down when open (click to close) */}
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 text-white/25 hover:text-white/60 hover:bg-white/8"
                onClick={closePanel}
                title="Minimize"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>

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
                      ? "ring-2 ring-white/65 ring-offset-1 ring-offset-black/70 scale-110"
                      : "opacity-55 hover:opacity-100 hover:scale-110"
                  )}
                  style={{ backgroundColor: preset.swatch, width: 18, height: 18 }}
                />
              ))}
            </div>
          </div>

          <Separator className="bg-white/8" />

          {/* Color rows */}
          <div className="px-3 py-3 space-y-2.5">
            <ColorRow label="Wave"       value={params.waveColor} onChange={v => set("waveColor", v)} />
            <ColorRow label="Background" value={params.bgColor}   onChange={v => set("bgColor", v)} />
          </div>

          <Separator className="bg-white/8" />

          {/* Wave controls */}
          <div className="px-3 py-2.5 space-y-3">
            <ControlRow label="Intensity" value={fmt(params.intensity)}>
              <Slider min={0} max={1} step={0.01} value={[params.intensity]}
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
          <Collapsible open={effectsOpen} onOpenChange={setEffectsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between px-3 py-2.5 text-[11px] text-white/35 hover:text-white/65 transition-colors cursor-pointer">
                <span>Effects</span>
                {effectsOpen
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronRight className="h-3 w-3" />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
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
            </CollapsibleContent>
          </Collapsible>

        </div>
      </div>
    </>
  )
}
