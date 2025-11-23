"use client";

import React, { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useCoinetData } from "@/hooks/useCoinetData";
import { DataLoader, DataError, DataEmpty, DataLivePulse } from "@/components/ui";
import { Button } from 'src/components/ui/Button';
import { Avatar } from 'src/components/ui/Avatar';
import { colors } from 'src/styles/tokens/colors';
import { spacing } from 'src/styles/tokens/spacing';

/**
 * MarketOverviewWidget
 * - World-class UI/UX, a11y, microinteractions, analytics
 */
interface MarketOverviewWidgetProps {
  config?: {
    timeframe?: string;
    asset?: string;
    showAI?: boolean;
    showSentiment?: boolean;
  };
  analyticsEvent?: string;
  onDetails?: () => void;
}

export default function MarketOverviewWidget({
  config,
  analyticsEvent,
  onDetails,
}: MarketOverviewWidgetProps) {
  const { data, state, error, isLive } = useCoinetData({
    type: "ohlc",
    asset: config?.asset || "BTC",
    timeframe: config?.timeframe || "1d",
    realtime: true,
    ai: config?.showAI,
    sentiment: config?.showSentiment,
  });

  useEffect(() => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, {
        label: "MarketOverviewWidget",
      });
    }
  }, [analyticsEvent]);

  if (state === "loading") return <DataLoader />;
  if (state === "error") return <DataError message={error?.message || "An error occurred."} />;
  if (!data) return <DataEmpty message="No market data available." />;

  return (
    <Card
      header={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar src="/btc.png" alt="BTC" size={32} />
          <span style={{ marginLeft: spacing.sm, fontWeight: 700, fontSize: 20 }}>BTC/USD</span>
        </div>
      }
      actions={
        <Button size="sm" onClick={onDetails} style={{ marginLeft: 'auto' }}>
          Details
        </Button>
      }
      style={{
        minWidth: 320,
        background: colors.gradients.solana,
        color: colors.dark.text,
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 800, marginBottom: spacing.sm }}>$67,000</div>
      <div style={{ color: colors.dark.success, fontWeight: 600 }}>+2.5% (24h)</div>
      <div style={{ marginTop: spacing.md, fontSize: 14, color: colors.dark.secondary }}>
        Market Cap: $1.2T • Volume: $45B
      </div>
    </Card>
  );
}
