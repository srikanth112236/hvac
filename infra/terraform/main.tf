locals {
  name_suffix = random_string.suffix.result
  rg_name     = "${var.prefix}-${var.environment}-rg"
  api_name    = "${var.prefix}-${var.environment}-api"
  web_name    = "${var.prefix}-${var.environment}-web"
  kv_name     = substr("${var.prefix}-${var.environment}-kv-${local.name_suffix}", 0, 24)
  storage     = substr("${var.prefix}${var.environment}${local.name_suffix}", 0, 24)
  web_domain  = var.public_domain != "" ? var.public_domain : azurerm_linux_web_app.web.default_hostname
  api_origin  = "https://${azurerm_linux_web_app.api.default_hostname}"

  tags = {
    application = "coolvane-hvac"
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "random_string" "suffix" {
  length  = 6
  lower   = true
  numeric = true
  special = false
  upper   = false
}

resource "azurerm_resource_group" "main" {
  name     = local.rg_name
  location = var.location
  tags     = local.tags
}

resource "azurerm_service_plan" "main" {
  name                = "${var.prefix}-${var.environment}-plan"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "P1v3"
  tags                = local.tags
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.prefix}-${var.environment}-logs"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

resource "azurerm_application_insights" "main" {
  name                = "${var.prefix}-${var.environment}-ai"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  tags                = local.tags
}

resource "azurerm_key_vault" "main" {
  name                       = local.kv_name
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  tenant_id                  = var.tenant_id
  sku_name                   = "standard"
  rbac_authorization_enabled = true
  purge_protection_enabled   = true
  soft_delete_retention_days = 7
  tags                       = local.tags
}

resource "azurerm_key_vault_secret" "admin_password" {
  name         = "admin-password"
  value        = var.admin_password
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "data_key" {
  name         = "data-encryption-key"
  value        = var.data_encryption_key
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "resend" {
  count        = var.resend_api_key != "" ? 1 : 0
  name         = "resend-api-key"
  value        = var.resend_api_key
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_storage_account" "main" {
  name                     = local.storage
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags                     = local.tags
}

resource "azurerm_storage_container" "backups" {
  name                  = "backups"
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "private"
}

resource "azurerm_linux_web_app" "api" {
  name                      = local.api_name
  resource_group_name       = azurerm_resource_group.main.name
  location                  = azurerm_resource_group.main.location
  service_plan_id           = azurerm_service_plan.main.id
  https_only                = true
  client_affinity_enabled   = false
  tags                      = local.tags
  virtual_network_subnet_id = null

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on         = true
    ftps_state        = "Disabled"
    minimum_tls_version = "1.2"
    http2_enabled     = true
    health_check_path = "/api/v1/health"
    app_command_line  = "npm run start -w @hvac/api"

    application_stack {
      node_version = "22-lts"
    }
  }

  app_settings = merge(
    {
      NODE_ENV                     = "production"
      PORT                         = "8080"
      WEBSITES_PORT                = "8080"
      SCM_DO_BUILD_DURING_DEPLOYMENT = "true"
      ADMIN_EMAIL                  = var.admin_email
      ADMIN_PASSWORD               = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.admin_password.versionless_id})"
      DATA_ENCRYPTION_KEY          = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.data_key.versionless_id})"
      ALLOWED_ORIGINS              = "https://${local.web_domain}"
      PUBLIC_SITE_URL              = "https://${local.web_domain}"
      BUSINESS_TIMEZONE            = var.business_timezone
      MAIL_FROM                    = var.mail_from
      ADMIN_NOTIFY_EMAIL           = var.admin_notify_email
      HVAC_DATA_DIR                = "/home/data"
      UPLOAD_ROOT                  = "/home/uploads"
      AUDIT_RETENTION_DAYS         = "365"
      EMAIL_LOG_RETENTION_DAYS     = "180"
      APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.main.connection_string
    },
    var.resend_api_key != "" ? {
      RESEND_API_KEY = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.resend[0].versionless_id})"
    } : {},
  )
}

