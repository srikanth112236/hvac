variable "prefix" {
  description = "Short lowercase prefix used in resource names."
  type        = string
  default     = "coolvane"
}

variable "environment" {
  description = "Deployment environment. Use a separate Terraform workspace for staging and production."
  type        = string
  default     = "staging"
}

variable "location" {
  description = "Azure region."
  type        = string
  default     = "centralus"
}

variable "tenant_id" {
  description = "Azure AD tenant id for Key Vault."
  type        = string
}

variable "admin_email" {
  description = "Owner login email."
  type        = string
}

variable "admin_password" {
  description = "Owner password, 12+ characters. Stored in Key Vault."
  type        = string
  sensitive   = true
}

variable "data_encryption_key" {
  description = "32+ character AES-256 key for the JSON stores. Stored in Key Vault."
  type        = string
  sensitive   = true
}

variable "public_domain" {
  description = "Public web hostname, e.g. coolvane.com. The app hostname is used when this is empty."
  type        = string
  default     = ""
}

variable "staging_domain" {
  description = "Optional staging hostname."
  type        = string
  default     = ""
}

variable "business_timezone" {
  type    = string
  default = "America/Chicago"
}

variable "mail_from" {
  type    = string
  default = "Coolvane HVAC <no-reply@example.com>"
}

variable "admin_notify_email" {
  type    = string
  default = "desk@example.com"
}

variable "resend_api_key" {
  description = "Optional Resend key. Stored in Key Vault and injected into the API."
  type        = string
  default     = ""
  sensitive   = true
}

variable "alert_email" {
  description = "Where Azure monitor alerts are sent."
  type        = string
}
