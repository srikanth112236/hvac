# Azure Terraform template

Provision a staging or production environment on Azure App Service:

- Linux App Service plan (P1v3) with two web apps: **API** and **web host**
- One App Insights + Log Analytics workspace, two availability tests and 5xx alerts
- Key Vault holding `ADMIN_PASSWORD`, `DATA_ENCRYPTION_KEY` and optional `RESEND_API_KEY`
- Private storage account/container reserved for backups
- Persistent `/home/data` and `/home/uploads` paths for the JSON stores and media

This is a **template**, not an applied environment. It has not been run against an
Azure subscription in this workspace (Terraform and the Azure CLI are not installed
here). Run `terraform init`, `fmt`, `validate` and `plan` against a sandbox
subscription before applying.

## Staging and production

Use one Terraform workspace per environment so each has its own state and resources:

```bash
terraform init
terraform workspace new staging
terraform apply -var-file=staging.tfvars
terraform workspace new production
terraform apply -var-file=production.tfvars
```

Set the environment-specific `public_domain`, `admin_email`, `alert_email` and
mail settings in each tfvars file. Copy `terraform.tfvars.example`.

## Build and deploy artefacts

The App Service expects a deployment package that contains the monorepo
`node_modules` and the built web assets, or Oryx must build it. The web app uses
`npm run serve -w @hvac/web` and the API `npm run start -w @hvac/api`.

```bash
npm ci
npm run build:prerender        # public HTML + meta/JSON-LD in apps/web/dist
# package the repository, then deploy to the API and web App Services
```

The web app proxies `/api`, `/uploads`, `/sitemap.xml`, `/robots.txt`,
`/llms.txt` and `/feed.xml` to `API_ORIGIN`, so crawlable files stay on the site
origin.

## Important limits

- The JSON stores and media use `/home`. This is persistent for **one** App Service
  instance. Scaling out or running multiple slots against the same data requires
  PostgreSQL/Azure Files before it is safe.
- The storage account/container is created for future offsite backups; the current
  daily backup job writes to `/home/data/backups` and keeps seven days. Wire a
  copy to Blob or Azure Backup before production.
- Key Vault RBAC propagation can lag; restart the apps after the first apply if
  secret references show `KeyVaultReferenceException`.
- Configure a custom domain + managed certificate (or Front Door) and set
  `public_domain` accordingly. Without it the default `azurewebsites.net` hostname
  is used for `ALLOWED_ORIGINS` and `PUBLIC_SITE_URL`.
- Mail requires `RESEND_API_KEY` (or a webhook configured separately). Without it
  production portal registration is closed and mail is logged as skipped.