resource "azurerm_linux_web_app" "web" {
  name                    = local.web_name
  resource_group_name     = azurerm_resource_group.main.name
  location                = azurerm_resource_group.main.location
  service_plan_id         = azurerm_service_plan.main.id
  https_only              = true
  client_affinity_enabled = false
  tags                    = local.tags

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on           = true
    ftps_state          = "Disabled"
    minimum_tls_version = "1.2"
    http2_enabled       = true
    health_check_path   = "/healthz"
    app_command_line    = "npm run serve -w @hvac/web"

    application_stack {
      node_version = "22-lts"
    }
  }

  app_settings = {
    PORT                           = "8080"
    WEBSITES_PORT                  = "8080"
    SCM_DO_BUILD_DURING_DEPLOYMENT = "true"
    API_ORIGIN                     = local.api_origin
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.main.connection_string
  }
}

resource "azurerm_role_assignment" "api_kv" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.api.identity[0].principal_id
}

resource "azurerm_role_assignment" "web_kv" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.web.identity[0].principal_id
}

resource "azurerm_monitor_action_group" "ops" {
  name                = "${var.prefix}-${var.environment}-ops"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "hvacops"

  email_receiver {
    name                    = "owner"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }
}

resource "azurerm_monitor_metric_alert" "api_5xx" {
  name                = "${local.api_name}-5xx"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_linux_web_app.api.id]
  description         = "API returned more than 10 server errors in five minutes."
  severity            = 2
  window_size         = "PT5M"
  frequency           = "PT1M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "Http5xx"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10
  }

  action {
    action_group_id = azurerm_monitor_action_group.ops.id
  }
}

resource "azurerm_monitor_metric_alert" "web_5xx" {
  name                = "${local.web_name}-5xx"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_linux_web_app.web.id]
  description         = "Web host returned server errors."
  severity            = 2
  window_size         = "PT5M"
  frequency           = "PT1M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "Http5xx"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10
  }

  action {
    action_group_id = azurerm_monitor_action_group.ops.id
  }
}

resource "azurerm_application_insights_web_test" "api_health" {
  name                    = "${local.api_name}-health"
  location                = azurerm_resource_group.main.location
  resource_group_name     = azurerm_resource_group.main.name
  application_insights_id = azurerm_application_insights.main.id
  kind                    = "ping"
  frequency               = 300
  timeout                 = 30
  enabled                 = true
  retry_enabled           = true
  geo_locations           = ["us-tx"]

  configuration = <<XML
<WebTest Name="api-health" Id="00000000-0000-0000-0000-000000000001" Enabled="True" Timeout="30" xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010">
  <Items>
    <Request Method="GET" Version="1.1" Url="${local.api_origin}/api/v1/ready" ThinkTime="0" Timeout="30" ParseDependentRequests="False" FollowRedirects="True" RecordResult="True" Cache="False" ResponseTimeGoal="0" Encoding="utf-8" ExpectedHttpStatusCode="200" ExpectedResponseUrl="" ReportingName="" IgnoreHttpStatusCode="False" />
  </Items>
</WebTest>
XML
}

resource "azurerm_application_insights_web_test" "web_health" {
  name                    = "${local.web_name}-health"
  location                = azurerm_resource_group.main.location
  resource_group_name     = azurerm_resource_group.main.name
  application_insights_id = azurerm_application_insights.main.id
  kind                    = "ping"
  frequency               = 300
  timeout                 = 30
  enabled                 = true
  retry_enabled           = true
  geo_locations           = ["us-tx"]

  configuration = <<XML
<WebTest Name="web-health" Id="00000000-0000-0000-0000-000000000002" Enabled="True" Timeout="30" xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010">
  <Items>
    <Request Method="GET" Version="1.1" Url="https://${local.web_domain}/healthz" ThinkTime="0" Timeout="30" ParseDependentRequests="False" FollowRedirects="True" RecordResult="True" Cache="False" ResponseTimeGoal="0" Encoding="utf-8" ExpectedHttpStatusCode="200" ExpectedResponseUrl="" ReportingName="" IgnoreHttpStatusCode="False" />
  </Items>
</WebTest>
XML
}
