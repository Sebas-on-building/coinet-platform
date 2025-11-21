import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Coin } from "@/types/coin";

interface CoinSelectorProps {
  onSelect: (coin: Coin) => void;
  selectedCoin?: string;
}

export function CoinSelector({ onSelect, selectedCoin }: CoinSelectorProps) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const data = await api.getPriceHistory(selectedCoin || "BTC", 10);
        setCoins(data as Coin[]);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch coins");
        setLoading(false);
      }
    };

    fetchCoins();
  }, [selectedCoin]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="flex flex-wrap gap-2">
      {coins.map((coin) => (
        <button
          key={coin.id}
          onClick={() => onSelect(coin)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedCoin === coin.id
              ? "bg-primary-500 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-gray-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            {coin.image && (
              <img
                src={coin.image}
                alt={coin.name}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span>{coin.symbol.toUpperCase()}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
