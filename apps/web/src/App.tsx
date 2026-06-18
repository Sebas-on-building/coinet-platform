import { Routes, Route } from "react-router-dom";
import { CoinetBar } from "@/components/layout/CoinetBar";
import { Overview } from "@/pages/Overview";
import { ConnectionProof } from "@/pages/ConnectionProof";
import { VerdictView } from "@/pages/VerdictView";

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <CoinetBar />
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/verdict" element={<VerdictView />} />
        <Route path="/connection" element={<ConnectionProof />} />
      </Routes>
    </div>
  );
}
