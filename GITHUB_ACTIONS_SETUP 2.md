# GitHub Actions Setup Requirements

This document outlines the required GitHub repository settings and secrets that need to be configured for the CI/CD workflows to function properly.

## Fixed Issues

### ✅ Workflow Syntax Errors Fixed

1. **docker-build-push.yml**: Fixed boolean input type (changed `'false'` to `false`)
2. **docker-build-push.yml**: Fixed matrix condition syntax 
3. **advanced-ci.yml**: Added `continue-on-error: true` for optional security scanning steps

### ⚠️ Repository Configuration Required

The following items require repository configuration and are not syntax errors:

## Required Secrets

The following secrets need to be added in **Settings > Secrets and variables > Actions**:

### AWS Deployment (Required for deploy.yml)
- `AWS_ACCESS_KEY_ID` - AWS access key for EKS deployment
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for EKS deployment

### Optional Security Tools (for advanced-ci.yml)
- `SNYK_TOKEN` - For Snyk security scanning
- `GITGUARDIAN_API_KEY` - For GitGuardian secret scanning
- `SONAR_TOKEN` - For SonarCloud code analysis
- `SLACK_WEBHOOK_URL` - For Slack notifications

## Required Variables

The following variables need to be added in **Settings > Secrets and variables > Actions**:

- `AWS_REGION` - AWS region (e.g., `us-east-1`)
- `EKS_CLUSTER_NAME` - Name of your EKS cluster (e.g., `coinet-ai-cluster`)

## Required Environments

The following environments need to be created in **Settings > Environments**:

1. **staging**
   - URL: `https://staging.coinet.ai`
   - Protection rules: Optional

2. **production**
   - URL: `https://coinet.ai`
   - Protection rules: Recommended (require reviews)

3. **rollback-approval**
   - Used for manual rollback approvals
   - Protection rules: Required reviewers recommended

## GitHub Container Registry

Ensure GitHub Container Registry is enabled:
1. Go to **Settings > General**
2. Scroll to **Features**
3. Enable **Packages**

## Repository Permissions

Ensure the repository has the following permissions enabled:
- **Contents**: Read/Write (for checking out code)
- **Packages**: Write (for publishing container images)
- **Security events**: Write (for security scanning results)
- **Actions**: Read (for workflow access)
- **Checks**: Write (for status checks)
- **Pull requests**: Write (for PR comments)

## Workflow Warnings Explained

### Context Access Warnings

The linter shows warnings for context access like:
- `${{ steps.changes.outputs.web-client }}`
- `${{ secrets.AWS_ACCESS_KEY_ID }}`
- `${{ vars.AWS_REGION }}`

These are **expected warnings** and will resolve once:
1. The secrets/variables are added to the repository
2. The workflows run and the `dorny/paths-filter` action creates the outputs

### Environment Validation Warnings

Warnings about environment names like `staging`, `production`, and `rollback-approval` will resolve once these environments are created in the repository settings.

## Testing the Workflows

1. **First**, add the required secrets and variables
2. **Then**, create the environments
3. **Finally**, test with a small change to trigger the workflows

## Optional Enhancements

Consider adding these optional secrets for enhanced functionality:
- `CODECOV_TOKEN` - For code coverage reporting
- `DOCKER_REGISTRY_TOKEN` - For custom Docker registry
- `SENTRY_DSN` - For error tracking
- `DATADOG_API_KEY` - For monitoring integration
