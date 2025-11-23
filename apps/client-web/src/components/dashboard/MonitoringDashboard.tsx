import React, { useEffect } from 'react';
import { Box, SimpleGrid, Button, IconButton } from '@chakra-ui/react';
import { useColorMode, useTheme } from '@chakra-ui/react';
import { WidgetPalette } from './WidgetPalette';
import { useDashboardLayout } from './useDashboardLayout';
import { useWidgetRegistry } from './useWidgetRegistry';
import { registerAllPlugins } from './plugins';
import { WidgetMarketChart } from './widgets/WidgetMarketChart';
import { WidgetAnomalyChart } from './widgets/WidgetAnomalyChart';
import { WidgetForecastChart } from './widgets/WidgetForecastChart';
import { WidgetPluginAnalytics } from './widgets/WidgetPluginAnalytics';
import { WidgetMarketCorrelation } from './widgets/WidgetMarketCorrelation';
import { WidgetPortfolio } from './widgets/WidgetPortfolio';
import { WidgetAnalytics } from './widgets/WidgetAnalytics';
import { WidgetMarketOverview } from './widgets/WidgetMarketOverview';
import { TopicHealthCard } from './widgets/TopicHealthCard';
import { LagChart } from './widgets/LagChart';
import { ThroughputWidget } from './widgets/ThroughputWidget';
import { ConsumerGroupStatus } from './widgets/ConsumerGroupStatus';
import { ProducerActivity } from './widgets/ProducerActivity';
import { StreamsAggregates } from './widgets/StreamsAggregates';
import { AddIcon } from '@chakra-ui/icons';

const defaultWidgets = [
  { id: 'marketChart', component: WidgetMarketChart, name: 'Market Chart', size: 'md' },
  { id: 'anomalyChart', component: WidgetAnomalyChart, name: 'Anomaly Chart', size: 'sm' },
  { id: 'forecastChart', component: WidgetForecastChart, name: 'Forecast Chart', size: 'sm' },
  { id: 'pluginAnalytics', component: WidgetPluginAnalytics, name: 'Plugin Analytics', size: 'md' },
  { id: 'marketCorrelation', component: WidgetMarketCorrelation, name: 'Market Correlation', size: 'md' },
  { id: 'portfolio', component: WidgetPortfolio, name: 'Portfolio', size: 'sm' },
  { id: 'analytics', component: WidgetAnalytics, name: 'Analytics', size: 'sm' },
  { id: 'marketOverview', component: WidgetMarketOverview, name: 'Market Overview', size: 'sm' },
  { id: 'topicHealth', component: TopicHealthCard, name: 'Topic Health', size: 'sm' },
  { id: 'lagChart', component: LagChart, name: 'Lag Chart', size: 'md' },
  { id: 'throughput', component: ThroughputWidget, name: 'Throughput', size: 'sm' },
  { id: 'consumerGroup', component: ConsumerGroupStatus, name: 'Consumer Groups', size: 'md' },
  { id: 'producerActivity', component: ProducerActivity, name: 'Producer Activity', size: 'sm' },
  { id: 'streamsAggregates', component: StreamsAggregates, name: 'Streams/Aggregates', size: 'lg' },
];

export const MonitoringDashboard = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const theme = useTheme();
  const { layout, addWidget, removeWidget } = useDashboardLayout(defaultWidgets);
  const { widgetRegistry } = useWidgetRegistry(defaultWidgets);

  useEffect(() => {
    registerAllPlugins();
  }, []);

  return (
    <Box bg={colorMode === 'dark' ? theme.colors.gray[900] : theme.colors.background} minH="100vh" p={6}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box fontSize="2xl" fontWeight="bold" letterSpacing="tight">Coinet Monitoring Dashboard</Box>
        <Box>
          <Button onClick={toggleColorMode} variant="ghost">{colorMode === 'dark' ? 'Light' : 'Dark'} Mode</Button>
        </Box>
      </Box>
      <WidgetPalette widgetRegistry={widgetRegistry} addWidget={addWidget} />
      <SimpleGrid columns={[1, 2, 3, 4]} spacing={6}>
        {layout.map(({ id, x, y, w, h, ...rest }) => {
          const Widget = widgetRegistry[id]?.component;
          if (!Widget) return null;
          return (
            <Box key={id} gridColumn={`span ${w || 1}`} gridRow={`span ${h || 1}`} boxShadow="lg" borderRadius="xl" bg={colorMode === 'dark' ? theme.colors.gray[800] : theme.colors.card} p={4} position="relative">
              <IconButton aria-label="Remove widget" icon={<AddIcon />} size="xs" position="absolute" top={2} right={2} onClick={() => removeWidget(id)} />
              <Widget {...rest} />
            </Box>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}; 