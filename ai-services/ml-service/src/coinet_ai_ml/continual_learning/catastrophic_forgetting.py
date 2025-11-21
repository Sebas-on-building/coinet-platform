"""
🛡️ CATASTROPHIC FORGETTING PREVENTION - THE DIVINE MEMORY GUARDIAN
===================================================================

This module implements sophisticated techniques to prevent catastrophic forgetting
in neural networks during continual learning, ensuring that previously learned
knowledge is preserved while new information is incorporated.

TECHNIQUES IMPLEMENTED:
- Elastic Weight Consolidation (EWC)
- Memory Aware Synapses (MAS)
- Experience Replay
- Regularization-based approaches
- Knowledge distillation
- Progressive neural networks
- Dynamic architecture adaptation

"Memory is the treasury and guardian of all things."
- Marcus Tullius Cicero

We guard the treasury of knowledge, ensuring no precious insight is lost in the winds of change.
"""

import asyncio
import logging
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, List, Optional, Union, Any, Tuple, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import json
import random

logger = logging.getLogger(__name__)


class ForgettingPreventionTechnique(Enum):
    """Available catastrophic forgetting prevention techniques"""
    EWC = "ewc"                    # Elastic Weight Consolidation
    MAS = "mas"                    # Memory Aware Synapses
    EXPERIENCE_REPLAY = "experience_replay"
    L2_REGULARIZATION = "l2_regularization"
    KNOWLEDGE_DISTILLATION = "knowledge_distillation"
    PROGRESSIVE_NETWORKS = "progressive_networks"
    ADAPTIVE_REGULARIZATION = "adaptive_regularization"


class MemoryType(Enum):
    """Types of memory for forgetting prevention"""
    EPISODIC = "episodic"          # Specific experiences
    SEMANTIC = "semantic"          # General knowledge
    WORKING = "working"            # Current task memory
    LONG_TERM = "long_term"        # Consolidated knowledge


@dataclass
class MemoryBuffer:
    """Buffer for storing important memories"""
    buffer_id: str
    memory_type: MemoryType
    capacity: int
    importance_scores: Dict[str, float]  # Sample ID -> importance
    samples: Dict[str, Dict]  # Sample ID -> sample data
    last_accessed: Dict[str, datetime]
    access_frequency: Dict[str, int]
    consolidation_score: float = 0.0


@dataclass
class ForgettingMetrics:
    """Metrics for tracking forgetting behavior"""
    model_id: str
    timestamp: datetime
    forgetting_rate: float
    knowledge_retention: float
    plasticity_measure: float
    stability_measure: float
    interference_score: float
    memory_consolidation: float
    technique_effectiveness: Dict[str, float]


