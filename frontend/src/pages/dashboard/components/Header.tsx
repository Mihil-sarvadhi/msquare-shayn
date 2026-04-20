interface HeaderProps {
  range: string;
  setRange: (range: string) => void;
}

export default function Header({ range, setRange }: HeaderProps) {
  return (
    <header className="bg-white border-b border-[#F0EBE0] px-4 sm:px-6 py-2 flex items-center gap-3">
      <div className="flex gap-1 bg-[#F5F0E8] rounded-lg p-1">
        {([['7d', '7 Days'], ['30d', '30 Days'], ['all', 'All Time']] as const).map(([r, label]) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              range === r ? 'bg-white text-[#1A1208] shadow-sm' : 'text-[#8C7B64] hover:text-[#1A1208]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );
}
