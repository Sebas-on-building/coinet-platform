import React from "react";
import Image from "next/image";
import { FiDollarSign } from "react-icons/fi";

interface CryptoIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

export const CryptoIcon: React.FC<CryptoIconProps> = ({
  symbol,
  size = 24,
  className = "",
}) => {
  const [error, setError] = React.useState(false);

  // Common cryptocurrency symbols and their corresponding icons
  const symbolMap: { [key: string]: string } = {
    BTC: "₿",
    ETH: "Ξ",
    USDT: "$",
    USDC: "$",
    BNB: "BNB",
    XRP: "XRP",
    ADA: "₳",
    SOL: "◎",
    DOT: "●",
    DOGE: "Ð",
  };

  // Try to load the icon from our assets
  const iconPath = `/icons/crypto/${symbol.toLowerCase()}.svg`;

  if (error) {
    // Fallback to symbol character if image fails to load
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-primary-500/10 text-primary-500 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-sm font-medium">
          {symbolMap[symbol] || symbol.slice(0, 2)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={iconPath}
        alt={`${symbol} icon`}
        width={size}
        height={size}
        onError={() => setError(true)}
        className="object-contain"
      />
    </div>
  );
};
