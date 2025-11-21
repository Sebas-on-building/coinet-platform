#!/bin/bash
# Script to add Solana QuickNode configuration to .env file

ENV_FILE=".env"

# Check if .env exists, if not create it
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env file..."
    touch "$ENV_FILE"
fi

# Check if Solana config already exists
if grep -q "QUICKNODE_SOLANA_HTTP_URL" "$ENV_FILE"; then
    echo "⚠️  Solana configuration already exists in .env"
    echo "Current Solana config:"
    grep "SOLANA" "$ENV_FILE"
    echo ""
    read -p "Do you want to replace it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove existing Solana config
        sed -i.bak '/QUICKNODE_SOLANA/d' "$ENV_FILE"
        echo "✅ Removed old Solana config"
    else
        echo "Keeping existing config. Exiting."
        exit 0
    fi
fi

# Add Solana configuration
echo "" >> "$ENV_FILE"
echo "# ========================================" >> "$ENV_FILE"
echo "# QuickNode Solana Configuration" >> "$ENV_FILE"
echo "# ========================================" >> "$ENV_FILE"
echo "QUICKNODE_ENABLED=true" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"
echo "# Solana Mainnet Beta" >> "$ENV_FILE"
echo "QUICKNODE_SOLANA_HTTP_URL=https://weathered-hidden-slug.solana-mainnet.quiknode.pro/44683f819e68e9ba0907456706dd559c8f4c7656/" >> "$ENV_FILE"
echo "QUICKNODE_SOLANA_WS_URL=wss://weathered-hidden-slug.solana-mainnet.quiknode.pro/44683f819e68e9ba0907456706dd559c8f4c7656/" >> "$ENV_FILE"
echo "QUICKNODE_SOLANA_CU_PER_SEC=300" >> "$ENV_FILE"

echo "✅ Solana configuration added to .env file!"
echo ""
echo "Verifying..."
grep "SOLANA" "$ENV_FILE"

