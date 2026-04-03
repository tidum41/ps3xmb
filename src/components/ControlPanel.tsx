import { useRef, useState } from "react"
import Color from "color"
import { ChevronDown, ChevronRight, RotateCcw, Minus } from "lucide-react"
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

// ─── PS3 month presets ────────────────────────────────────────────────────────
const PS3_PRESETS = [
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

// ─── Color helpers ─────────────────────────────────────────────────────────────
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

// ─── ColorRow — swatch (→ popover picker) + hex text field ───────────────────
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
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-white/50 w-6 shrink-0">{label}</span>

      {/* Swatch → popover full HSL picker */}
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

      {/* Manual hex text entry */}
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

// ─── Main component ────────────────────────────────────────────────────────────
interface Props {
  params: PS3Params
  onChange: (p: PS3Params) => void
}

export default function ControlPanel({ params, onChange }: Props) {
  const [minimized, setMinimized] = useState(false)
  const [effectsOpen, setEffectsOpen] = useState(false)

  // Draggable pill position (bottom-right start)
  const [pillPos, setPillPos] = useState(() => ({
    x: window.innerWidth - 90,
    y: window.innerHeight - 40,
  }))
  const dragState = useRef<{
    startX: number; startY: number; origX: number; origY: number
  } | null>(null)

  function onPillPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pillPos.x,
      origY: pillPos.y,
    }
  }
  function onPillPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    setPillPos({ x: dragState.current.origX + dx, y: dragState.current.origY + dy })
  }
  function onPillPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragState.current) return
    const moved = Math.abs(e.clientX - dragState.current.startX) +
                  Math.abs(e.clientY - dragState.current.startY)
    if (moved < 5) setMinimized(false) // treat as click
    dragState.current = null
  }

  function set<K extends keyof PS3Params>(key: K, val: PS3Params[K]) {
    onChange({ ...params, [key]: val })
  }

  function fmt(n: number, d = 2) { return n.toFixed(d) }

  const activePreset = PS3_PRESETS.findIndex(p =>
    p.wave.every((v, i) => Math.abs(v - params.waveColor[i]) < 0.01) &&
    p.bg.every((v, i) => Math.abs(v - params.bgColor[i]) < 0.01)
  )

  // ── Minimized pill (draggable) ────────────────────────────────────────────
  if (minimized) {
    return (
      <button
        onPointerDown={onPillPointerDown}
        onPointerMove={onPillPointerMove}
        onPointerUp={onPillPointerUp}
        className="fixed z-50 flex items-center gap-1.5 px-3 h-8 rounded-full border border-white/10 bg-zinc-950/85 backdrop-blur-xl text-white/50 text-[11px] hover:text-white/80 hover:bg-zinc-900/90 transition-colors select-none cursor-grab active:cursor-grabbing"
        style={{
          left: pillPos.x,
          top: pillPos.y,
          animation: "fadeIn 150ms ease both",
          touchAction: "none",
        }}
      >
        <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(0.92) } to { opacity:1; transform:scale(1) } }`}</style>
        <span className="opacity-40 text-[10px]">〰</span>
        Menu
      </button>
    )
  }

  // ── Full panel ────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed bottom-5 right-5 w-60 z-50"
      style={{ animation: "slideUp 180ms cubic-bezier(0.16,1,0.3,1) both" }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateY(6px) }
          to   { opacity:1; transform:translateY(0) }
        }
      `}</style>

      <div className="rounded-xl border border-white/10 bg-zinc-950/92 shadow-2xl backdrop-blur-xl overflow-hidden text-white">

        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
          <span className="text-[11px] font-medium text-white/60 tracking-wide">PS3 Silk</span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-white/25 hover:text-white/60 hover:bg-white/8"
              onClick={() => onChange({ ...DEFAULT_PARAMS })}
              title="Reset to defaults"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-white/25 hover:text-white/60 hover:bg-white/8"
              onClick={() => setMinimized(true)}
              title="Minimize"
            >
              <Minus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Theme swatches */}
        <div className="px-3 pb-2.5">
          <p className="text-[10px] text-white/30 mb-1.5">Theme</p>
          <div className="flex gap-1.5 flex-wrap">
            {PS3_PRESETS.map((preset, i) => (
              <button
                key={preset.name}
                title={preset.name}
                onClick={() => onChange({ ...params, waveColor: preset.wave, bgColor: preset.bg })}
                className={cn(
                  "h-4.5 w-4.5 rounded-full transition-all cursor-pointer flex-shrink-0",
                  activePreset === i
                    ? "ring-2 ring-white/65 ring-offset-1 ring-offset-zinc-950 scale-115"
                    : "opacity-55 hover:opacity-100 hover:scale-110"
                )}
                style={{ backgroundColor: preset.swatch, width: 18, height: 18 }}
              />
            ))}
          </div>
        </div>

        <Separator className="bg-white/8" />

        {/* Color rows */}
        <div className="px-3 py-2.5 space-y-2">
          <ColorRow label="Wave" value={params.waveColor} onChange={v => set("waveColor", v)} />
          <ColorRow label="Bg"   value={params.bgColor}   onChange={v => set("bgColor", v)} />
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
  )
}
