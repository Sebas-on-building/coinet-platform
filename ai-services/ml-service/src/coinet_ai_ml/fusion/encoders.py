"""
🔥 MULTI-MODAL ENCODERS - THE DIVINE FEATURE EXTRACTORS
======================================================

Advanced neural network encoders for each modality in the multi-modal fusion pipeline:

- CNNEncoder: Convolutional Neural Networks for images and visual data
- TransformerEncoder: Transformer architectures for text and sequential data
- GNNEncoder: Graph Neural Networks for on-chain transaction graphs
- PsychologyEncoder: Specialized encoder for psychological and behavioral patterns

Each encoder extracts rich, meaningful representations that can be fused together
for joint learning and cross-modal understanding.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple, Union, Any
from datetime import datetime
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from dataclasses import dataclass
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

@dataclass
class EncodedFeatures:
    """Features extracted by an encoder"""
    embedding: torch.Tensor
    attention_weights: Optional[torch.Tensor] = None
    feature_importance: Optional[torch.Tensor] = None
    metadata: Optional[Dict] = None
    encoding_time_ms: float = 0.0

class BaseEncoder(ABC):
    """Abstract base class for all encoders"""

    def __init__(self, config: Optional[Dict] = None):
        self.config = config or self._get_default_config()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.is_initialized = False

    @abstractmethod
    def _get_default_config(self) -> Dict:
        """Get default configuration for this encoder"""
        pass

    @abstractmethod
    async def encode(self, input_data: Any) -> EncodedFeatures:
        """Encode input data into feature representation"""
        pass

    async def initialize(self):
        """Initialize the encoder model"""
        if not self.is_initialized:
            await self._build_model()
            self.is_initialized = True
            logger.info(f"✅ {self.__class__.__name__} initialized successfully")

    @abstractmethod
    async def _build_model(self):
        """Build the neural network model"""
        pass

class CNNEncoder(BaseEncoder):
    """
    🖼️ CNN ENCODER - VISUAL INTELLIGENCE ENGINE

    Advanced Convolutional Neural Network encoder for processing:
    - Market charts and price visualizations
    - Social media images and memes
    - Technical indicator heatmaps
    - Volume and order flow visualizations

    Extracts spatial patterns and visual features that traditional
    numerical analysis cannot capture.
    """

    def _get_default_config(self) -> Dict:
        return {
            'input_channels': 3,  # RGB images
            'hidden_dims': [64, 128, 256, 512],
            'kernel_sizes': [3, 3, 3, 3],
            'stride': 2,
            'dropout': 0.1,
            'max_pool_size': 2,
            'feature_dim': 512,
            'use_attention': True,
            'attention_heads': 8,
            'normalization': 'batch_norm',
            'activation': 'relu'
        }

    async def _build_model(self):
        """Build the CNN architecture with optional attention"""

        config = self.config

        # Feature extraction layers
        layers = []
        in_channels = config['input_channels']

        for i, (hidden_dim, kernel_size) in enumerate(zip(config['hidden_dims'], config['kernel_sizes'])):
            layers.extend([
                nn.Conv2d(in_channels, hidden_dim, kernel_size, config['stride']),
                nn.BatchNorm2d(hidden_dim) if config['normalization'] == 'batch_norm' else nn.Identity(),
                nn.ReLU() if config['activation'] == 'relu' else nn.GELU(),
                nn.MaxPool2d(config['max_pool_size']),
                nn.Dropout(config['dropout'])
            ])
            in_channels = hidden_dim

        self.feature_extractor = nn.Sequential(*layers)

        # Global pooling
        self.global_pool = nn.AdaptiveAvgPool2d((1, 1))

        # Optional attention mechanism
        if config['use_attention']:
            self.attention = nn.MultiheadAttention(
                config['feature_dim'],
                config['attention_heads'],
                dropout=config['dropout'],
                batch_first=True
            )

        # Final projection
        self.projection = nn.Linear(config['hidden_dims'][-1], config['feature_dim'])

        # Move to device
        self.feature_extractor.to(self.device)
        if config['use_attention']:
            self.attention.to(self.device)
        self.projection.to(self.device)

        logger.info(f"📊 CNN Encoder model built with {sum(p.numel() for p in self.parameters())} parameters")

    async def encode(self, input_data: Union[torch.Tensor, np.ndarray, Dict]) -> EncodedFeatures:
        """
        Encode visual input data into feature embeddings

        Args:
            input_data: Can be:
                - torch.Tensor: Preprocessed image tensor (B, C, H, W)
                - np.ndarray: Raw image array
                - Dict: Market data for chart generation

        Returns:
            EncodedFeatures with visual embeddings
        """

        start_time = datetime.utcnow()

        # Handle different input types
        if isinstance(input_data, dict):
            # Generate chart from market data
            image_tensor = await self._generate_chart_from_market_data(input_data)
        elif isinstance(input_data, np.ndarray):
            image_tensor = torch.from_numpy(input_data).float()
            if len(image_tensor.shape) == 3:
                image_tensor = image_tensor.permute(2, 0, 1).unsqueeze(0)  # HWC -> BCHW
        else:
            image_tensor = input_data

        # Ensure proper shape and move to device
        if len(image_tensor.shape) == 3:
            image_tensor = image_tensor.unsqueeze(0)  # Add batch dimension

        image_tensor = image_tensor.to(self.device)

        # Feature extraction
        with torch.no_grad():
            features = self.feature_extractor(image_tensor)

            # Global pooling
            pooled_features = self.global_pool(features)
            pooled_features = pooled_features.view(pooled_features.size(0), -1)

            # Optional attention
            if self.config['use_attention']:
                # Self-attention on spatial features
                attn_output, attention_weights = self.attention(
                    pooled_features.unsqueeze(1),
                    pooled_features.unsqueeze(1),
                    pooled_features.unsqueeze(1)
                )
                attended_features = attn_output.squeeze(1)
            else:
                attended_features = pooled_features
                attention_weights = None

            # Final projection
            embedding = self.projection(attended_features)

            # Calculate feature importance (gradient-based or attention-based)
            feature_importance = self._calculate_feature_importance(embedding, attention_weights)

        encoding_time = (datetime.utcnow() - start_time).total_seconds() * 1000

        return EncodedFeatures(
            embedding=embedding.cpu(),
            attention_weights=attention_weights.cpu() if attention_weights is not None else None,
            feature_importance=feature_importance.cpu() if feature_importance is not None else None,
            metadata={
                'input_shape': list(image_tensor.shape),
                'feature_dim': embedding.shape[-1],
                'encoding_method': 'cnn_attention' if self.config['use_attention'] else 'cnn_basic'
            },
            encoding_time_ms=encoding_time
        )

    async def _generate_chart_from_market_data(self, market_data: Dict) -> torch.Tensor:
        """Generate synthetic chart visualization from market data"""

        # Extract price and volume data
        prices = market_data.get('prices', [])
        volumes = market_data.get('volumes', [])

        if not prices:
            # Return blank image if no data
            return torch.zeros(1, 3, 224, 224)

        # Normalize data for visualization
        prices = np.array(prices)
        volumes = np.array(volumes) if volumes else np.ones_like(prices) * np.mean(prices) * 0.01

        # Create simple candlestick-style visualization
        # This is a simplified version - in production, use proper charting library
        height, width = 224, 224
        chart = np.zeros((height, width, 3), dtype=np.float32)

        # Normalize price data to chart dimensions
        price_min, price_max = np.min(prices), np.max(prices)
        price_range = price_max - price_min if price_max > price_min else 1.0

        # Draw price line
        num_points = min(len(prices), width)
        price_indices = np.linspace(0, len(prices) - 1, num_points).astype(int)
        chart_prices = (prices[price_indices] - price_min) / price_range * (height - 20) + 10

        # Draw price line with improved algorithm
        try:
            for i in range(num_points - 1):
                x1 = i * (width // num_points)
                x2 = (i + 1) * (width // num_points)

                # Ensure x coordinates are within bounds
                x1 = max(0, min(x1, width - 1))
                x2 = max(0, min(x2, width - 1))

                y1 = int(chart_prices[i])
                y2 = int(chart_prices[i + 1])

                # Ensure y coordinates are within bounds
                y1 = max(0, min(y1, height - 1))
                y2 = max(0, min(y2, height - 1))

                # Determine line color based on price movement
                if prices[price_indices[i + 1]] > prices[price_indices[i]]:
                    color = (0, 1, 0)  # Green for price increase
                else:
                    color = (1, 0, 0)  # Red for price decrease

                # Bresenham's line algorithm for better line drawing
                self._draw_line(chart, x1, y1, x2, y2, color)

        except Exception as e:
            # Fallback: just draw dots at each point
            logger.warning(f"Line drawing failed, using fallback: {str(e)}")
            for i in range(num_points):
                x = i * (width // num_points)
                y = int(chart_prices[i])
                if 0 <= x < width and 0 <= y < height:
                    chart[y, x] = (1, 1, 0)  # Yellow dots as fallback

        # Add volume bars at bottom with improved error handling
        volume_height = min(30, height // 4)  # Don't take more than 1/4 of height
        volume_max = np.max(volumes) if len(volumes) > 0 and np.max(volumes) > 0 else 1.0

        try:
            for i in range(min(num_points, len(volumes))):
                vol_height = int((volumes[i] / volume_max) * volume_height)
                bar_x = i * (width // num_points)
                bar_width = max(1, width // num_points - 1)

                # Color based on price movement
                if i == 0:
                    color = (0.5, 0.5, 0.5)  # Gray for first bar
                elif prices[price_indices[i]] > prices[price_indices[i-1]]:
                    color = (0, 0.5, 1)  # Blue for volume on up days
                else:
                    color = (1, 0.5, 0)  # Orange for volume on down days

                # Draw volume bar with bounds checking
                for x in range(bar_x, min(bar_x + bar_width, width)):
                    for y_offset in range(vol_height):
                        y = height - 1 - y_offset
                        if 0 <= y < height:
                            chart[y, x] = color

        except Exception as e:
            logger.warning(f"Volume bar drawing failed: {str(e)}")
            # Continue without volume bars

        return torch.from_numpy(chart).permute(2, 0, 1).unsqueeze(0)  # CHW format

    def _draw_line(self, chart: np.ndarray, x1: int, y1: int, x2: int, y2: int, color: tuple):
        """Draw a line on the chart using Bresenham's algorithm"""

        # Bresenham's line algorithm implementation
        dx = abs(x2 - x1)
        dy = abs(y2 - y1)
        sx = 1 if x1 < x2 else -1
        sy = 1 if y1 < y2 else -1
        err = dx - dy

        while True:
            # Set pixel color
            if 0 <= y1 < chart.shape[0] and 0 <= x1 < chart.shape[1]:
                chart[y1, x1] = color

            if x1 == x2 and y1 == y2:
                break

            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x1 += sx
            if e2 < dx:
                err += dx
                y1 += sy

    def _calculate_feature_importance(self, embedding: torch.Tensor, attention_weights: Optional[torch.Tensor]) -> torch.Tensor:
        """Calculate feature importance scores"""

        if attention_weights is not None:
            # Use attention weights as importance
            importance = attention_weights.mean(dim=1)  # Average across heads
        else:
            # Use L2 norm of embedding as importance proxy
            importance = torch.norm(embedding, dim=-1, keepdim=True)

        return importance

