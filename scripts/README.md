# Atomic Utility Scripts for Coinet Platform

All scripts are atomic, modular, and beautiful, fusing the best of Apple, Canva, TradingView, and Solana for a delightful developer experience.

## Docker

`./scripts/atomic-docker.sh [build|run|stop|logs|prune|compose|test|push|rollback]`
- `build`: Build Docker image
- `run`: Run Docker container
- `stop`: Stop and remove container
- `logs`: Show container logs
- `prune`: Prune unused resources
- `compose`: Run Docker Compose
- `test`: Run tests in Docker image
- `push`: Push Docker image to registry
- `rollback`: Rollback Docker Compose deployment

## Kubernetes

`./scripts/atomic-k8s.sh [apply|delete|logs|get|describe|port-forward|dashboard|test|push|rollback]`
- `apply`: Apply all manifests in `k8s/`
- `delete`: Delete all resources in `k8s/`
- `logs`: Show logs for a pod
- `get`: Get resources (pods, svc, etc.)
- `describe`: Describe a resource
- `port-forward`: Port-forward a pod/service
- `dashboard`: Launch K8s dashboard
- `test`: Smoke test for K8s deployment
- `push`: Push manifests to GitOps repo
- `rollback`: Rollback deployment

## Helm

`./scripts/atomic-helm.sh [install|upgrade|uninstall|lint|template|status|test|push|rollback]`
- `install`: Install Helm chart
- `upgrade`: Upgrade Helm chart
- `uninstall`: Uninstall Helm chart
- `lint`: Lint Helm chart
- `template`: Render templates
- `status`: Get release status
- `test`: Helm dry run
- `push`: Push Helm chart to repo
- `rollback`: Rollback Helm release

## GitOps (ArgoCD)

`./scripts/atomic-gitops.sh [sync|status|history|diff|notifications|dashboard|test|push|rollback]`
- `sync`: Sync ArgoCD app
- `status`: Get app status
- `history`: Get app history
- `diff`: Diff app
- `notifications`: List notifications
- `dashboard`: Open ArgoCD dashboard
- `test`: GitOps dry run
- `push`: Push manifests to repo
- `rollback`: Rollback ArgoCD app

---

All scripts use atomic UX: color, icons, spacing, and clear feedback. Extend or compose as needed for infinite developer delight. 