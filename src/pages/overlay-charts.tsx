import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useUser } from '@clerk/nextjs';
import { getAuth } from '@clerk/nextjs/server';
import Head from 'next/head';
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useToast } from '@/hooks/useToast';
import OverlayChart, { SeriesConfig } from '@/components/charts/OverlayChart';
import { glassnodeMetrics, glassnodeAssets } from '@/lib/datasources/glassnode';
import { popularFredSeries } from '@/lib/datasources/fred';
import { popularTradingViewSymbols } from '@/lib/datasources/tradingview';

interface OverlayChartsPageProps {
  initialTemplates: any[];
}

const DEFAULT_SERIES: SeriesConfig[] = [
  {
    source: 'price',
    symbol: 'BTCUSDT',
    timeframe: '1d',
    name: 'Bitcoin Price'
  }
];

const OverlayChartsPage: React.FC<OverlayChartsPageProps> = ({ initialTemplates }) => {
  const { user } = useUser();
  const { showToast } = useToast();

  // State for templates and current chart
  const [templates, setTemplates] = useState<any[]>(initialTemplates);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [series, setSeries] = useState<SeriesConfig[]>(DEFAULT_SERIES);
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  // UI state
  const [isAddingNewSeries, setIsAddingNewSeries] = useState(false);
  const [newSeries, setNewSeries] = useState<SeriesConfig>({ source: 'price' });
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Load templates when user changes
  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  // Fetch user's templates
  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/overlay-templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      showToast('Error loading templates', 'error');
    }
  };

  // Load a template
  const loadTemplate = (template: any) => {
    setCurrentTemplate(template);
    setSeries(template.series);
    setDateRange({
      from: template.from ? new Date(template.from).toISOString().split('T')[0] : undefined,
      to: template.to ? new Date(template.to).toISOString().split('T')[0] : undefined
    });
    setTemplateName(template.name);
  };

  // Save current chart as a template
  const saveTemplate = async () => {
    if (!user) {
      showToast('Please sign in to save templates', 'warning');
      return;
    }

    if (!templateName) {
      showToast('Please enter a template name', 'warning');
      return;
    }

    setSavingTemplate(true);

    try {
      const templateData = {
        id: currentTemplate?.id,
        name: templateName,
        description: '',
        series,
        from: dateRange.from,
        to: dateRange.to,
        isDefault: false,
        isPublic: false
      };

      const url = currentTemplate
        ? `/api/overlay-templates?id=${currentTemplate.id}`
        : '/api/overlay-templates';

      const method = currentTemplate ? 'PUT' : 'POST';

      const response = await axios({
        method,
        url,
        data: templateData
      });

      showToast(
        currentTemplate ? 'Template updated successfully' : 'Template saved successfully',
        'success'
      );

      setCurrentTemplate(response.data);
      await fetchTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
      showToast('Error saving template', 'error');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Add a new series to the chart
  const handleAddSeries = () => {
    if (!newSeries.source) {
      showToast('Please select a data source', 'warning');
      return;
    }

    // Validate required fields based on source
    if (newSeries.source === 'price' && !newSeries.symbol) {
      showToast('Please select a symbol', 'warning');
      return;
    }

    if (newSeries.source === 'glassnode' && (!newSeries.metric || !newSeries.asset)) {
      showToast('Please select both metric and asset', 'warning');
      return;
    }

    if (newSeries.source === 'fred' && !newSeries.seriesId) {
      showToast('Please select a FRED series', 'warning');
      return;
    }

    // Add the new series to the chart
    setSeries([...series, { ...newSeries }]);

    // Reset the form
    setNewSeries({ source: 'price' });
    setIsAddingNewSeries(false);
  };

  // Remove a series from the chart
  const removeSeries = (index: number) => {
    setSeries(series.filter((_, i) => i !== index));
  };

  // Share template
  const shareTemplate = async (templateId: string) => {
    try {
      const response = await axios.get(`/api/overlay-templates/share?id=${templateId}`);
      const shareUrl = `${window.location.origin}/overlay-charts?token=${response.data.token}`;

      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl);

      showToast('Share link copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to share template:', error);
      showToast('Error generating share link', 'error');
    }
  };

  return (
    <>
      <Head>
        <title>Multi-Source Data Overlay | Coinet</title>
        <meta name="description" content="Overlay multiple data sources on a unified chart to discover correlations between price, on-chain metrics, and macroeconomic data." />
      </Head>

      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Multi-Source Data Overlay
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Overlay multiple data sources on a unified chart to discover correlations between price, on-chain metrics, and macroeconomic data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Configuration panel */}
          <div className="md:col-span-1 space-y-4">
            {/* Template selector */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Templates</h3>

              {templates.length > 0 ? (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-2 rounded-md cursor-pointer flex justify-between items-center ${currentTemplate?.id === template.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                          : 'border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      onClick={() => loadTemplate(template)}
                    >
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {template.name}
                      </span>
                      <button
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          shareTemplate(template.id);
                        }}
                        title="Share template"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">
                    {user ? 'No saved templates yet' : 'Sign in to save templates'}
                  </p>
                </div>
              )}
            </div>

            {/* Data sources panel */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Data Sources</h3>

              <div className="space-y-3">
                {series.map((item, index) => (
                  <div key={index} className="flex justify-between items-center rounded-md border border-gray-200 dark:border-gray-800 p-2">
                    <div className="text-sm">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {item.name ||
                          (item.source === 'price' && item.symbol) ||
                          (item.source === 'glassnode' && `${item.asset} ${item.metric?.split('/').pop()}`) ||
                          (item.source === 'fred' && item.seriesId) ||
                          `Source ${index + 1}`
                        }
                      </span>
                      <div className="text-xs text-gray-500">
                        {item.source === 'price' && `${item.symbol} • ${item.timeframe}`}
                        {item.source === 'glassnode' && `${item.asset} • ${item.frequency}`}
                        {item.source === 'fred' && `FRED • ${item.seriesId}`}
                        {item.source === 'tradingview' && `TradingView • ${item.symbol}`}
                      </div>
                    </div>
                    <button
                      className="text-red-400 hover:text-red-600"
                      onClick={() => removeSeries(index)}
                      aria-label="Remove series"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {isAddingNewSeries ? (
                  <div className="border border-gray-200 dark:border-gray-800 rounded-md p-3 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data Source
                      </label>
                      <select
                        className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                        value={newSeries.source}
                        onChange={(e) => setNewSeries({ source: e.target.value as any })}
                      >
                        <option value="price">Price Data</option>
                        <option value="glassnode">Glassnode (On-chain)</option>
                        <option value="fred">FRED (Economic)</option>
                        <option value="tradingview">TradingView</option>
                      </select>
                    </div>

                    {/* Conditional fields based on source */}
                    {newSeries.source === 'price' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Symbol
                          </label>
                          <input
                            type="text"
                            className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                            value={newSeries.symbol || ''}
                            onChange={(e) => setNewSeries({ ...newSeries, symbol: e.target.value })}
                            placeholder="BTCUSDT"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Timeframe
                          </label>
                          <select
                            className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                            value={newSeries.timeframe || '1d'}
                            onChange={(e) => setNewSeries({ ...newSeries, timeframe: e.target.value })}
                          >
                            <option value="1h">1 hour</option>
                            <option value="4h">4 hours</option>
                            <option value="1d">1 day</option>
                            <option value="1w">1 week</option>
                          </select>
                        </div>
                      </>
                    )}

                    {newSeries.source === 'glassnode' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Asset
                          </label>
                          <select
                            className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                            value={newSeries.asset || ''}
                            onChange={(e) => setNewSeries({ ...newSeries, asset: e.target.value })}
                          >
                            <option value="">Select Asset</option>
                            {glassnodeAssets.map(asset => (
                              <option key={asset.id} value={asset.id}>{asset.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Metric
                          </label>
                          <select
                            className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                            value={newSeries.metric || ''}
                            onChange={(e) => setNewSeries({ ...newSeries, metric: e.target.value })}
                          >
                            <option value="">Select Metric</option>
                            {glassnodeMetrics.map(metric => (
                              <option key={metric.id} value={metric.id}>{metric.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Frequency
                          </label>
                          <select
                            className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                            value={newSeries.frequency || '24h'}
                            onChange={(e) => setNewSeries({ ...newSeries, frequency: e.target.value })}
                          >
                            <option value="10m">10 minutes</option>
                            <option value="1h">1 hour</option>
                            <option value="24h">24 hours</option>
                            <option value="1w">1 week</option>
                          </select>
                        </div>
                      </>
                    )}

                    {newSeries.source === 'fred' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          FRED Series
                        </label>
                        <select
                          className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                          value={newSeries.seriesId || ''}
                          onChange={(e) => setNewSeries({ ...newSeries, seriesId: e.target.value })}
                        >
                          <option value="">Select Series</option>
                          {popularFredSeries.map(series => (
                            <option key={series.id} value={series.id}>{series.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {newSeries.source === 'tradingview' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          TradingView Symbol
                        </label>
                        <select
                          className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                          value={newSeries.symbol || ''}
                          onChange={(e) => setNewSeries({ ...newSeries, symbol: e.target.value })}
                        >
                          <option value="">Select Symbol</option>
                          {popularTradingViewSymbols.map(symbol => (
                            <option key={symbol.id} value={symbol.id}>{symbol.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <button
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
                        onClick={handleAddSeries}
                      >
                        <CheckIcon className="h-4 w-4 inline mr-1" />
                        Add
                      </button>
                      <button
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md"
                        onClick={() => setIsAddingNewSeries(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full flex items-center justify-center px-3 py-2 border border-dashed border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:border-gray-400 dark:hover:border-gray-600"
                    onClick={() => setIsAddingNewSeries(true)}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Data Source
                  </button>
                )}
              </div>
            </div>

            {/* Date range panel */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Date Range</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    value={dateRange.from || ''}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    value={dateRange.to || ''}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Save template panel */}
            {user && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Save Template</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Template Name
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="My Overlay Template"
                    />
                  </div>
                  <button
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:bg-blue-400 disabled:cursor-not-allowed"
                    onClick={saveTemplate}
                    disabled={savingTemplate || !templateName || series.length === 0}
                  >
                    {savingTemplate ? 'Saving...' : currentTemplate ? 'Update Template' : 'Save Template'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Chart area */}
          <div className="md:col-span-3">
            <OverlayChart
              series={series}
              from={dateRange.from}
              to={dateRange.to}
              title={currentTemplate?.name || "Multi-Source Data Overlay"}
              height={600}
              showControls={true}
              className="h-full"
              onSaveTemplate={saveTemplate}
              templateId={currentTemplate?.id}
            />
          </div>
        </div>
      </div>
    </>
  );
};

// Server-side props to get initial templates
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { userId } = getAuth(context.req);

  if (!userId) {
    return {
      props: {
        initialTemplates: []
      }
    };
  }

  try {
    // In a real implementation, you would connect to your database here
    // For now, we'll just return an empty array
    return {
      props: {
        initialTemplates: []
      }
    };
  } catch (error) {
    console.error('Error fetching templates:', error);
    return {
      props: {
        initialTemplates: []
      }
    };
  }
};

export default OverlayChartsPage; 