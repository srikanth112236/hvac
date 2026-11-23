# Infrastructure

- `terraform/` — Azure App Service staging/production template: API + web host,
  Key Vault, App Insights/Log Analytics, 5xx alerts, availability tests, storage
  container reserved for backups.
- `docs/deployment.md` — environment variables, build/prerender, same-origin SEO
  files, upgrades, restore.
- `docs/data-retention.md` — retention, erasure, backups.

The Terraform template is **not applied** in this repository. Validate it against
a sandbox Azure subscription before production. The current JSON stores assume a
single API instance with persistent `/home` storage; move to PostgreSQL/Azure
Files before scaling out.
