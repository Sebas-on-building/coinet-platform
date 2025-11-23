import { motion } from "framer-motion";

export function CorrelationHeatmap({
  data,
  xLabels,
  yLabels,
}: {
  data: number[][];
  xLabels: string[];
  yLabels: string[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-max border-separate border-spacing-2">
        <thead>
          <tr>
            <th></th>
            {xLabels.map((label) => (
              <th key={label} className="text-xs text-blue-200">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {yLabels.map((y, i) => (
            <tr key={y}>
              <td className="text-xs text-blue-200">{y}</td>
              {xLabels.map((x, j) => (
                <td key={x} className="w-8 h-8">
                  <motion.div
                    className="w-8 h-8 rounded-md"
                    style={{
                      background: `linear-gradient(135deg, #00ffa3 ${Math.abs(data[i][j]) * 100}%, #23234d 100%)`,
                      opacity: Math.abs(data[i][j]),
                    }}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.05 * (i + j) }}
                  >
                    <span className="text-xs text-white/80">
                      {data[i][j].toFixed(2)}
                    </span>
                  </motion.div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
