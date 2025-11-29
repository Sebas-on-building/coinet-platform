#!/bin/bash

# Exit on error
set -e

# Load environment variables
source .env.production

# Build the application
echo "Building application..."
npm run build

# Deploy to production
echo "Deploying to production..."
npm run start

# Setup SSL certificates
echo "Setting up SSL certificates..."
certbot --nginx -d coinet.co -d www.coinet.co -d api.coinet.co -d cdn.coinet.co

# Configure Nginx
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/coinet.co << 'EOL'
server {
    listen 80;
    server_name coinet.co www.coinet.co;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name coinet.co www.coinet.co;

    ssl_certificate /etc/letsencrypt/live/coinet.co/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/coinet.co/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL

# Enable the site
ln -sf /etc/nginx/sites-available/coinet.co /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

echo "Deployment complete! Your site should be available at https://coinet.co" 