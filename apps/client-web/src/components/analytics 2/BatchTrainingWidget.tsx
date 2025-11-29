export function BatchTrainingWidget({ onTrain }: { onTrain: () => void }) {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-200 to-yellow-400 shadow flex flex-col items-center">
      <h3 className="font-bold mb-2">Batch Training</h3>
      <button
        className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow"
        onClick={onTrain}
      >
        Train Now
      </button>
    </div>
  );
} 