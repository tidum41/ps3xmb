import { useState } from "react"
import PS3Canvas, { DEFAULT_PARAMS, type PS3Params } from "./components/PS3Canvas"
import ControlPanel from "./components/ControlPanel"

export default function App() {
  const [params,     setParams]     = useState<PS3Params>(DEFAULT_PARAMS)
  const [startupKey, setStartupKey] = useState(0)

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000",
      }}
    >
      <PS3Canvas {...params} startupKey={startupKey} />
      <ControlPanel
        params={params}
        onChange={setParams}
        onStartup={() => setStartupKey(k => k + 1)}
      />
    </div>
  )
}
