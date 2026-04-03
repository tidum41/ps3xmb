import { useEffect, useRef } from "react"

export interface PS3Params {
  intensity: number
  speed: number
  mouseStrength: number
  mouseEnabled: boolean
  yOffset: number
  bgColor: [number, number, number]
  waveColor: [number, number, number]
  halftone: number
  halftoneSize: number
  grain: number
}

export const DEFAULT_PARAMS: PS3Params = {
  intensity: 0.7,
  speed: 1.0,
  mouseStrength: 0.11,
  mouseEnabled: true,
  yOffset: 0,
  bgColor: [0.18, 0.18, 0.20],
  waveColor: [0.80, 0.80, 0.82],
  halftone: 0,
  halftoneSize: 6,
  grain: 0,
}

const VS = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FS = `
precision highp float;

uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uMouse;
uniform float uIntensity;
uniform float uMouseStrength;
uniform float uAspect;
uniform float uYOffsetPx;
uniform float uSpeed;

uniform vec3  uBgColor;
uniform vec3  uWaveColor;

uniform float uGrain;
uniform float uHalftone;
uniform float uHalftoneSize;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

float wave(
  vec2 uv, float uvx, float speed, float freq, float amp,
  float phase, float cy, float width, float sharp, bool flip
) {
  float md     = length(uv - uMouse);
  float mnudge = smoothstep(0.45, 0.0, md) * uMouseStrength;
  float angle  = uTime * uSpeed * speed * freq * -1.0 + (phase + uvx + mnudge) * 2.0;
  float wy     = sin(angle) * amp + cy;
  float dy     = wy - uv.y;
  float dist   = abs(dy);

  if (flip) {
    if (dy > 0.0) dist *= 4.0;
  } else {
    if (dy < 0.0) dist *= 4.0;
  }

  float s = smoothstep(width * 1.5, 0.0, dist);
  return pow(s, sharp);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  uv.y += uYOffsetPx / uResolution.y;

  float aspectScale = uAspect / 2.414;
  float uvx = uv.x * aspectScale;

  // Accumulate white ribbon mask (0–1)
  float c = 0.0;
  c += wave(uv, uvx, 0.18, 0.22, 0.32, 0.00, 0.53, 0.090, 14.0, false);
  c += wave(uv, uvx, 0.38, 0.42, 0.24, 0.00, 0.51, 0.085, 16.0, false);
  c += wave(uv, uvx, 0.28, 0.62, 0.20, 0.00, 0.50, 0.042, 22.0, false);
  c += wave(uv, uvx, 0.12, 0.18, 0.14, 0.00, 0.49, 0.065, 18.0, false);
  c += wave(uv, uvx, 0.14, 0.28, 0.14, 0.00, 0.51, 0.095, 15.0, true);
  c += wave(uv, uvx, 0.33, 0.39, 0.11, 0.00, 0.50, 0.088, 17.0, true);
  c += wave(uv, uvx, 0.48, 0.50, 0.09, 0.00, 0.49, 0.040, 24.0, true);
  c += wave(uv, uvx, 0.22, 0.57, 0.08, 0.00, 0.48, 0.160, 14.0, true);
  c = clamp(c, 0.0, 1.0);

  // Background: dark base with subtle radial depth gradient
  // Mimics the PS3's per-theme background texture gradient files
  float depth = 1.0 - pow(length((uv - vec2(0.5, 0.42)) * vec2(0.75, 1.1)), 1.6) * 0.45;
  depth = clamp(depth, 0.55, 1.0);
  vec3 finalColor = uBgColor * depth;

  // Soft ambient light cast by the wave back onto the dark background
  finalColor += uBgColor * c * 0.12;

  // Fresnel-inspired silk edge brightening (PS3 Fresnel luminescence effect)
  // pow(1-c, n)*c peaks near wave edges (c≈0.35), falls off at center and background
  float fresnel = pow(1.0 - c, 2.5) * c * 5.0;
  fresnel = clamp(fresnel, 0.0, 1.0);

  // Isolated wave contribution so halftone can target it without affecting the bg
  vec3 waveContrib = uWaveColor * c * uIntensity
                   + uWaveColor * fresnel * uIntensity * 0.35;

  // Halftone dot grid — wave ribbons only, background stays smooth
  if (uHalftone > 0.0) {
    vec2  cell   = floor(gl_FragCoord.xy / uHalftoneSize);
    vec2  center = (cell + 0.5) * uHalftoneSize;
    float d      = length(gl_FragCoord.xy - center);
    float lum    = dot(waveContrib, vec3(0.299, 0.587, 0.114));
    float radius = uHalftoneSize * 0.5 * lum;
    float dotVal = smoothstep(radius + 0.8, radius - 0.8, d);
    waveContrib  = mix(waveContrib, dotVal * uWaveColor * uIntensity, uHalftone);
  }

  finalColor += waveContrib;

  // Film grain
  if (uGrain > 0.0) {
    float g = (rand(uv + fract(uTime * 0.07)) * 2.0 - 1.0) * uGrain * 0.055;
    finalColor += vec3(g);
  }

  // Triangular-PDF dither — eliminates 8-bit color banding in dark gradients
  float r1 = rand(gl_FragCoord.xy + vec2(uTime * 0.013, 0.0));
  float r2 = rand(gl_FragCoord.xy + vec2(0.0, uTime * 0.017));
  float dither = (r1 + r2 - 1.0) / 255.0;
  finalColor = clamp(finalColor + dither, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, 1.0);
}
`

