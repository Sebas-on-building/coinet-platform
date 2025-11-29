/**
 * 🧠 DIVINE MARKET INTELLIGENCE ML CONFIGURATION
 *
 * World-class deep learning configuration for psychology and oracle integrators
 * Combines cutting-edge research with practical financial intelligence
 */

export const ML_CONFIG = {
  // Model Architecture Configuration
  PSYCHOLOGY_MODEL: {
    // Multi-Modal Psychology Transformer (MPT)
    name: 'MultiModalPsychologyTransformer',
    version: '1.0.0',

    // Core transformer parameters
    transformerLayers: 12,
    attentionHeads: 16,
    hiddenSize: 1024,
    intermediateSize: 4096,

    // Multi-modal fusion
    modalityEncoders: {
      text: {
        model: 'distilbert-base-uncased',
        maxLength: 512,
        embeddingDim: 768
      },
      market: {
        model: 'TimeSeriesTransformer',
        sequenceLength: 168, // 1 week of hourly data
        featureDim: 64,
        embeddingDim: 256
      },
      social: {
        model: 'SocialGraphEncoder',
        nodeFeatures: 128,
        edgeFeatures: 64,
        embeddingDim: 256
      },
      temporal: {
        model: 'TemporalFusionTransformer',
        knownRegular: ['hour', 'day_of_week', 'month'],
        knownCategorical: ['market_session'],
        embeddingDim: 128
      },
      image: {
        model: 'EfficientNetB0',
        inputSize: [224, 224, 3],
        embeddingDim: 512
      },
      onchain: {
        model: 'GraphTransformer',
        nodeFeatures: 64,
        edgeFeatures: 32,
        embeddingDim: 512
      }
    },

    // Advanced features
    crossAttention: true,
    selfAttention: true,
    layerNormalization: 'pre-layernorm',
    dropoutRate: 0.1,

    // Training objectives
    primaryTask: 'emotional_state_classification',
    secondaryTasks: [
      'manipulation_risk_assessment',
      'bias_pattern_detection',
      'warning_generation'
    ]
  },

  ORACLE_MODEL: {
    // Market Oracle Neural Network (MONN)
    name: 'MarketOracleNeuralNetwork',
    version: '1.0.0',

    // Time series foundation
    backbone: 'TemporalFusionTransformer',
    sequenceLength: 168, // 1 week of hourly data
    predictionHorizons: [1, 24, 168], // hours

    // Multi-task learning heads
    predictionHeads: {
      priceDirection: {
        type: 'ClassificationHead',
        numClasses: 3, // bullish, bearish, neutral
        hiddenSize: 256
      },
      magnitudeRegression: {
        type: 'RegressionHead',
        outputDim: 1,
        hiddenSize: 256
      },
      probabilityEstimation: {
        type: 'UncertaintyHead',
        distribution: 'normal',
        hiddenSize: 256
      },
      whaleActivity: {
        type: 'SequenceClassifier',
        numClasses: 4, // accumulating, distributing, holding, unknown
        hiddenSize: 256
      },
      turningPoints: {
        type: 'AnomalyDetector',
        threshold: 0.8,
        hiddenSize: 256
      }
    },

    // Advanced techniques
    attentionMechanisms: ['temporal', 'spatial', 'cross-modal'],
    uncertaintyQuantification: true,
    curriculumLearning: true
  },

  // Training Configuration
  TRAINING: {
    // Dataset configuration
    dataset: {
      psychologyDataSize: 500000, // samples
      oracleDataSize: 1000000, // samples
      validationSplit: 0.2,
      testSplit: 0.1,
      crossValidationFolds: 5
    },

    // Training hyperparameters
    hyperparameters: {
      // Optimizer settings
      optimizer: {
        type: 'AdamW',
        learningRate: 1e-4,
        weightDecay: 0.01,
        beta1: 0.9,
        beta2: 0.999,
        epsilon: 1e-8
      },

      // Learning rate scheduling
      scheduler: {
        type: 'cosine_with_warmup',
        warmupSteps: 1000,
        maxSteps: 100000,
        minLearningRate: 1e-6
      },

      // Batch and training settings
      batchSize: 32,
      maxEpochs: 100,
      earlyStoppingPatience: 10,
      gradientClipping: 1.0,

      // Regularization
      dropoutRate: 0.1,
      labelSmoothing: 0.1,
      mixupAlpha: 0.2
    },

    // Advanced training techniques
    advanced: {
      curriculumLearning: {
        enabled: true,
        stages: [
          { difficulty: 'easy', samples: 10000, epochs: 10 },
          { difficulty: 'medium', samples: 50000, epochs: 20 },
          { difficulty: 'hard', samples: 100000, epochs: 30 }
        ]
      },

      adversarialTraining: {
        enabled: true,
        attackTypes: ['fgsm', 'pgd', 'cw'],
        epsilon: 0.01
      },

      uncertaintyWeighting: {
        enabled: true,
        method: 'evidential_deep_learning'
      }
    }
  },

  // Model Serving Configuration
  SERVING: {
    // Inference settings
    inference: {
      maxBatchSize: 32,
      maxLatencyMs: 2000,
      enableBatching: true,
      cacheSize: 1000
    },

    // Model versioning
    versioning: {
      enableVersioning: true,
      maxVersions: 5,
      autoCleanup: true
    },

    // Monitoring
    monitoring: {
      enableDriftDetection: true,
      driftThreshold: 0.1,
      performanceTracking: true,
      dataQualityChecks: true
    },

    // Scaling
    scaling: {
      minInstances: 1,
      maxInstances: 10,
      targetCpuUtilization: 0.7,
      targetMemoryUtilization: 0.8
    }
  },

  // Data Pipeline Configuration
  DATA_PIPELINE: {
    // Data sources
    sources: {
      market: {
        providers: ['binance', 'coinbase', 'kraken', 'coingecko'],
        primaryProvider: 'binance',
        fallbackProviders: ['coinbase', 'kraken', 'coingecko'],
        updateInterval: 60000, // 1 minute
        retryAttempts: 3,
        timeout: 10000,
        retentionDays: 365
      },
      social: {
        platforms: ['reddit', 'discord', 'telegram'], // Twitter requires special auth
        primaryPlatform: 'reddit',
        updateInterval: 300000, // 5 minutes
        retryAttempts: 2,
        timeout: 15000,
        retentionDays: 90
      },
      news: {
        sources: ['coindesk', 'cointelegraph', 'cryptonews', 'bloomberg'],
        primarySource: 'coindesk',
        updateInterval: 600000, // 10 minutes
        retryAttempts: 2,
        timeout: 15000,
        retentionDays: 180
      },
      onchain: {
        networks: ['ethereum', 'solana', 'polygon', 'avalanche'],
        primaryNetwork: 'ethereum',
        updateInterval: 120000, // 2 minutes
        retryAttempts: 3,
        timeout: 20000,
        retentionDays: 30
      }
    },

    // API Configuration
    apis: {
      binance: {
        baseUrl: 'https://api.binance.com',
        endpoints: {
          klines: '/api/v3/klines'
        },
        rateLimit: 1200 // requests per minute
      },
      coinbase: {
        baseUrl: 'https://api.exchange.coinbase.com',
        endpoints: {
          candles: '/products/{symbol}-USD/candles'
        },
        rateLimit: 200
      },
      kraken: {
        baseUrl: 'https://api.kraken.com',
        endpoints: {
          ohlc: '/0/public/OHLC'
        },
        rateLimit: 1000
      },
      coingecko: {
        baseUrl: 'https://api.coingecko.com/api/v3',
        endpoints: {
          marketChart: '/coins/{symbol}/market_chart'
        },
        rateLimit: 50, // Free tier limit
        requiresApiKey: false
      },
      etherscan: {
        baseUrl: 'https://api.etherscan.io/api',
        requiresApiKey: true,
        rateLimit: 5 // requests per second
      },
      helius: {
        baseUrl: 'https://api.helius.dev',
        requiresApiKey: true,
        rateLimit: 100
      }
    },

    // Data quality thresholds
    quality: {
      minDataPoints: 50,
      maxDataAge: 24 * 60 * 60 * 1000, // 24 hours
      minSentimentConfidence: 0.6,
      minTransactionVolume: 1000,
      minSocialEngagement: 5
    },

    // Feature engineering
    features: {
      technicalIndicators: [
        'rsi', 'macd', 'bollinger_bands', 'moving_averages',
        'volume_profile', 'support_resistance'
      ],
      sentimentFeatures: [
        'polarity', 'subjectivity', 'emotion_scores',
        'authenticity', 'influence', 'engagement'
      ],
      onchainFeatures: [
        'whale_transactions', 'gas_prices', 'network_activity',
        'token_transfers', 'dex_volume'
      ]
    },

    // Preprocessing
    preprocessing: {
      normalization: 'z_score',
      outlierHandling: 'winsorize',
      missingValueStrategy: 'interpolation',
      sequencePadding: 'zero_padding'
    }
  },

  // Evaluation Metrics
  EVALUATION: {
    psychology: {
      classification: [
        'accuracy', 'precision', 'recall', 'f1_score',
        'matthews_corrcoef', 'cohen_kappa'
      ],
      sequence: [
        'rouge_1', 'rouge_2', 'rouge_l', 'bleu',
        'meteor', 'cider'
      ],
      behavioral: [
        'calibration_error', 'discrimination_power',
        'market_correlation', 'sharpe_ratio'
      ]
    },

    oracle: {
      directional: [
        'directional_accuracy', 'matthews_corrcoef',
        'profitability_score', 'sharpe_ratio'
      ],
      regression: [
        'mae', 'mse', 'rmse', 'mape',
        'smape', 'mean_absolute_percentage_error'
      ],
      uncertainty: [
        'ece', 'mce', 'uncertainty_calibration',
        'coverage_probability'
      ]
    }
  }
} as const;

