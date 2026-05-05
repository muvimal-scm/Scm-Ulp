# infra/k8s/

Kubernetes manifests / Helm charts for self-hosted production deployment. **Phase 5 work** — empty for now.

When this lands, expected layout:

```
k8s/
├── base/                  # Kustomize base (deployments, services, ingress)
├── overlays/
│   ├── dev/
│   ├── stage/
│   ├── prod-in/           # India region
│   └── prod-us/           # US region
└── helm/                  # Helm charts (if used instead of Kustomize)
```

Open-source path: same MySQL/Redis/RabbitMQ/MinIO/Keycloak running in Kubernetes — no cloud-vendor lock-in.