class TransformerEncoder(BaseEncoder):
    """
    📝 TRANSFORMER ENCODER - TEXTUAL INTELLIGENCE ENGINE

    Advanced Transformer-based encoder for processing:
    - News articles and headlines
    - Social media posts and comments
    - Financial reports and analysis
    - Market commentary and expert opinions

    Captures contextual relationships and semantic meaning in text data.
    """

    def _get_default_config(self) -> Dict:
        return {
            'vocab_size': 30000,
            'max_length': 512,
            'embedding_dim': 768,
            'hidden_dim': 768,
            'num_layers': 6,
            'num_heads': 12,
            'dropout': 0.1,
            'use_positional_encoding': True,
            'pooling_strategy': 'cls_token',  # cls_token, mean, max
            'pretrained_model': None  # Could use BERT, RoBERTa, etc.
        }

    async def _build_model(self):
        """Build the Transformer encoder architecture"""

        config = self.config

        # Token embedding
        self.token_embedding = nn.Embedding(config['vocab_size'], config['embedding_dim'])

        # Positional encoding
        if config['use_positional_encoding']:
            self.positional_encoding = self._create_positional_encoding(
                config['max_length'], config['embedding_dim']
            )

        # Transformer layers
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=config['hidden_dim'],
            nhead=config['num_heads'],
            dropout=config['dropout'],
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, config['num_layers'])

        # Pooling mechanism
        if config['pooling_strategy'] == 'cls_token':
            self.cls_token = nn.Parameter(torch.randn(1, 1, config['hidden_dim']))

        # Final projection
        self.projection = nn.Linear(config['hidden_dim'], config['hidden_dim'])

        # Move to device
        self.token_embedding.to(self.device)
        self.transformer.to(self.device)
        self.projection.to(self.device)

        if config['use_positional_encoding']:
            self.positional_encoding = self.positional_encoding.to(self.device)

        logger.info(f"📝 Transformer Encoder model built with {sum(p.numel() for p in self.parameters())} parameters")

    def _create_positional_encoding(self, max_length: int, embedding_dim: int) -> torch.Tensor:
        """Create sinusoidal positional encoding"""

        pe = torch.zeros(max_length, embedding_dim)
        position = torch.arange(0, max_length, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, embedding_dim, 2).float() *
                           (-np.log(10000.0) / embedding_dim))

        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)

        return pe.unsqueeze(0)  # Add batch dimension

    async def encode(self, input_data: Union[List[str], torch.Tensor, Dict]) -> EncodedFeatures:
        """
        Encode text input data into contextual embeddings

        Args:
            input_data: Can be:
                - List[str]: Raw text strings
                - torch.Tensor: Tokenized input
                - Dict: Preprocessed text data

        Returns:
            EncodedFeatures with text embeddings
        """

        start_time = datetime.utcnow()

        # Handle different input types
        if isinstance(input_data, list):
            # Tokenize text (simplified - in production use proper tokenizer)
            tokens = await self._tokenize_texts(input_data)
        elif isinstance(input_data, dict):
            tokens = input_data.get('tokens', torch.zeros(1, self.config['max_length'], dtype=torch.long))
        else:
            tokens = input_data

        tokens = tokens.to(self.device)

        with torch.no_grad():
            # Embedding
            embedded = self.token_embedding(tokens)

            if self.config['use_positional_encoding']:
                embedded += self.positional_encoding[:, :embedded.size(1), :]

            # Add CLS token if using that pooling strategy
            if self.config['pooling_strategy'] == 'cls_token':
                batch_size = embedded.size(0)
                cls_tokens = self.cls_token.expand(batch_size, -1, -1)
                embedded = torch.cat([cls_tokens, embedded], dim=1)

            # Transformer encoding
            encoded = self.transformer(embedded)

            # Pooling
            if self.config['pooling_strategy'] == 'cls_token':
                pooled = encoded[:, 0, :]  # CLS token
            elif self.config['pooling_strategy'] == 'mean':
                pooled = encoded.mean(dim=1)
            else:  # max
                pooled = encoded.max(dim=1)[0]

            # Final projection
            embedding = self.projection(pooled)

            # Extract attention weights from transformer
            attention_weights = self._extract_attention_weights(encoded)

            # Calculate feature importance (attention-based)
            feature_importance = self._calculate_text_feature_importance(encoded)

        encoding_time = (datetime.utcnow() - start_time).total_seconds() * 1000

        return EncodedFeatures(
            embedding=embedding.cpu(),
            attention_weights=attention_weights.cpu() if attention_weights is not None else None,
            feature_importance=feature_importance.cpu() if feature_importance is not None else None,
            metadata={
                'input_length': tokens.shape[1],
                'batch_size': tokens.shape[0],
                'encoding_method': f'transformer_{self.config["pooling_strategy"]}'
            },
            encoding_time_ms=encoding_time
        )

    async def _tokenize_texts(self, texts: List[str]) -> torch.Tensor:
        """Deterministic tokenization with proper vocabulary mapping"""

        max_length = self.config['max_length']
        vocab_size = self.config['vocab_size']

        # Create a deterministic vocabulary mapping (much better than hash)
        # In production, this would be a pre-trained vocabulary
        self._build_vocabulary()

        tokens_list = []

        for text in texts:
            # Clean and tokenize text
            import re
            # Remove punctuation and normalize whitespace
            text = re.sub(r'[^\w\s]', '', text.lower())
            words = text.split()

            tokens = []

            for word in words:
                # Use deterministic vocabulary lookup
                token_id = self.vocabulary.get(word, self.config['vocab_size'] - 1)  # UNK token
                tokens.append(token_id)

                if len(tokens) >= max_length - 2:  # Leave room for special tokens
                    break

            # Add special tokens (CLS at start, SEP at end)
            tokens = [self.cls_token_id] + tokens[:max_length-2] + [self.sep_token_id]

            # Pad to max_length
            while len(tokens) < max_length:
                tokens.append(self.pad_token_id)  # Padding token

            tokens_list.append(tokens[:max_length])

        return torch.tensor(tokens_list, dtype=torch.long)

    def _build_vocabulary(self):
        """Build a deterministic vocabulary mapping"""

        if hasattr(self, 'vocabulary'):
            return  # Already built

        # Create a simple but deterministic vocabulary
        # In production, this would be loaded from a pre-trained model
        common_words = [
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'bitcoin', 'btc', 'crypto', 'cryptocurrency', 'price', 'market', 'trading', 'trade',
            'buy', 'sell', 'hold', 'hodl', 'bullish', 'bearish', 'bull', 'bear', 'moon', 'crash',
            'volume', 'high', 'low', 'open', 'close', 'rsi', 'macd', 'sma', 'ema', 'support', 'resistance',
            'breakout', 'breakdown', 'pump', 'dump', 'whale', 'institutional', 'retail', 'exchange',
            'blockchain', 'mining', 'defi', 'nft', 'ethereum', 'eth', 'binance', 'coinbase',
            'analysis', 'technical', 'fundamental', 'sentiment', 'news', 'article', 'report'
        ]

        # Build vocabulary with deterministic mapping
        self.vocabulary = {}
        token_id = 1  # Start from 1, reserve 0 for padding

        for word in common_words:
            self.vocabulary[word] = token_id
            token_id += 1

        # Add numbers and common patterns
        for i in range(100):
            self.vocabulary[str(i)] = token_id
            token_id += 1

        # Special tokens
        self.pad_token_id = 0
        self.cls_token_id = token_id
        token_id += 1
        self.sep_token_id = token_id
        token_id += 1
        self.unk_token_id = token_id

        # Ensure we don't exceed vocab size
        self.config['vocab_size'] = min(self.config['vocab_size'], token_id + 1)

    def _extract_attention_weights(self, encoded: torch.Tensor) -> torch.Tensor:
        """Extract attention weights from transformer layers"""

        # This would require access to intermediate attention weights
        # For now, return uniform weights
        return torch.ones(encoded.shape[0], encoded.shape[1], encoded.shape[1])

    def _calculate_text_feature_importance(self, encoded: torch.Tensor) -> torch.Tensor:
        """Calculate importance of different text segments"""

        # Use attention weights or embedding norms
        importance = torch.norm(encoded, dim=-1)  # L2 norm across embedding dim

        return importance

