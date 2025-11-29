"""
Configuration settings for Coinet AI ML Service
"""

from typing import Dict, Any, List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        env_file_encoding="utf-8"
    )
    
    database_url: str = "sqlite:///./coinet.db"
    secret_key: str = "your-secret-key-here"
    debug: bool = True
    host: str = "localhost"
    port: int = 8000
    # For FastAPI compatibility, use a consistent case for DEBUG
    DEBUG: bool = True
    ALLOWED_HOSTS: List[str] = ["*"]  # For CORS middleware

    # API settings
    api_title: str = "Coinet AI ML Service"
    api_description: str = "Advanced multi-modal AI for cryptocurrency analysis"
    api_version: str = "1.0.0"

    # Model settings
    model_cache_dir: str = "./models"
    max_batch_size: int = 32

    # Service URLs
    service_urls: Dict[str, str] = {
        'market_data': 'http://localhost:4001',
        'social_media': 'http://localhost:4002',
        'news_aggregator': 'http://localhost:4003',
        'onchain_monitor': 'http://localhost:4004',
        'psychology_engine': 'http://localhost:4005'
    }

# Global settings instance
settings = Settings()
