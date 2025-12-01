# Step-by-Step GitHub Repository Configuration

Follow these instructions to complete the setup for your Coinet AI GitHub Actions workflows.

## 1. Add Required Secrets

### Step 1: Navigate to Repository Secrets
1. Go to your GitHub repository: `https://github.com/[your-username]/Coinet`
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add AWS Secrets (Required for Deployment)
Click **New repository secret** for each of the following:

**AWS_ACCESS_KEY_ID**
- Name: `AWS_ACCESS_KEY_ID`
- Secret: `[Your AWS Access Key ID]`
- Click **Add secret**

**AWS_SECRET_ACCESS_KEY**
- Name: `AWS_SECRET_ACCESS_KEY`
- Secret: `[Your AWS Secret Access Key]`
- Click **Add secret**

### Step 3: Add Optional Security Tool Secrets
These are optional but recommended for enhanced security scanning:

**SNYK_TOKEN** (Optional)
- Name: `SNYK_TOKEN`
- Secret: `[Your Snyk API token from snyk.io]`
- Click **Add secret**

**GITGUARDIAN_API_KEY** (Optional)
- Name: `GITGUARDIAN_API_KEY`
- Secret: `[Your GitGuardian API key]`
- Click **Add secret**

**SONAR_TOKEN** (Optional)
- Name: `SONAR_TOKEN`
- Secret: `[Your SonarCloud token]`
- Click **Add secret**

**SLACK_WEBHOOK_URL** (Optional)
- Name: `SLACK_WEBHOOK_URL`
- Secret: `[Your Slack webhook URL for notifications]`
- Click **Add secret**

## 2. Configure Variables

### Step 1: Switch to Variables Tab
1. In the same **Secrets and variables** → **Actions** page
2. Click on the **Variables** tab

### Step 2: Add AWS Configuration Variables
Click **New repository variable** for each:

**AWS_REGION**
- Name: `AWS_REGION`
- Value: `us-east-1` (or your preferred AWS region)
- Click **Add variable**

**EKS_CLUSTER_NAME**
- Name: `EKS_CLUSTER_NAME`
- Value: `coinet-ai-cluster` (or your actual EKS cluster name)
- Click **Add variable**

## 3. Create Environments

### Step 1: Navigate to Environments
1. In your repository, go to **Settings**
2. In the left sidebar, click **Environments**

### Step 2: Create Staging Environment
1. Click **New environment**
2. Name: `staging`
3. Click **Configure environment**
4. **Environment URL**: `https://staging.coinet.ai`
5. **Protection rules** (optional):
   - ✅ Required reviewers: Leave unchecked for staging
   - ✅ Wait timer: Leave at 0 minutes
6. Click **Save protection rules**

### Step 3: Create Production Environment
1. Click **New environment**
2. Name: `production`
3. Click **Configure environment**
4. **Environment URL**: `https://coinet.ai`
5. **Protection rules** (recommended):
   - ✅ **Required reviewers**: Add 1-2 team members
   - ✅ **Prevent self-review**: Check this box
   - ✅ **Wait timer**: Set to 0 minutes (or add delay if desired)
6. Click **Save protection rules**

### Step 4: Create Rollback Approval Environment
1. Click **New environment**
2. Name: `rollback-approval`
3. Click **Configure environment**
4. **Protection rules** (recommended):
   - ✅ **Required reviewers**: Add 1-2 senior team members
   - ✅ **Prevent self-review**: Check this box
5. Click **Save protection rules**

## 4. Enable Required Permissions

### Step 1: Check Repository Permissions
1. Go to **Settings** → **General**
2. Scroll down to **Features**
3. Ensure **Packages** is enabled (for GitHub Container Registry)

### Step 2: Check Actions Permissions
1. Go to **Settings** → **Actions** → **General**
2. Under **Actions permissions**:
   - Select "Allow all actions and reusable workflows"
   - OR "Allow [organization] actions and reusable workflows"
3. Under **Workflow permissions**:
   - Select "Read and write permissions"
   - ✅ Check "Allow GitHub Actions to create and approve pull requests"

## 5. Test the Configuration

### Step 1: Create a Test Branch
```bash
git checkout -b test-github-actions
git push origin test-github-actions
```

### Step 2: Trigger a Workflow
1. Make a small change to any file in `apps/web-client/` or `services/`
2. Commit and push the change
3. Create a Pull Request to `main` branch

### Step 3: Verify Workflows Run
1. Go to **Actions** tab in your repository
2. You should see the following workflows running:
   - 🚀 Coinet AI CI Pipeline
   - 🐳 Docker Build & Push Pipeline (if merged to main)
   - 🚀 Deployment Pipeline (if deployed)

## 6. Common Issues & Solutions

### Issue: "Environment not found"
**Solution**: Make sure environment names are exactly: `staging`, `production`, `rollback-approval`

### Issue: "Secret not found" 
**Solution**: Double-check secret names are exactly as specified (case-sensitive)

### Issue: "Permission denied"
**Solution**: Ensure workflow permissions are set to "Read and write permissions"

### Issue: AWS deployment fails
**Solution**: 
1. Verify AWS credentials have EKS permissions
2. Ensure EKS cluster exists and is accessible
3. Check AWS region matches your cluster's region

## 7. Verification Checklist

After completing the setup, verify you have:

- [ ] ✅ AWS_ACCESS_KEY_ID secret added
- [ ] ✅ AWS_SECRET_ACCESS_KEY secret added  
- [ ] ✅ AWS_REGION variable set
- [ ] ✅ EKS_CLUSTER_NAME variable set
- [ ] ✅ staging environment created
- [ ] ✅ production environment created (with protection rules)
- [ ] ✅ rollback-approval environment created
- [ ] ✅ Packages feature enabled
- [ ] ✅ Actions permissions set to "Read and write"
- [ ] ✅ Test workflow runs successfully

## 8. Optional: Add Security Tool Tokens

If you want to enable the optional security scanning features:

### Snyk (Vulnerability Scanning)
1. Sign up at [snyk.io](https://snyk.io)
2. Go to Account Settings → API Token
3. Copy the token and add as `SNYK_TOKEN` secret

### GitGuardian (Secret Scanning)
1. Sign up at [gitguardian.com](https://gitguardian.com)
2. Generate an API key
3. Add as `GITGUARDIAN_API_KEY` secret

### SonarCloud (Code Quality)
1. Sign up at [sonarcloud.io](https://sonarcloud.io)
2. Create a project for your repository
3. Generate a token and add as `SONAR_TOKEN` secret

### Slack (Notifications)
1. Create a Slack app or webhook
2. Get the webhook URL
3. Add as `SLACK_WEBHOOK_URL` secret

---

Once you complete these steps, your GitHub Actions workflows will be fully functional! 🚀