class GNNEncoder(BaseEncoder):
    """
    🕸️ GRAPH NEURAL NETWORK ENCODER - BLOCKCHAIN INTELLIGENCE ENGINE

    Advanced Graph Neural Network encoder for processing:
    - Transaction graphs and wallet relationships
    - Smart contract interaction networks
    - DeFi protocol interconnections
    - Whale and institutional trading patterns

    Captures complex relational patterns in blockchain data.
    """

    def _get_default_config(self) -> Dict:
        return {
            'node_features': 64,
            'edge_features': 32,
            'hidden_dim': 128,
            'num_layers': 3,
            'aggregation': 'mean',  # mean, sum, max
            'use_edge_weights': True,
            'dropout': 0.1,
            'graph_pooling': 'global_mean'  # global_mean, global_max, hierarchical
        }

    async def _build_model(self):
        """Build the Graph Neural Network architecture"""

        config = self.config

        # GNN layers
        self.gnn_layers = nn.ModuleList()

        for i in range(config['num_layers']):
            layer = GraphConvolutionLayer(
                node_features=config['node_features'] if i == 0 else config['hidden_dim'],
                edge_features=config['edge_features'],
                out_features=config['hidden_dim'],
                use_edge_weights=config['use_edge_weights'],
                dropout=config['dropout']
            )
            self.gnn_layers.append(layer)

        # Graph pooling
        if config['graph_pooling'] == 'global_mean':
            self.graph_pool = GlobalMeanPool()
        elif config['graph_pooling'] == 'global_max':
            self.graph_pool = GlobalMaxPool()
        else:
            self.graph_pool = HierarchicalPool(config['hidden_dim'])

        # Final projection
        self.projection = nn.Linear(config['hidden_dim'], config['hidden_dim'])

        # Move to device
        self.gnn_layers.to(self.device)
        self.projection.to(self.device)

        logger.info(f"🕸️ GNN Encoder model built with {sum(p.numel() for p in self.parameters())} parameters")

    async def encode(self, input_data: Dict) -> EncodedFeatures:
        """
        Encode graph-structured data into embeddings

        Args:
            input_data: Dictionary containing:
                - node_features: Node attribute matrix
                - edge_index: Graph connectivity
                - edge_attr: Edge attributes (optional)

        Returns:
            EncodedFeatures with graph embeddings
        """

        start_time = datetime.utcnow()

        # Extract graph components
        node_features = input_data['node_features'].to(self.device)
        edge_index = input_data['edge_index'].to(self.device)
        edge_attr = input_data.get('edge_attr', None)
        if edge_attr is not None:
            edge_attr = edge_attr.to(self.device)

        with torch.no_grad():
            # GNN encoding
            x = node_features

            for layer in self.gnn_layers:
                x = layer(x, edge_index, edge_attr)

                # Add residual connection and activation
                x = F.relu(x) + x  # Residual connection

            # Graph pooling
            graph_embedding = self.graph_pool(x, None)  # No batch info for now

            # Final projection
            embedding = self.projection(graph_embedding)

            # Calculate node importance (degree centrality proxy)
            feature_importance = self._calculate_node_importance(edge_index, node_features.shape[0])

        encoding_time = (datetime.utcnow() - start_time).total_seconds() * 1000

        return EncodedFeatures(
            embedding=embedding.cpu().unsqueeze(0),  # Add batch dimension
            attention_weights=None,  # GNN doesn't have traditional attention
            feature_importance=feature_importance.cpu(),
            metadata={
                'num_nodes': node_features.shape[0],
                'num_edges': edge_index.shape[1],
                'graph_density': edge_index.shape[1] / (node_features.shape[0] * (node_features.shape[0] - 1)),
                'encoding_method': 'gnn'
            },
            encoding_time_ms=encoding_time
        )

    def _calculate_node_importance(self, edge_index: torch.Tensor, num_nodes: int) -> torch.Tensor:
        """Calculate node importance based on connectivity"""

        # Simple degree centrality
        degrees = torch.zeros(num_nodes)
        degrees.scatter_add_(0, edge_index[0], torch.ones_like(edge_index[0], dtype=torch.float))

        return degrees.unsqueeze(0)  # Add batch dimension

