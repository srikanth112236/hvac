output "resource_group" {
  value = azurerm_resource_group.main.name
}

output "api_url" {
  value = "https://${azurerm_linux_web_app.api.default_hostname}"
}

output "web_url" {
  value = "https://${azurerm_linux_web_app.web.default_hostname}"
}

output "key_vault" {
  value = azurerm_key_vault.main.name
}

output "application_insights" {
  value = azurerm_application_insights.main.name
}

output "backup_container" {
  value = "${azurerm_storage_account.main.name}/${azurerm_storage_container.backups.name}"
}
