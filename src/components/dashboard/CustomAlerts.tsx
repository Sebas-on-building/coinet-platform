import { useState, useEffect } from "react";
import { Bell, Trash2 } from "lucide-react";

interface CustomAlertsProps {
  coinId: string;
}

interface Alert {
  id: string;
  coinId: string;
  price: number;
  type: "above" | "below";
  triggered: boolean;
}

export function CustomAlerts({ coinId }: CustomAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [price, setPrice] = useState<string>("");
  const [type, setType] = useState<"above" | "below">("above");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load alerts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("price-alerts");
    if (stored) {
      setAlerts(JSON.parse(stored));
    }
  }, []);

  // Save alerts to localStorage
  useEffect(() => {
    localStorage.setItem("price-alerts", JSON.stringify(alerts));
  }, [alerts]);

  // Fetch current price
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
        );
        const result = await response.json();

        setCurrentPrice(result.market_data.current_price.usd);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch price");
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [coinId]);

  const handleAddAlert = () => {
    if (!price || !currentPrice) return;

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const newAlert: Alert = {
      id: Math.random().toString(36).substr(2, 9),
      coinId,
      price: priceNum,
      type,
      triggered: false,
    };

    setAlerts([...alerts, newAlert]);
    setPrice("");
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
  };

  // Check for triggered alerts
  useEffect(() => {
    if (!currentPrice) return;

    const updatedAlerts = alerts.map((alert) => {
      if (alert.coinId !== coinId) return alert;
      if (alert.triggered) return alert;

      const triggered =
        type === "above"
          ? currentPrice >= alert.price
          : currentPrice <= alert.price;

      if (triggered) {
        // Show browser notification
        if (Notification.permission === "granted") {
          new Notification("Price Alert", {
            body: `${coinId.toUpperCase()} is now ${type} $${alert.price}`,
            icon: "/favicon.ico",
          });
        }
      }

      return { ...alert, triggered };
    });

    setAlerts(updatedAlerts);
  }, [currentPrice, coinId]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  if (loading)
    return <div className="text-gray-400">Loading price data...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!currentPrice)
    return <div className="text-gray-400">No price data available</div>;

  return (
    <div className="space-y-6">
      {/* Current Price */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="text-gray-400 text-sm">Current Price</div>
        <div className="text-white font-semibold text-xl">
          ${currentPrice.toLocaleString()}
        </div>
      </div>

      {/* Add Alert Form */}
      <div className="space-y-4">
        <h4 className="text-gray-300 text-sm">Add Price Alert</h4>
        <div className="flex gap-2">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price in USD"
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "above" | "below")}
            className="px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
          <button
            onClick={handleAddAlert}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            Add
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        <h4 className="text-gray-300 text-sm">Your Alerts</h4>
        {alerts.length === 0 ? (
          <div className="text-gray-400 text-sm">No alerts set</div>
        ) : (
          <div className="space-y-2">
            {alerts
              .filter((alert) => alert.coinId === coinId)
              .map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Bell
                      className={`h-5 w-5 ${alert.triggered ? "text-green-400" : "text-gray-400"}`}
                    />
                    <div>
                      <div className="text-white font-medium">
                        {alert.type === "above" ? "Above" : "Below"} $
                        {alert.price.toLocaleString()}
                      </div>
                      {alert.triggered && (
                        <div className="text-green-400 text-sm">
                          Alert triggered!
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="text-gray-400 hover:text-red-400 transition"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
