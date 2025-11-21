export function ModelStatusWidget({ status }: { status: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/80 shadow border border-gray-200 flex items-center">
      <span className="w-3 h-3 rounded-full mr-2" style={{ background: status === 'ready' ? '#34d399' : '#f87171' }} />
      <span className="font-medium">{status === 'ready' ? 'Model Ready' : 'Training...'}</span>
    </div>
  );
} 