function compileShader(gl: WebGLRenderingContext, src: string, type: number) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  return s
}

export default function PS3Canvas(props: PS3Params) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef(props)

  useEffect(() => { liveRef.current = props })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl")
    if (!gl) return

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 }
    let rafId: number

    function resize() {
      if (!canvas || !gl) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    function onMouseMove(e: MouseEvent) {
      mouse.tx = e.clientX / window.innerWidth
      mouse.ty = 1.0 - e.clientY / window.innerHeight
    }

    window.addEventListener("resize", resize)
    window.addEventListener("mousemove", onMouseMove)

    const prog = gl.createProgram()!
    gl.attachShader(prog, compileShader(gl, VS, gl.VERTEX_SHADER))
    gl.attachShader(prog, compileShader(gl, FS, gl.FRAGMENT_SHADER))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const posLoc        = gl.getAttribLocation(prog, "aPos")
    const uTime         = gl.getUniformLocation(prog, "uTime")
    const uResolution   = gl.getUniformLocation(prog, "uResolution")
    const uMouse        = gl.getUniformLocation(prog, "uMouse")
    const uIntensityLoc = gl.getUniformLocation(prog, "uIntensity")
    const uMouseStrLoc  = gl.getUniformLocation(prog, "uMouseStrength")
    const uAspect       = gl.getUniformLocation(prog, "uAspect")
    const uYOffsetPx    = gl.getUniformLocation(prog, "uYOffsetPx")
    const uSpeedLoc     = gl.getUniformLocation(prog, "uSpeed")
    const uBgColorLoc   = gl.getUniformLocation(prog, "uBgColor")
    const uWaveColorLoc = gl.getUniformLocation(prog, "uWaveColor")
    const uGrainLoc     = gl.getUniformLocation(prog, "uGrain")
    const uHalftoneLoc  = gl.getUniformLocation(prog, "uHalftone")
    const uHtSizeLoc    = gl.getUniformLocation(prog, "uHalftoneSize")

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
    gl.clearColor(0, 0, 0, 1)

    function frame(ms: number) {
      if (!canvas || !gl) return
      const p = liveRef.current

      mouse.x += (mouse.tx - mouse.x) * 0.042
      mouse.y += (mouse.ty - mouse.y) * 0.042

      gl.uniform1f(uTime, ms * 0.001)
      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform2f(uMouse, p.mouseEnabled ? mouse.x : 9999, p.mouseEnabled ? mouse.y : 9999)
      gl.uniform1f(uIntensityLoc, p.intensity)
      gl.uniform1f(uMouseStrLoc, p.mouseStrength)
      gl.uniform1f(uAspect, canvas.height > 0 ? canvas.width / canvas.height : 2.414)
      gl.uniform1f(uYOffsetPx, p.yOffset)
      gl.uniform1f(uSpeedLoc, p.speed)
      gl.uniform3f(uBgColorLoc,   p.bgColor[0],   p.bgColor[1],   p.bgColor[2])
      gl.uniform3f(uWaveColorLoc, p.waveColor[0], p.waveColor[1], p.waveColor[2])
      gl.uniform1f(uGrainLoc, p.grain)
      gl.uniform1f(uHalftoneLoc, p.halftone)
      gl.uniform1f(uHtSizeLoc, p.halftoneSize)

      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      rafId = requestAnimationFrame(frame)
    }

    resize()
    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", onMouseMove)
      gl.deleteProgram(prog)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw",
        height: "100vh",
        display: "block",
      }}
    />
  )
}
