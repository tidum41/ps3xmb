import { useRef, useState, useCallback } from "react"
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react"
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

// ─── Layout ───────────────────────────────────────────────────────────────────
const PANEL_W  = 240
const PANEL_H  = 610  // tallest possible (effects expanded)
const PILL_W   = 72
const PILL_H   = 32
const GAP      = 6
const EDGE_PAD = 10

/**
 * Compute where the panel body should appear relative to the pill button.
 * The pill stays put — the body grows from its nearest corner.
 */
function computeBodyLayout(pill: { x: number; y: number }) {
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Horizontal: right-align with pill's right edge if pill is on right side,
  // left-align with pill's left edge if on left — keeps panel flush with button
  const onRight = pill.x + PILL_W / 2 > vw / 2
  const rawLeft = onRight
    ? pill.x + PILL_W - PANEL_W      // right-align
    : pill.x                          // left-align
  const panelLeft = Math.max(EDGE_PAD, Math.min(rawLeft, vw - PANEL_W - EDGE_PAD))

  // Vertical: prefer below, flip above if more room up there
  const roomBelow = vh - (pill.y + PILL_H + GAP) - EDGE_PAD
  const roomAbove = pill.y - GAP - EDGE_PAD
  const goAbove   = roomBelow < PANEL_H && roomAbove >= roomBelow
  const rawTop    = goAbove
    ? pill.y - PANEL_H - GAP
    : pill.y + PILL_H + GAP
  const panelTop  = Math.max(EDGE_PAD, Math.min(rawTop, vh - PANEL_H - EDGE_PAD))

  // transform-origin: corner nearest the pill so the spring opens from there
  const ox = onRight ? "right" : "left"
  const oy = goAbove  ? "bottom" : "top"

  return { left: panelLeft, top: panelTop, transformOrigin: `${ox} ${oy}`, goAbove }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ColorRow({
  label, value, onChange,
}: { label: string; value: [number,number,number]; onChange: (v: [number,number,number]) => void }) {
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
        maxLength={7}
        spellCheck={false}
      />
    </div>
  )
}

function ControlRow({
  label, value, children, className,
}: { label: string; value: string; children: React.ReactNode; className?: string }) {
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

export default function ControlPanel({
  params,
  onChange,
}: {
  params: PS3Params
  onChange: (p: PS3Params) => void
}) {
  const [panelState, setPanelState]   = useState<PanelState>("open")
  const [effectsOpen, setEffectsOpen] = useState(false)

  // The pill button is the single persistent anchor; everything keys off its position
  const [pillPos, setPillPos] = useState(() => ({
    x: window.innerWidth  - PILL_W  - 20,
    y: window.innerHeight - PILL_H  - 20,
  }))

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const didDrag = useRef(false)

  // ── Toggle ────────────────────────────────────────────────────────────
  const openPanel  = useCallback(() => setPanelState("open"), [])
  const closePanel = useCallback(() => {
    setPanelState("closing")
    setTimeout(() => setPanelState("closed"), 160)
  }, [])
  const togglePanel = useCallback(() => {
    setPanelState(s => {
      if (s === "closed") return "open"
      // trigger close anim
      setTimeout(() => setPanelState("closed"), 160)
      return "closing"
    })
  }, [])

  // ── Pill drag (works in all states) ──────────────────────────────────
  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    didDrag.current = false
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pillPos.x, origY: pillPos.y }
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) + Math.abs(dy) > 4) didDrag.current = true
    const x = Math.max(EDGE_PAD, Math.min(dragRef.current.origX + dx, window.innerWidth  - PILL_W - EDGE_PAD))
    const y = Math.max(EDGE_PAD, Math.min(dragRef.current.origY + dy, window.innerHeight - PILL_H - EDGE_PAD))
    setPillPos({ x, y })
  }
  function onPointerUp() {
    dragRef.current = null
    if (!didDrag.current) togglePanel()
    didDrag.current = false
  }

  function set<K extends keyof PS3Params>(key: K, val: PS3Params[K]) {
    onChange({ ...params, [key]: val })
  }
  function fmt(n: number, d = 2) { return n.toFixed(d) }

  const activePreset = PRESETS.findIndex(p =>
    p.wave.every((v, i) => Math.abs(v - params.waveColor[i]) < 0.01) &&
    p.bg.every((v, i)   => Math.abs(v - params.bgColor[i])   < 0.01)
  )

  const isOpen    = panelState !== "closed"
  const isClosing = panelState === "closing"
  const body      = computeBodyLayout(pillPos)

  return (
    <>
      <style>{`
        @keyframes panelOpen {
          from { opacity: 0; transform: scale(0.86); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes panelClose {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.86); }
        }
        @keyframes pillIn {
          from { opacity: 0; transform: scale(0.82); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Click-outside backdrop — above canvas, below everything else */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={closePanel} aria-hidden="true" />
      )}

      {/* Panel body — rendered adjacent to the pill, follows it live */}
      {isOpen && (
        <div
          className="fixed z-50 w-60"
          style={{
            left:            body.left,
            top:             body.top,
            transformOrigin: body.transformOrigin,
            animation: isClosing
              ? "panelClose 160ms cubic-bezier(0.4,0,1,1) both"
              : "panelOpen  220ms cubic-bezier(0.34,1.56,0.64,1) both",
          }}
          onClick={e => e.stopPropagation()}
        >
          <div
            className="rounded-xl border border-white/[0.14] overflow-hidden text-white"
            style={{
              background:       "rgba(8,8,10,0.96)",
              backdropFilter:   "blur(24px) saturate(120%)",
              boxShadow:        "0 0 0 0.5px rgba(255,255,255,0.07), 0 12px 40px rgba(0,0,0,0.85)",
            }}
          >
            {/* Panel top bar — reset only; arrow is on the pill */}
            <div className="flex items-center justify-end px-3 pt-2 pb-1.5">
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 text-white/25 hover:text-white/60 hover:bg-white/8"
                onClick={() => onChange({ ...DEFAULT_PARAMS })}
                title="Reset to defaults"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
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
      )}

      {/* Persistent pill button — always in place, arrow flips on open/close */}
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={cn(
          "fixed z-50 flex items-center gap-1.5 px-3 h-8 rounded-full border select-none",
          "transition-colors duration-150 touch-none",
          isOpen
            ? "border-white/20 bg-black/80 backdrop-blur-xl text-white/70 hover:text-white/90"
            : "border-white/10 bg-black/55 backdrop-blur-xl text-white/50 hover:text-white/80 hover:bg-black/70",
          didDrag.current ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{
          left:        pillPos.x,
          top:         pillPos.y,
          touchAction: "none",
          // Only animate in from closed; no re-animation on re-renders
          animation: panelState === "closed" ? undefined : undefined,
        }}
      >
        <ChevronDown
          className="h-3 w-3 transition-transform duration-200 ease-in-out"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
        Menu
      </button>
    </>
  )
}
