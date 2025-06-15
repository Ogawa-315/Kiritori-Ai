import { Routes, Route, HashRouter } from "react-router-dom";
import KiritoriAI from "./pages/Main";
import Overlay from "./pages/Overlay";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<KiritoriAI />} />
        <Route path="/overlay" element={<Overlay />} />
      </Routes>
    </HashRouter>
  )
}