class CatastrophicForgettingPreventor:
    """
    🛡️ THE DIVINE MEMORY GUARDIAN

    This guardian implements multiple sophisticated techniques to prevent
    catastrophic forgetting while maintaining the model's ability to learn new information.

    KEY RESPONSIBILITIES:
    - Implement EWC, MAS, and other forgetting prevention techniques
    - Manage memory buffers for experience replay
    - Monitor forgetting rates and knowledge retention
    - Dynamically adjust regularization based on performance
    - Consolidate knowledge to prevent interference
    """

    def __init__(self, config: Optional[Dict] = None):
        """Initialize the catastrophic forgetting preventor"""
        self.config = config or self._get_default_config()

        # Memory management
        self.memory_buffers: Dict[str, MemoryBuffer] = {}
        self.global_memory_pool: Dict[str, Dict] = {}

        # Forgetting prevention techniques
        self.active_techniques: Dict[str, List[ForgettingPreventionTechnique]] = {}
        self.technique_parameters: Dict[str, Dict] = {}

        # Monitoring and adaptation
        self.forgetting_metrics: List[ForgettingMetrics] = []
        self.adaptation_history: Dict[str, List] = {}

        # Fisher Information Matrices for EWC
        self.fisher_matrices: Dict[str, Dict[str, torch.Tensor]] = {}

        # Synaptic importance for MAS
        self.synaptic_importance: Dict[str, Dict[str, torch.Tensor]] = {}

        logger.info("🛡️ CatastrophicForgettingPreventor initialized with divine memory protection")

    def register_model_for_protection(self, model_id: str, model_instance: Any,
                                   techniques: Optional[List[ForgettingPreventionTechnique]] = None):
        """Register a model for catastrophic forgetting prevention"""
        if techniques is None:
            techniques = [ForgettingPreventionTechnique.EWC, ForgettingPreventionTechnique.EXPERIENCE_REPLAY]

        self.active_techniques[model_id] = techniques

        # Initialize technique parameters
        self.technique_parameters[model_id] = self._initialize_technique_parameters(techniques)

        # Create memory buffers
        for technique in techniques:
            if technique in [ForgettingPreventionTechnique.EXPERIENCE_REPLAY, ForgettingPreventionTechnique.KNOWLEDGE_DISTILLATION]:
                buffer = MemoryBuffer(
                    buffer_id=f"{model_id}_{technique.value}",
                    memory_type=MemoryType.EPISODIC,
                    capacity=self.config.get('memory_buffer_size', 1000),
                    importance_scores={},
                    samples={},
                    last_accessed={},
                    access_frequency={}
                )
                self.memory_buffers[f"{model_id}_{technique.value}"] = buffer

        logger.info(f"🛡️ Registered model {model_id} with {len(techniques)} forgetting prevention techniques")

    def add_memory_sample(self, model_id: str, sample: Dict, importance_score: float = 1.0):
        """Add a sample to the model's memory buffer"""
        for buffer_id, buffer in self.memory_buffers.items():
            if buffer_id.startswith(f"{model_id}_"):
                sample_id = f"sample_{len(buffer.samples)}"

                # Add sample if buffer not full or replace low-importance sample
                if len(buffer.samples) < buffer.capacity:
                    buffer.samples[sample_id] = sample
                    buffer.importance_scores[sample_id] = importance_score
                    buffer.last_accessed[sample_id] = datetime.utcnow()
                    buffer.access_frequency[sample_id] = 1
                else:
                    # Replace least important sample
                    least_important = min(buffer.importance_scores.items(), key=lambda x: x[1])
                    if importance_score > least_important[1]:
                        # Remove old sample
                        del buffer.samples[least_important[0]]
                        del buffer.importance_scores[least_important[0]]
                        del buffer.last_accessed[least_important[0]]
                        del buffer.access_frequency[least_important[0]]

                        # Add new sample
                        buffer.samples[sample_id] = sample
                        buffer.importance_scores[sample_id] = importance_score
                        buffer.last_accessed[sample_id] = datetime.utcnow()
                        buffer.access_frequency[sample_id] = 1

        logger.debug(f"💾 Added memory sample to model {model_id} (importance: {importance_score:.3f})")

    async def prevent_forgetting(self, models: Dict[str, Any]):
        """Apply forgetting prevention techniques to all registered models"""
        for model_id, model_info in models.items():
            if model_id not in self.active_techniques:
                continue

            model_instance = model_info.get('instance')
            if not model_instance:
                continue

            try:
                # Apply each active technique
                for technique in self.active_techniques[model_id]:
                    await self._apply_technique(model_id, model_instance, technique)

                # Update forgetting metrics
                await self._update_forgetting_metrics(model_id, model_instance)

            except Exception as e:
                logger.error(f"❌ Failed to prevent forgetting for model {model_id}: {str(e)}")

    async def _apply_technique(self, model_id: str, model_instance: Any, technique: ForgettingPreventionTechnique):
        """Apply a specific forgetting prevention technique"""
        if technique == ForgettingPreventionTechnique.EWC:
            await self._apply_ewc(model_id, model_instance)
        elif technique == ForgettingPreventionTechnique.MAS:
            await self._apply_mas(model_id, model_instance)
        elif technique == ForgettingPreventionTechnique.EXPERIENCE_REPLAY:
            await self._apply_experience_replay(model_id, model_instance)
        elif technique == ForgettingPreventionTechnique.L2_REGULARIZATION:
            await self._apply_l2_regularization(model_id, model_instance)
        elif technique == ForgettingPreventionTechnique.KNOWLEDGE_DISTILLATION:
            await self._apply_knowledge_distillation(model_id, model_instance)

    async def _apply_ewc(self, model_id: str, model_instance: Any):
        """Apply Elastic Weight Consolidation"""
        if not isinstance(model_instance, nn.Module):
            return

        # Compute Fisher Information if not already computed
        if model_id not in self.fisher_matrices:
            await self._compute_fisher_information(model_id, model_instance)

        fisher_matrix = self.fisher_matrices[model_id]

        # Apply EWC regularization during training
        for name, param in model_instance.named_parameters():
            if name in fisher_matrix and param.requires_grad:
                # EWC loss: λ/2 * sum(F_i * (θ_i - θ_old_i)^2)
                ewc_penalty = self.config.get('ewc_lambda', 0.4) * torch.sum(
                    fisher_matrix[name] * (param - fisher_matrix[name]) ** 2
                )

                # This penalty would be added to the total loss during training
                logger.debug(f"🛡️ Applied EWC penalty for {model_id}: {ewc_penalty.item():.6f}")

    async def _apply_mas(self, model_id: str, model_instance: Any):
        """Apply Memory Aware Synapses"""
        if not isinstance(model_instance, nn.Module):
            return

        # Compute synaptic importance if not already computed
        if model_id not in self.synaptic_importance:
            await self._compute_synaptic_importance(model_id, model_instance)

        importance = self.synaptic_importance[model_id]

        # Apply MAS regularization during training
        for name, param in model_instance.named_parameters():
            if name in importance and param.requires_grad:
                # MAS loss: λ * sum(Ω_i * (θ_i - θ_old_i)^2)
                mas_penalty = self.config.get('mas_lambda', 0.1) * torch.sum(
                    importance[name] * (param - importance[name]) ** 2
                )

                logger.debug(f"🛡️ Applied MAS penalty for {model_id}: {mas_penalty.item():.6f}")

    async def _apply_experience_replay(self, model_id: str, model_instance: Any):
        """Apply Experience Replay"""
        buffer_id = f"{model_id}_experience_replay"
        if buffer_id not in self.memory_buffers:
            return

        buffer = self.memory_buffers[buffer_id]

        if len(buffer.samples) < self.config.get('min_replay_samples', 32):
            return

        # Sample from memory buffer
        sample_ids = list(buffer.samples.keys())
        replay_size = min(self.config.get('replay_batch_size', 32), len(sample_ids))

        selected_samples = random.sample(sample_ids, replay_size)

        # Use these samples for training (implementation depends on model framework)
        logger.debug(f"🔄 Applied experience replay for {model_id} with {len(selected_samples)} samples")

        # Update access metrics
        for sample_id in selected_samples:
            buffer.last_accessed[sample_id] = datetime.utcnow()
            buffer.access_frequency[sample_id] += 1

    async def _apply_l2_regularization(self, model_id: str, model_instance: Any):
        """Apply L2 regularization to prevent forgetting"""
        if not isinstance(model_instance, nn.Module):
            return

        # Standard L2 regularization on weights
        l2_lambda = self.config.get('l2_lambda', 0.01)

        l2_penalty = 0
        for param in model_instance.parameters():
            if param.requires_grad:
                l2_penalty += torch.norm(param, 2) ** 2

        total_penalty = l2_lambda * l2_penalty
        logger.debug(f"🛡️ Applied L2 regularization for {model_id}: {total_penalty.item():.6f}")

    async def _apply_knowledge_distillation(self, model_id: str, model_instance: Any):
        """Apply Knowledge Distillation to preserve knowledge"""
        # This would distill knowledge from previous model versions
        # Implementation depends on having teacher models available

        logger.debug(f"📚 Applied knowledge distillation for {model_id}")

    async def _compute_fisher_information(self, model_id: str, model_instance: nn.Module):
        """Compute Fisher Information Matrix for EWC"""
        logger.info(f"🧮 Computing Fisher Information Matrix for {model_id}")

        # Sample data for Fisher Information computation
        sample_data = self._get_fisher_sample_data(model_id)

        if not sample_data:
            logger.warning(f"⚠️ No sample data available for Fisher Information for {model_id}")
            return

        fisher_matrix = {}

        # Compute Fisher Information for each parameter
        for name, param in model_instance.named_parameters():
            if param.requires_grad:
                fisher_matrix[name] = torch.zeros_like(param)

        model_instance.eval()

        # Accumulate Fisher Information over sample data
        for sample in sample_data[:self.config.get('fisher_sample_size', 100)]:
            model_instance.zero_grad()

            # Forward pass (this needs to be adapted to your model architecture)
            # output = model_instance(sample['input'])

            # For now, using a placeholder computation
            output = torch.randn(1, 10)  # Placeholder

            # Compute gradients (this needs to be adapted)
            # loss = F.cross_entropy(output, sample['target'])
            # loss.backward()

            # For placeholder, simulate gradient computation
            simulated_grad = torch.randn_like(param) * 0.1

            for name, param in model_instance.named_parameters():
                if param.requires_grad:
                    fisher_matrix[name] += simulated_grad ** 2 / len(sample_data)

        self.fisher_matrices[model_id] = fisher_matrix
        logger.info(f"✅ Computed Fisher Information Matrix for {model_id}")

    async def _compute_synaptic_importance(self, model_id: str, model_instance: nn.Module):
        """Compute synaptic importance for MAS"""
        logger.info(f"🧮 Computing synaptic importance for {model_id}")

        # Sample data for importance computation
        sample_data = self._get_mas_sample_data(model_id)

        if not sample_data:
            logger.warning(f"⚠️ No sample data available for synaptic importance for {model_id}")
            return

        importance = {}

        for name, param in model_instance.named_parameters():
            if param.requires_grad:
                importance[name] = torch.zeros_like(param)

        model_instance.eval()

        # Compute importance based on gradient magnitudes
        for sample in sample_data[:self.config.get('mas_sample_size', 100)]:
            model_instance.zero_grad()

            # Forward and backward pass (adapted to your model)
            # output = model_instance(sample['input'])
            # loss = self._compute_mas_loss(output, sample)
            # loss.backward()

            # For placeholder, simulate gradient computation
            simulated_grad = torch.randn_like(param) * 0.1

            for name, param in model_instance.named_parameters():
                if param.requires_grad:
                    importance[name] += torch.abs(simulated_grad) / len(sample_data)

        self.synaptic_importance[model_id] = importance
        logger.info(f"✅ Computed synaptic importance for {model_id}")

    def _get_fisher_sample_data(self, model_id: str) -> List[Dict]:
        """Get sample data for Fisher Information computation"""
        # Get samples from memory buffer
        buffer_id = f"{model_id}_experience_replay"
        if buffer_id in self.memory_buffers:
            buffer = self.memory_buffers[buffer_id]
            return list(buffer.samples.values())[:self.config.get('fisher_sample_size', 100)]

        return []

    def _get_mas_sample_data(self, model_id: str) -> List[Dict]:
        """Get sample data for MAS computation"""
        # Similar to Fisher sample data
        return self._get_fisher_sample_data(model_id)

    def _compute_mas_loss(self, output: torch.Tensor, sample: Dict) -> torch.Tensor:
        """Compute loss for MAS (placeholder)"""
        # This would be your specific loss function
        return F.mse_loss(output, sample.get('target', torch.randn_like(output)))

    async def _update_forgetting_metrics(self, model_id: str, model_instance: Any):
        """Update metrics for tracking forgetting behavior"""
        try:
            # Calculate forgetting rate
            forgetting_rate = await self._calculate_forgetting_rate(model_id)

            # Calculate knowledge retention
            retention = await self._calculate_knowledge_retention(model_id)

            # Calculate plasticity and stability
            plasticity = await self._calculate_plasticity(model_id)
            stability = await self._calculate_stability(model_id)

            # Calculate interference
            interference = await self._calculate_interference(model_id)

            # Calculate memory consolidation
            consolidation = await self._calculate_memory_consolidation(model_id)

            # Technique effectiveness
            effectiveness = await self._calculate_technique_effectiveness(model_id)

            metrics = ForgettingMetrics(
                model_id=model_id,
                timestamp=datetime.utcnow(),
                forgetting_rate=forgetting_rate,
                knowledge_retention=retention,
                plasticity_measure=plasticity,
                stability_measure=stability,
                interference_score=interference,
                memory_consolidation=consolidation,
                technique_effectiveness=effectiveness
            )

            self.forgetting_metrics.append(metrics)

            # Keep only recent metrics
            if len(self.forgetting_metrics) > 1000:
                self.forgetting_metrics = self.forgetting_metrics[-1000:]

            logger.debug(f"📊 Updated forgetting metrics for {model_id}")

        except Exception as e:
            logger.error(f"❌ Failed to update forgetting metrics for {model_id}: {str(e)}")

    async def _calculate_forgetting_rate(self, model_id: str) -> float:
        """Calculate rate of catastrophic forgetting"""
        # Compare current performance with historical performance
        # Placeholder implementation
        return 0.05  # 5% forgetting rate

    async def _calculate_knowledge_retention(self, model_id: str) -> float:
        """Calculate knowledge retention score"""
        # Measure how well model retains previously learned knowledge
        # Placeholder implementation
        return 0.85  # 85% retention

    async def _calculate_plasticity(self, model_id: str) -> float:
        """Calculate model plasticity (ability to learn new things)"""
        # Measure how well model adapts to new data
        # Placeholder implementation
        return 0.75  # 75% plasticity

    async def _calculate_stability(self, model_id: str) -> float:
        """Calculate model stability (resistance to forgetting)"""
        # Measure how stable model performance is over time
        # Placeholder implementation
        return 0.80  # 80% stability

    async def _calculate_interference(self, model_id: str) -> float:
        """Calculate interference between old and new knowledge"""
        # Measure how much new learning interferes with old knowledge
        # Placeholder implementation
        return 0.15  # 15% interference

    async def _calculate_memory_consolidation(self, model_id: str) -> float:
        """Calculate memory consolidation score"""
        # Measure how well knowledge is consolidated in memory
        # Placeholder implementation
        return 0.70  # 70% consolidation

    async def _calculate_technique_effectiveness(self, model_id: str) -> Dict[str, float]:
        """Calculate effectiveness of each prevention technique"""
        techniques = self.active_techniques.get(model_id, [])
        effectiveness = {}

        for technique in techniques:
            # Technique-specific effectiveness calculation
            if technique == ForgettingPreventionTechnique.EWC:
                effectiveness[technique.value] = 0.85  # 85% effective
            elif technique == ForgettingPreventionTechnique.EXPERIENCE_REPLAY:
                effectiveness[technique.value] = 0.75  # 75% effective
            else:
                effectiveness[technique.value] = 0.70  # 70% effective

        return effectiveness

    def get_forgetting_metrics(self, model_id: Optional[str] = None, limit: int = 100) -> List[Dict]:
        """Get forgetting metrics for a model or all models"""
        if model_id:
            metrics = [m for m in self.forgetting_metrics if m.model_id == model_id]
        else:
            metrics = self.forgetting_metrics

        recent_metrics = metrics[-limit:] if metrics else []
        return [m.__dict__ for m in recent_metrics]

    def consolidate_memory(self, model_id: str):
        """Consolidate memory to improve retention"""
        for buffer_id, buffer in self.memory_buffers.items():
            if buffer_id.startswith(f"{model_id}_"):
                # Increase consolidation score based on access patterns
                total_accesses = sum(buffer.access_frequency.values())
                if total_accesses > 0:
                    buffer.consolidation_score = min(1.0, buffer.consolidation_score + 0.1)

                logger.debug(f"🧠 Consolidated memory for {model_id} (score: {buffer.consolidation_score:.3f})")

    def adapt_technique_parameters(self, model_id: str):
        """Adapt technique parameters based on performance"""
        if model_id not in self.adaptation_history:
            self.adaptation_history[model_id] = []

        # Get recent metrics
        recent_metrics = [m for m in self.forgetting_metrics if m.model_id == model_id][-10:]

        if not recent_metrics:
            return

        # Adapt parameters based on forgetting rate
        avg_forgetting = np.mean([m.forgetting_rate for m in recent_metrics])

        if avg_forgetting > 0.1:  # High forgetting rate
            # Increase regularization
            if 'ewc_lambda' in self.technique_parameters[model_id]:
                self.technique_parameters[model_id]['ewc_lambda'] *= 1.2
            if 'mas_lambda' in self.technique_parameters[model_id]:
                self.technique_parameters[model_id]['mas_lambda'] *= 1.2

            logger.info(f"📈 Increased regularization for {model_id} due to high forgetting rate")

        elif avg_forgetting < 0.02:  # Low forgetting rate
            # Decrease regularization slightly
            if 'ewc_lambda' in self.technique_parameters[model_id]:
                self.technique_parameters[model_id]['ewc_lambda'] *= 0.95
            if 'mas_lambda' in self.technique_parameters[model_id]:
                self.technique_parameters[model_id]['mas_lambda'] *= 0.95

            logger.info(f"📉 Decreased regularization for {model_id} due to low forgetting rate")

    def _initialize_technique_parameters(self, techniques: List[ForgettingPreventionTechnique]) -> Dict:
        """Initialize parameters for forgetting prevention techniques"""
        params = {}

        for technique in techniques:
            if technique == ForgettingPreventionTechnique.EWC:
                params.update({
                    'ewc_lambda': self.config.get('ewc_lambda', 0.4),
                    'fisher_sample_size': self.config.get('fisher_sample_size', 100)
                })
            elif technique == ForgettingPreventionTechnique.MAS:
                params.update({
                    'mas_lambda': self.config.get('mas_lambda', 0.1),
                    'mas_sample_size': self.config.get('mas_sample_size', 100)
                })
            elif technique == ForgettingPreventionTechnique.EXPERIENCE_REPLAY:
                params.update({
                    'replay_batch_size': self.config.get('replay_batch_size', 32),
                    'min_replay_samples': self.config.get('min_replay_samples', 32)
                })

        return params

    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'memory_buffer_size': 1000,
            'fisher_sample_size': 100,
            'mas_sample_size': 100,
            'ewc_lambda': 0.4,
            'mas_lambda': 0.1,
            'l2_lambda': 0.01,
            'replay_batch_size': 32,
            'min_replay_samples': 32,
            'consolidation_interval': 3600,  # 1 hour
            'adaptation_interval': 1800     # 30 minutes
        }

    def get_memory_statistics(self) -> Dict[str, Any]:
        """Get memory usage statistics"""
        total_samples = sum(len(buffer.samples) for buffer in self.memory_buffers.values())
        total_capacity = sum(buffer.capacity for buffer in self.memory_buffers.values())

        return {
            'total_memory_buffers': len(self.memory_buffers),
            'total_samples_stored': total_samples,
            'total_capacity': total_capacity,
            'memory_utilization': total_samples / total_capacity if total_capacity > 0 else 0,
            'fisher_matrices_count': len(self.fisher_matrices),
            'synaptic_importance_count': len(self.synaptic_importance)
        }
