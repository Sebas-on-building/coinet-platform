import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
from coinet_ai_ml.continual_learning.causal_inference import CausalInferenceEngine

@pytest.fixture
def sample_engine():
    """Create a test causal inference engine"""
    return CausalInferenceEngine()

@pytest.fixture
def sample_time_series_data():
    """Create sample time series data for testing"""
    np.random.seed(42)
    n_points = 100

    # Create synthetic time series with known causal relationships
    # X -> Y (true causal relationship)
    noise_x = np.random.normal(0, 0.1, n_points)
    noise_y = np.random.normal(0, 0.1, n_points)

    x = np.cumsum(noise_x)  # Random walk for X
    y = 0.5 * x + noise_y   # Y is caused by X with some noise

    return {
        'x_variable': x.tolist(),
        'y_variable': y.tolist(),
        'z_variable': np.random.normal(0, 0.2, n_points).tolist(),  # Confounder
        'w_variable': np.random.normal(0, 0.15, n_points).tolist()  # Independent variable
    }

@pytest.fixture
def sample_market_data():
    """Create sample market data for testing"""
    np.random.seed(42)
    n_points = 100

    # Simulate market relationships with Granger causality
    news_sentiment = np.random.normal(0, 1, n_points)
    btc_price = np.zeros(n_points)
    trading_volume = np.zeros(n_points)

    for i in range(1, n_points):
        # news_sentiment Granger-causes btc_price (lagged effect)
        btc_price[i] = 40000 + 500 * news_sentiment[i-1] + np.random.normal(0, 200)
        # trading_volume is influenced by btc_price (contemporaneous correlation)
        trading_volume[i] = 1000000 + 50 * btc_price[i] + np.random.normal(0, 50000)

    # Convert to list and add other independent variables
    return {
        'btc_price': btc_price.tolist(),
        'news_sentiment': news_sentiment.tolist(),
        'trading_volume': trading_volume.tolist(),
        'fear_greed_index': np.random.randint(0, 100, n_points).tolist(),
        'social_media_activity': np.random.exponential(100, n_points).tolist()
    }
