import { useState } from "react"
import PS3Canvas, { DEFAULT_PARAMS, type PS3Params } from "./components/PS3Canvas"
import ControlPanel from "./components/ControlPanel"

export default function App() {
  const [params, setParams] = useState<PS3Params>(DEFAULT_PARAMS)

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
      <PS3Canvas {...params} />
      <ControlPanel params={params} onChange={setParams} />
    </div>
  )
}
