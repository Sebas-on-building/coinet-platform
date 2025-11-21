"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  OrderType,
  OrderSide,
  TimeInForce,
  SmartOrderParams,
} from "../../types/trading";
import { tradingService } from "../../services/tradingService";

interface OrderEntryProps {
  symbol: string;
  onOrderSubmitted?: () => void;
}

interface OrderValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface RiskMetrics {
  positionSize: number;
  leverage: number;
  marginRequired: number;
  potentialLoss: number;
  riskRewardRatio: number;
}

export const OrderEntry: React.FC<OrderEntryProps> = ({
  symbol,
  onOrderSubmitted,
}) => {
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [side, setSide] = useState<OrderSide>("BUY");
  const [quantity, setQuantity] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [stopPrice, setStopPrice] = useState<string>("");
  const [timeInForce, setTimeInForce] = useState<TimeInForce>("GTC");
  const [postOnly, setPostOnly] = useState<boolean>(false);
  const [reduceOnly, setReduceOnly] = useState<boolean>(false);
  const [isSmartOrder, setIsSmartOrder] = useState<boolean>(false);
  const [smartOrderParams, setSmartOrderParams] = useState<SmartOrderParams>({
    maxSlippage: 0.5,
    splitOrders: false,
    maxSplits: 3,
    timeWindow: 1000,
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validation, setValidation] = useState<OrderValidation>({
    isValid: true,
    errors: [],
    warnings: [],
  });
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    positionSize: 0,
    leverage: 1,
    marginRequired: 0,
    potentialLoss: 0,
    riskRewardRatio: 0,
  });

  const validateOrder = useCallback((): OrderValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!quantity || Number(quantity) <= 0) {
      errors.push("Invalid quantity");
    }

    if (orderType !== "MARKET" && (!price || Number(price) <= 0)) {
      errors.push("Invalid price");
    }

    if (
      (orderType === "STOP" || orderType === "STOP_LIMIT") &&
      (!stopPrice || Number(stopPrice) <= 0)
    ) {
      errors.push("Invalid stop price");
    }

    // Risk management validation
    const positionValue = Number(quantity) * (Number(price) || 0);
    if (positionValue > 100000) {
      // Example threshold
      warnings.push("Large position size detected");
    }

    if (smartOrderParams.maxSlippage > 1) {
      warnings.push("High slippage tolerance");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [quantity, price, stopPrice, orderType, smartOrderParams.maxSlippage]);

  const calculateRiskMetrics = useCallback((): RiskMetrics => {
    const currentPrice = Number(price) || 0;
    const qty = Number(quantity) || 0;
    const positionSize = currentPrice * qty;
    const leverage = 1; // Replace with actual leverage calculation

    // Calculate potential loss based on stop price or a default 2% loss
    const stopLoss = Number(stopPrice) || currentPrice * 0.98;
    const potentialLoss = Math.abs(currentPrice - stopLoss) * qty;

    // Calculate risk/reward ratio if take profit is set
    const takeProfit = currentPrice * 1.02; // Example: 2% profit target
    const potentialReward = Math.abs(currentPrice - takeProfit) * qty;
    const riskRewardRatio = potentialReward / potentialLoss;

    return {
      positionSize,
      leverage,
      marginRequired: positionSize / leverage,
      potentialLoss,
      riskRewardRatio,
    };
  }, [price, quantity, stopPrice]);

  // Update validation and risk metrics when inputs change
  useEffect(() => {
    const validationResult = validateOrder();
    setValidation(validationResult);
    setRiskMetrics(calculateRiskMetrics());
  }, [
    quantity,
    price,
    stopPrice,
    orderType,
    validateOrder,
    calculateRiskMetrics,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const validationResult = validateOrder();
      if (!validationResult.isValid) {
        return;
      }

      setShowConfirmation(true);
    },
    [validateOrder],
  );

  const confirmOrder = async () => {
    try {
      if (isSmartOrder) {
        await tradingService.smartOrder(
          symbol,
          side,
          Number(quantity),
          smartOrderParams,
        );
      } else {
        await tradingService.placeOrder(
          symbol,
          orderType,
          side,
          Number(quantity),
          price ? Number(price) : undefined,
          stopPrice ? Number(stopPrice) : undefined,
          timeInForce,
          { postOnly, reduceOnly },
        );
      }

      setShowConfirmation(false);
      setQuantity("");
      setPrice("");
      setStopPrice("");
      onOrderSubmitted?.();
    } catch (error) {
      console.error("Failed to place order:", error);
      // Handle error (show notification, etc.)
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Order Type Selection */}
        <div className="flex space-x-4">
          <button
            type="button"
            className={`flex-1 py-2 px-4 rounded-lg ${
              side === "BUY"
                ? "bg-green-500 text-white"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
            onClick={() => setSide("BUY")}
          >
            Buy
          </button>
          <button
            type="button"
            className={`flex-1 py-2 px-4 rounded-lg ${
              side === "SELL"
                ? "bg-red-500 text-white"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
            onClick={() => setSide("SELL")}
          >
            Sell
          </button>
        </div>

        {/* Order Type Dropdown */}
        <select
          className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as OrderType)}
        >
          <option value="MARKET">Market</option>
          <option value="LIMIT">Limit</option>
          <option value="STOP">Stop</option>
          <option value="STOP_LIMIT">Stop Limit</option>
        </select>

        {/* Quantity Input */}
        <div>
          <label className="block text-sm font-medium mb-1">Quantity</label>
          <input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            required
          />
        </div>

        {/* Price Input (for LIMIT and STOP_LIMIT orders) */}
        {(orderType === "LIMIT" || orderType === "STOP_LIMIT") && (
          <div>
            <label className="block text-sm font-medium mb-1">Price</label>
            <input
              type="number"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
        )}

        {/* Stop Price Input (for STOP and STOP_LIMIT orders) */}
        {(orderType === "STOP" || orderType === "STOP_LIMIT") && (
          <div>
            <label className="block text-sm font-medium mb-1">Stop Price</label>
            <input
              type="number"
              step="any"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
        )}

        {/* Time in Force Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Time in Force
          </label>
          <select
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            value={timeInForce}
            onChange={(e) => setTimeInForce(e.target.value as TimeInForce)}
          >
            <option value="GTC">Good Till Cancel</option>
            <option value="IOC">Immediate or Cancel</option>
            <option value="FOK">Fill or Kill</option>
          </select>
        </div>

        {/* Advanced Options */}
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="postOnly"
              checked={postOnly}
              onChange={(e) => setPostOnly(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="postOnly" className="text-sm">
              Post Only
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="reduceOnly"
              checked={reduceOnly}
              onChange={(e) => setReduceOnly(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="reduceOnly" className="text-sm">
              Reduce Only
            </label>
          </div>
        </div>

        {/* Smart Order Options */}
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="smartOrder"
              checked={isSmartOrder}
              onChange={(e) => setIsSmartOrder(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="smartOrder" className="text-sm">
              Smart Order Routing
            </label>
          </div>

          {isSmartOrder && (
            <div className="space-y-2 pl-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Slippage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={smartOrderParams.maxSlippage}
                  onChange={(e) =>
                    setSmartOrderParams((prev) => ({
                      ...prev,
                      maxSlippage: Number(e.target.value),
                    }))
                  }
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="splitOrders"
                  checked={smartOrderParams.splitOrders}
                  onChange={(e) =>
                    setSmartOrderParams((prev) => ({
                      ...prev,
                      splitOrders: e.target.checked,
                    }))
                  }
                  className="mr-2"
                />
                <label htmlFor="splitOrders" className="text-sm">
                  Split Orders
                </label>
              </div>
              {smartOrderParams.splitOrders && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Max Splits
                    </label>
                    <input
                      type="number"
                      value={smartOrderParams.maxSplits}
                      onChange={(e) =>
                        setSmartOrderParams((prev) => ({
                          ...prev,
                          maxSplits: Number(e.target.value),
                        }))
                      }
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Time Window (ms)
                    </label>
                    <input
                      type="number"
                      value={smartOrderParams.timeWindow}
                      onChange={(e) =>
                        setSmartOrderParams((prev) => ({
                          ...prev,
                          timeWindow: Number(e.target.value),
                        }))
                      }
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Validation Messages */}
        {validation.errors.length > 0 && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {validation.errors.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        )}

        {validation.warnings.length > 0 && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            {validation.warnings.map((warning, index) => (
              <p key={index}>{warning}</p>
            ))}
          </div>
        )}

        {/* Risk Metrics Display */}
        <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded">
          <div>
            <label className="text-sm text-gray-500">Position Size</label>
            <div className="font-medium">
              {riskMetrics.positionSize.toFixed(2)} USD
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Required Margin</label>
            <div className="font-medium">
              {riskMetrics.marginRequired.toFixed(2)} USD
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Potential Loss</label>
            <div className="font-medium text-red-500">
              {riskMetrics.potentialLoss.toFixed(2)} USD
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Risk/Reward</label>
            <div className="font-medium">
              {riskMetrics.riskRewardRatio.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!validation.isValid}
          className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
            !validation.isValid
              ? "bg-gray-400 cursor-not-allowed"
              : side === "BUY"
                ? "bg-green-500 hover:bg-green-600"
                : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {side === "BUY" ? "Buy" : "Sell"} {symbol}
        </button>
      </form>

      {/* Order Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Order</h3>

            <div className="space-y-2 mb-6">
              <p>Symbol: {symbol}</p>
              <p>Side: {side}</p>
              <p>Type: {orderType}</p>
              <p>Quantity: {quantity}</p>
              {price && <p>Price: {price}</p>}
              {stopPrice && <p>Stop Price: {stopPrice}</p>}
              <p>Time in Force: {timeInForce}</p>

              {validation.warnings.length > 0 && (
                <div className="bg-yellow-100 p-3 rounded mt-4">
                  <p className="font-medium">Warnings:</p>
                  {validation.warnings.map((warning, index) => (
                    <p key={index} className="text-sm">
                      {warning}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmOrder}
                className={`flex-1 py-2 px-4 rounded-lg text-white ${
                  side === "BUY" ? "bg-green-500" : "bg-red-500"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