// Type exports for type safety
export type PsychologyModelConfig = typeof ML_CONFIG.PSYCHOLOGY_MODEL;
export type OracleModelConfig = typeof ML_CONFIG.ORACLE_MODEL;
export type TrainingConfig = typeof ML_CONFIG.TRAINING;
export type ServingConfig = typeof ML_CONFIG.SERVING;
export type DataPipelineConfig = typeof ML_CONFIG.DATA_PIPELINE;
export type EvaluationConfig = typeof ML_CONFIG.EVALUATION;

// Environment-specific configurations
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return {
        ...ML_CONFIG,
        TRAINING: {
          ...ML_CONFIG.TRAINING,
          hyperparameters: {
            ...ML_CONFIG.TRAINING.hyperparameters,
            batchSize: 64,
            maxEpochs: 200
          }
        },
        SERVING: {
          ...ML_CONFIG.SERVING,
          scaling: {
            ...ML_CONFIG.SERVING.scaling,
            minInstances: 2,
            maxInstances: 20
          }
        }
      };

    case 'staging':
      return {
        ...ML_CONFIG,
        TRAINING: {
          ...ML_CONFIG.TRAINING,
          hyperparameters: {
            ...ML_CONFIG.TRAINING.hyperparameters,
            batchSize: 16,
            maxEpochs: 50
          }
        }
      };

    default: // development
      return ML_CONFIG;
  }
};

export default ML_CONFIG;
