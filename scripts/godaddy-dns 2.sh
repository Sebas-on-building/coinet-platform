#!/bin/bash

# GoDaddy API credentials
GODADDY_API_KEY="your-api-key"
GODADDY_API_SECRET="your-api-secret"
DOMAIN="coinet.co"

# Your server's IP address
SERVER_IP="YOUR_SERVER_IP"

# Function to make API calls to GoDaddy
call_godaddy_api() {
    local method=$1
    local endpoint=$2
    local data=$3

    curl -X $method \
        -H "Authorization: sso-key $GODADDY_API_KEY:$GODADDY_API_SECRET" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "https://api.godaddy.com/v1$endpoint"
}

echo "Configuring DNS records for $DOMAIN..."

# Create A record for root domain
echo "Creating A record for @..."
call_godaddy_api "PUT" "/domains/$DOMAIN/records/A/@" "[{\"data\":\"$SERVER_IP\",\"ttl\":3600}]"

# Create CNAME record for www
echo "Creating CNAME record for www..."
call_godaddy_api "PUT" "/domains/$DOMAIN/records/CNAME/www" "[{\"data\":\"@\",\"ttl\":3600}]"

# Create CNAME record for api
echo "Creating CNAME record for api..."
call_godaddy_api "PUT" "/domains/$DOMAIN/records/CNAME/api" "[{\"data\":\"@\",\"ttl\":3600}]"

# Create CNAME record for cdn
echo "Creating CNAME record for cdn..."
call_godaddy_api "PUT" "/domains/$DOMAIN/records/CNAME/cdn" "[{\"data\":\"@\",\"ttl\":3600}]"

echo "DNS configuration complete!" 