class PsychologyEncoder(BaseEncoder):
    """
    🧠 PSYCHOLOGY ENCODER - BEHAVIORAL PATTERN ENGINE

    Specialized encoder for processing:
    - User behavioral patterns and trading psychology
    - Emotional state indicators
    - Cognitive bias signatures
    - Social influence patterns
    - Risk tolerance profiles

    Transforms psychological data into structured embeddings.
    """

    def _get_default_config(self) -> Dict:
        return {
            'behavioral_features': 32,
            'emotional_features': 16,
            'cognitive_features': 24,
            'social_features': 20,
            'hidden_dim': 128,
            'num_layers': 2,
            'dropout': 0.1,
            'use_attention': True,
            'attention_heads': 4
        }

    async def _build_model(self):
        """Build the psychology encoder architecture"""

        config = self.config

        # Feature-specific layers
        self.behavioral_encoder = nn.Sequential(
            nn.Linear(config['behavioral_features'], config['hidden_dim'] // 2),
            nn.ReLU(),
            nn.Dropout(config['dropout']),
            nn.Linear(config['hidden_dim'] // 2, config['hidden_dim'] // 4)
        )

        self.emotional_encoder = nn.Sequential(
            nn.Linear(config['emotional_features'], config['hidden_dim'] // 4),
            nn.ReLU(),
            nn.Dropout(config['dropout']),
            nn.Linear(config['hidden_dim'] // 4, config['hidden_dim'] // 4)
        )

        self.cognitive_encoder = nn.Sequential(
            nn.Linear(config['cognitive_features'], config['hidden_dim'] // 3),
            nn.ReLU(),
            nn.Dropout(config['dropout']),
            nn.Linear(config['hidden_dim'] // 3, config['hidden_dim'] // 4)
        )

        self.social_encoder = nn.Sequential(
            nn.Linear(config['social_features'], config['hidden_dim'] // 4),
            nn.ReLU(),
            nn.Dropout(config['dropout']),
            nn.Linear(config['hidden_dim'] // 4, config['hidden_dim'] // 4)
        )

        # Cross-modal attention for psychological features
        if config['use_attention']:
            self.cross_attention = nn.MultiheadAttention(
                config['hidden_dim'] // 4,
                config['attention_heads'],
                dropout=config['dropout'],
                batch_first=True
            )

        # Final integration and projection
        self.integration = nn.Sequential(
            nn.Linear(config['hidden_dim'], config['hidden_dim']),
            nn.ReLU(),
            nn.Dropout(config['dropout']),
            nn.Linear(config['hidden_dim'], config['hidden_dim'])
        )

        # Move to device
        self.behavioral_encoder.to(self.device)
        self.emotional_encoder.to(self.device)
        self.cognitive_encoder.to(self.device)
        self.social_encoder.to(self.device)

        if config['use_attention']:
            self.cross_attention.to(self.device)

        self.integration.to(self.device)

        logger.info(f"🧠 Psychology Encoder model built with {sum(p.numel() for p in self.parameters())} parameters")

    async def encode(self, input_data: Dict) -> EncodedFeatures:
        """
        Encode psychological profile data into embeddings

        Args:
            input_data: Dictionary containing psychological features:
                - behavioral: Trading behavior patterns
                - emotional: Emotional state indicators
                - cognitive: Cognitive bias indicators
                - social: Social influence patterns

        Returns:
            EncodedFeatures with psychological embeddings
        """

        start_time = datetime.utcnow()

        # Extract psychological components (support both short and long key names)
        behavioral = input_data.get('behavioral', input_data.get('behavioral_patterns', torch.zeros(self.config['behavioral_features'])))
        emotional = input_data.get('emotional', input_data.get('emotional_state', torch.zeros(self.config['emotional_features'])))
        cognitive = input_data.get('cognitive', input_data.get('cognitive_biases', torch.zeros(self.config['cognitive_features'])))
        social = input_data.get('social', input_data.get('social_influence', torch.zeros(self.config['social_features'])))

        # Convert dicts to tensors if needed (mock data provides dicts)
        def _to_tensor(val, size):
            if isinstance(val, torch.Tensor):
                return val
            if isinstance(val, dict):
                # Extract numeric values from dict, pad/truncate to expected size
                values = [float(v) for v in val.values() if isinstance(v, (int, float))]
                if not values:
                    return torch.zeros(size)
                t = torch.tensor(values, dtype=torch.float32)
                if t.shape[0] < size:
                    t = torch.cat([t, torch.zeros(size - t.shape[0])])
                return t[:size]
            return torch.zeros(size)

        behavioral = _to_tensor(behavioral, self.config['behavioral_features'])
        emotional = _to_tensor(emotional, self.config['emotional_features'])
        cognitive = _to_tensor(cognitive, self.config['cognitive_features'])
        social = _to_tensor(social, self.config['social_features'])

        # Move to device
        behavioral = behavioral.to(self.device)
        emotional = emotional.to(self.device)
        cognitive = cognitive.to(self.device)
        social = social.to(self.device)

        with torch.no_grad():
            # Encode each psychological dimension
            behavioral_encoded = self.behavioral_encoder(behavioral.unsqueeze(0))
            emotional_encoded = self.emotional_encoder(emotional.unsqueeze(0))
            cognitive_encoded = self.cognitive_encoder(cognitive.unsqueeze(0))
            social_encoded = self.social_encoder(social.unsqueeze(0))

            # Concatenate all psychological features
            combined_features = torch.cat([
                behavioral_encoded,
                emotional_encoded,
                cognitive_encoded,
                social_encoded
            ], dim=-1)

            # Apply cross-modal attention if enabled
            if self.config['use_attention']:
                # Self-attention across psychological dimensions
                attn_output, attention_weights = self.cross_attention(
                    combined_features.unsqueeze(1),
                    combined_features.unsqueeze(1),
                    combined_features.unsqueeze(1)
                )
                attended_features = attn_output.squeeze(1)
            else:
                attended_features = combined_features
                attention_weights = None

            # Final integration
            embedding = self.integration(attended_features)

            # Calculate feature importance
            feature_importance = self._calculate_psychological_importance(
                behavioral, emotional, cognitive, social
            )

        encoding_time = (datetime.utcnow() - start_time).total_seconds() * 1000

        return EncodedFeatures(
            embedding=embedding.cpu(),
            attention_weights=attention_weights.cpu() if attention_weights is not None else None,
            feature_importance=feature_importance.cpu(),
            metadata={
                'psychological_dimensions': ['behavioral', 'emotional', 'cognitive', 'social'],
                'encoding_method': 'psychology_attention' if self.config['use_attention'] else 'psychology_basic'
            },
            encoding_time_ms=encoding_time
        )

    def _calculate_psychological_importance(self,
                                         behavioral: torch.Tensor,
                                         emotional: torch.Tensor,
                                         cognitive: torch.Tensor,
                                         social: torch.Tensor) -> torch.Tensor:
        """Calculate importance of different psychological dimensions"""

        # Weight by magnitude of features (higher magnitude = more important)
        importance_scores = torch.tensor([
            torch.norm(behavioral),
            torch.norm(emotional),
            torch.norm(cognitive),
            torch.norm(social)
        ])

        # Normalize to probabilities
        total = importance_scores.sum()
        if total > 0:
            importance_scores = importance_scores / total

        return importance_scores.unsqueeze(0)  # Add batch dimension

# Helper classes for GNN
class GraphConvolutionLayer(nn.Module):
    """Graph Convolution layer for GNN"""

    def __init__(self, node_features: int, edge_features: int, out_features: int,
                 use_edge_weights: bool = True, dropout: float = 0.0):
        super().__init__()
        self.use_edge_weights = use_edge_weights

        # Node transformation
        self.node_transform = nn.Linear(node_features, out_features)

        # Edge transformation (if using edge features)
        if use_edge_weights:
            self.edge_transform = nn.Linear(edge_features, out_features)

        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor, edge_attr: Optional[torch.Tensor] = None):
        # Node transformation
        x_transformed = self.node_transform(x)

        if self.use_edge_weights and edge_attr is not None:
            # Edge transformation
            edge_attr_transformed = self.edge_transform(edge_attr)

            # Apply edge weights (simplified message passing)
            row, col = edge_index
            messages = edge_attr_transformed * x_transformed[col]
            aggregated = torch.zeros_like(x_transformed).scatter_add_(0, row.unsqueeze(1).expand(-1, x_transformed.size(1)), messages)
        else:
            # Simple aggregation without edge weights
            row, col = edge_index
            aggregated = torch.zeros_like(x_transformed).scatter_add_(0, row.unsqueeze(1).expand(-1, x_transformed.size(1)), x_transformed[col])

        return self.dropout(aggregated)

class GlobalMeanPool(nn.Module):
    """Global mean pooling for graph-level representations"""

    def forward(self, x: torch.Tensor, batch: Optional[torch.Tensor] = None):
        if batch is None:
            # Single graph case
            return x.mean(dim=0)
        else:
            # Multiple graphs case
            return torch.stack([x[batch == i].mean(dim=0) for i in torch.unique(batch)])

class GlobalMaxPool(nn.Module):
    """Global max pooling for graph-level representations"""

    def forward(self, x: torch.Tensor, batch: Optional[torch.Tensor] = None):
        if batch is None:
            return x.max(dim=0, keepdim=True)[0]
        else:
            return torch.stack([x[batch == i].max(dim=0)[0] for i in torch.unique(batch)])

class HierarchicalPool(nn.Module):
    """Hierarchical pooling for graph-level representations"""

    def __init__(self, hidden_dim: int):
        super().__init__()
        self.pool_mlp = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1)
        )

    def forward(self, x: torch.Tensor, batch: Optional[torch.Tensor] = None):
        # Score-based hierarchical pooling (simplified)
        scores = self.pool_mlp(x).squeeze(-1)
        pooled = (x * scores.unsqueeze(-1)).sum(dim=0, keepdim=True)
        return pooled
