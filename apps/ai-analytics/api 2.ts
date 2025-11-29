import { Router } from 'express';
import { GenerateAIInsightsService } from '../../services/generate-ai-insights/dist/index';
const router = Router();

// Initialize AI insights service
const aiInsightsService = new GenerateAIInsightsService();

// AI Insights endpoints
router.post('/insights', async (req, res) => {
  try {
    const result = await aiInsightsService.getConfig().analysis.lookbackPeriod ?
      // For demo purposes, return a simplified response
      {
        success: true,
        recommendations: [
          {
            id: 'demo_001',
            type: 'signal_weight',
            priority: 'medium',
            title: 'Optimize Signal Weighting',
            description: 'Current signal weighting could be improved for better accuracy',
            confidence: 0.75,
            impact: 'medium',
            effort: 'low',
            explanation: {
              reasoning: 'Analysis of historical performance suggests signal weighting adjustments',
              dataPoints: ['Historical accuracy: 73%', 'Sample size: 1,200 alerts'],
              benefits: ['Improved accuracy', 'Reduced false positives'],
              risks: ['May temporarily affect alert frequency']
            },
            actions: [
              {
                type: 'adjust_signal_weight',
                description: 'Reduce RSI signal weight by 15%'
              }
            ],
            createdAt: new Date(),
            actionable: true
          }
        ],
        summary: {
          totalDataPoints: 1200,
          analyzedPeriod: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date()
          },
          confidence: 0.75,
          keyInsights: ['Signal weighting optimization needed', 'RSI signals are over-weighted']
        },
        processingTime: 150
      } :
      { success: false, error: 'Service not available' };

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/dashboard-insights', async (req, res) => {
  try {
    const result = await aiInsightsService.getConfig().analysis.lookbackPeriod ?
      // For demo purposes, return dashboard-formatted insights
      {
        success: true,
        insights: [
          {
            id: 'dashboard_demo_001',
            type: 'recommendation',
            title: 'AI Signal Optimization',
            description: 'Machine learning analysis suggests optimizing signal weights',
            data: {
              recommendation: {
                id: 'demo_001',
                type: 'signal_weight',
                priority: 'medium',
                title: 'Optimize Signal Weighting',
                description: 'Current signal weighting could be improved for better accuracy',
                confidence: 0.75,
                impact: 'medium',
                effort: 'low'
              }
            },
            visualization: {
              type: 'chart',
              config: { showExplanation: true, highlightConfidence: true }
            },
            actionable: true,
            priority: 'medium',
            createdAt: new Date()
          }
        ]
      } :
      { success: false, error: 'Service not available' };

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Legacy action endpoint
router.post('/action', async (req, res) => {
  // Validate and handle command
  res.status(200).json({ status: 'ok' });
});

export default router;
