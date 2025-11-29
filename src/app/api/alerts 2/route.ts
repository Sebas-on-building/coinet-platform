import { NextRequest, NextResponse } from 'next/server';
import { AlertAPI } from '@/services/signal-evaluation-engine/src/alerts/AlertAPI';
import type { AlertEngineConfig } from '@/services/signal-evaluation-engine/src/alerts/types';

// Global alert API instance
let alertAPI: AlertAPI | null = null;

// Initialize alert API if not already done
function getAlertAPI(): AlertAPI {
  if (!alertAPI) {
    const config: AlertEngineConfig = {
      evaluation: {
        maxConcurrentEvaluations: 100,
        evaluationTimeout: 1000,
        batchSize: 50,
        cacheTtl: 60000
      },
      rules: {
        maxRules: 1000,
        maxExpressionLength: 1000,
        maxNestingDepth: 10,
        validationTimeout: 5000
      },
      notifications: {
        maxRetries: 3,
        retryDelay: 1000,
        batchSize: 10,
        queueSize: 1000
      },
      performance: {
        enableMetrics: true,
        metricsInterval: 60000,
        enableProfiling: false
      }
    };

    alertAPI = new AlertAPI(config, [
      'price', 'volume', 'social_media', 'on_chain', 'technical'
    ]);

    // Initialize the alert API
    alertAPI.initialize().catch(console.error);
  }

  return alertAPI;
}

// GET /api/alerts - Get all rules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const api = getAlertAPI();

    switch (action) {
      case 'rules':
        return NextResponse.json(api.getAllRules());

      case 'active':
        return NextResponse.json(api.getActiveRules());

      case 'templates':
        return NextResponse.json(api.getRuleTemplates());

      case 'metrics':
        return NextResponse.json(api.getMetrics());

      case 'config':
        return NextResponse.json(api.getConfig());

      case 'status':
        return NextResponse.json(api.getStatus());

      case 'studio':
        return NextResponse.json(api.getStudioState());

      case 'patterns':
        return NextResponse.json(api.getSequentialPatterns());

      case 'patterns/metrics':
        return NextResponse.json(api.getSequentialPatternMetrics());

      case 'baselines':
        return NextResponse.json(api.getAllBaselines());

      case 'baselines/:signalType':
        const signalType = request.nextUrl.pathname.split('/').pop();
        return NextResponse.json(api.getBaseline(signalType || ''));

      case 'baselines/:signalType/regime':
        const regimeSignalType = request.nextUrl.pathname.split('/')[2];
        return NextResponse.json(api.getCurrentRegime(regimeSignalType || ''));

      default:
        return NextResponse.json({
          message: 'Alert API is running',
          endpoints: api.getEndpoints(),
          status: api.getStatus()
        });
    }
  } catch (error: any) {
    console.error('Alert API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Create a new rule or validate expression
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const api = getAlertAPI();

    // Handle different actions based on request body
    if (body.action === 'validate') {
      const validation = api.validateExpression(body.expression);
      return NextResponse.json(validation);
    }

    if (body.action === 'evaluate') {
      const result = await api.evaluateRule(body);
      return NextResponse.json(result);
    }

    if (body.action === 'createPattern') {
      const pattern = await api.createSequentialPattern(body);
      return NextResponse.json(pattern, { status: 201 });
    }

    // Default: create a new rule
    const rule = await api.createRule(body);
    return NextResponse.json(rule, { status: 201 });

  } catch (error: any) {
    console.error('Alert API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/alerts - Update a rule or configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const api = getAlertAPI();

    if (body.action === 'activate') {
      const success = await api.activateRule(body.ruleId);
      return NextResponse.json({ success });
    }

    if (body.action === 'deactivate') {
      const success = await api.deactivateRule(body.ruleId);
      return NextResponse.json({ success });
    }

    if (body.action === 'config') {
      api.updateConfig(body.config);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'studio') {
      api.updateStudioState(body.updates);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'updatePattern') {
      const success = await api.updateSequentialPattern(body.patternId, body.updates);
      return NextResponse.json({ success });
    }

    // Default: update a rule
    const rule = await api.updateRule(body);
    return NextResponse.json(rule);

  } catch (error: any) {
    console.error('Alert API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/alerts - Delete a rule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');

    if (!ruleId) {
      return NextResponse.json(
        { error: 'ruleId parameter is required' },
        { status: 400 }
      );
    }

    const api = getAlertAPI();

    if (searchParams.get('type') === 'pattern') {
      const success = await api.deleteSequentialPattern(ruleId);
      return NextResponse.json({ success });
    }

    const success = await api.deleteRule(ruleId);

    return NextResponse.json({ success });

  } catch (error: any) {
    console.error('Alert API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
