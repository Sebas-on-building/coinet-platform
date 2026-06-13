import { Routes, Route } from "react-router-dom";
import { CoinetBar } from "@/components/layout/CoinetBar";
import { Overview } from "@/pages/Overview";
import { ConnectionProof } from "@/pages/ConnectionProof";

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <CoinetBar />
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/connection" element={<ConnectionProof />} />
      </Routes>
    </div>
  );
}
