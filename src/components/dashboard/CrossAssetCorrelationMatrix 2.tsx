import { useState } from "react";
import { motion } from "framer-motion";

const assets = ["BTC", "ETH", "SOL", "AVAX", "DOGE"];
const correlations = [
  [1, 0.82, 0.65, 0.48, 0.22],
  [0.82, 1, 0.71, 0.55, 0.3],
  [0.65, 0.71, 1, 0.6, 0.4],
  [0.48, 0.55, 0.6, 1, 0.33],
  [0.22, 0.3, 0.4, 0.33, 1],
];

function getColor(val: number) {
  // Green for high, blue for mid, yellow for low
  if (val > 0.75) return "#00ffa3";
  if (val > 0.5) return "#0057ff";
  if (val > 0.25) return "#ffb300";
  return "#23234d";
}

export function CrossAssetCorrelationMatrix() {
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(
    null,
  );
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(
    null,
  );

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">
        Cross-Asset Correlation Matrix
      </h3>
      <div className="overflow-x-auto">
        <table className="border-collapse w-full text-center">
          <thead>
            <tr>
              <th className="w-16"></th>
              {assets.map((asset) => (
                <th key={asset} className="text-blue-300 font-mono px-2 py-1">
                  {asset}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map((rowAsset, rowIdx) => (
              <tr key={rowAsset}>
                <td className="text-blue-300 font-mono px-2 py-1">
                  {rowAsset}
                </td>
                {assets.map((colAsset, colIdx) => {
                  const val = correlations[rowIdx][colIdx];
                  const isHovered =
                    hovered &&
                    (hovered.row === rowIdx || hovered.col === colIdx);
                  const isSelected =
                    selected &&
                    selected.row === rowIdx &&
                    selected.col === colIdx;
                  return (
                    <motion.td
                      key={colAsset}
                      className={`rounded-lg cursor-pointer font-bold transition px-2 py-1 ${isSelected ? "ring-2 ring-[#00ffa3]" : ""}`}
                      style={{
                        background: getColor(val),
                        color: val > 0.5 ? "#23234d" : "#fff",
                        opacity: isHovered ? 0.85 : 1,
                      }}
                      whileHover={{ scale: 1.08 }}
                      onMouseEnter={() =>
                        setHovered({ row: rowIdx, col: colIdx })
                      }
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => setSelected({ row: rowIdx, col: colIdx })}
                    >
                      {val.toFixed(2)}
                    </motion.td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <motion.div
          className="mt-4 p-4 rounded-xl bg-[#1a1a2e] text-blue-300 font-mono shadow-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Correlation between{" "}
          <span className="font-bold text-white">{assets[selected.row]}</span>{" "}
          and{" "}
          <span className="font-bold text-white">{assets[selected.col]}</span>:{" "}
          <span className="text-[#00ffa3]">
            {correlations[selected.row][selected.col].toFixed(2)}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
