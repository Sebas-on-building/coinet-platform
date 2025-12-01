# Setting up Coinet.co with GoDaddy

This guide will help you set up your Coinet.co domain with GoDaddy hosting.

## Prerequisites

1. A GoDaddy account with access to your domain
2. Your GoDaddy API credentials (API Key and API Secret)
3. A server with SSH access
4. Nginx installed on your server
5. Certbot installed on your server

## Step 1: Configure DNS Records in GoDaddy

1. Log in to your GoDaddy account
2. Go to your Domain Settings
3. Navigate to the DNS Management section
4. Add the following DNS records:

### A Record (Root Domain)

- Type: A
- Host: @
- Points to: [Your Server IP]
- TTL: 1 Hour

### CNAME Records

- Type: CNAME
- Host: www
- Points to: @
- TTL: 1 Hour

- Type: CNAME
- Host: api
- Points to: @
- TTL: 1 Hour

- Type: CNAME
- Host: cdn
- Points to: @
- TTL: 1 Hour

## Step 2: Set Up SSL Certificate

1. Install Certbot if not already installed:

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
```

2. Obtain SSL certificate:

```bash
sudo certbot --nginx -d coinet.co -d www.coinet.co -d api.coinet.co -d cdn.coinet.co
```

## Step 3: Deploy the Application

1. Make the deployment script executable:

```bash
chmod +x scripts/deploy-godaddy.sh
```

2. Update the environment variables in `.env.production`:

```bash
NEXT_PUBLIC_SITE_URL=https://coinet.co
NEXT_PUBLIC_API_URL=https://api.coinet.co
NEXTAUTH_URL=https://coinet.co
```

3. Run the deployment script:

```bash
./scripts/deploy-godaddy.sh
```

## Step 4: Verify Setup

1. Check if your domain is accessible:

```bash
curl -I https://coinet.co
```

2. Verify SSL certificate:

```bash
curl -vI https://coinet.co
```

3. Test subdomains:

```bash
curl -I https://www.coinet.co
curl -I https://api.coinet.co
curl -I https://cdn.coinet.co
```

## Troubleshooting

### DNS Issues

- Wait for DNS propagation (can take up to 48 hours)
- Verify DNS records using:

```bash
dig coinet.co
dig www.coinet.co
```

### SSL Issues

- Check SSL certificate status:

```bash
certbot certificates
```

- Renew SSL certificate if needed:

```bash
certbot renew
```

### Nginx Issues

- Check Nginx configuration:

```bash
nginx -t
```

- View Nginx error logs:

```bash
tail -f /var/log/nginx/error.log
```

## Security Recommendations

1. Enable HSTS in Nginx configuration (uncomment the HSTS line)
2. Set up regular SSL certificate renewal
3. Configure firewall rules:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Monitoring

1. Set up monitoring for your domain:

```bash
# Install monitoring tools
sudo apt-get install monitoring-plugins

# Test domain availability
check_http -H coinet.co -S
```

2. Set up uptime monitoring with a service like UptimeRobot

## Backup

1. Backup SSL certificates:

```bash
sudo tar -czf ssl-backup.tar.gz /etc/letsencrypt/
```

2. Backup Nginx configuration:

```bash
sudo tar -czf nginx-backup.tar.gz /etc/nginx/
```

## Support

If you encounter any issues:

1. Check the Nginx error logs
2. Verify DNS propagation
3. Ensure SSL certificates are valid
4. Contact GoDaddy support if needed

GODADDY_API_KEY="your-api-key"
GODADDY_API_SECRET="your-api-secret"
SERVER_IP="your-server-ip"
