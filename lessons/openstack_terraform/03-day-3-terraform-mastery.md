## Day 3: Think Like Terraform

### Must Remember
- Providers are plugins; install them with `terraform init` and pin versions so builds are reproducible.
- Terraform state is the source of truth. Corrupt it and Terraform forgets what exists.
- The workflow loop (Scope → Author → Initialize → Plan → Apply) is the heartbeat of every project.

### Can View Docs (Because Credentials Expire)
- Azure service principal output (appId, password, tenant) changes each run; capture it securely when you create it.
- Backend configuration for remote state depends on which storage (HCP, S3, Swift) you pick—follow provider docs when you wire it in.

### Provider Reality Check
Providers translate Terraform intent into real API calls. Keep the versions explicit:
```hcl
terraform {
  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 1.57"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0.2"
    }
  }
}
```
Run `terraform init` and watch the provider binaries download so you know the lock file is current:
```text
Downloading terraform-provider-openstack/openstack 1.57.0...
Downloading hashicorp/azurerm 3.0.2...
```

### Azure Muscle Memory (Even If You Stay On OpenStack)
1. Authenticate and scope the subscription.
```sh
az login
az account set --subscription "35akss-subscription-id"
```
2. Create a service principal and capture the JSON response.
```sh
az ad sp create-for-rbac --role="Contributor" --scopes="/subscriptions/35akss-subscription-id"
```
Sample output:
```json
{
  "appId": "xxxxxx-xxx-xxxx-xxxx-xxxxxxxxxx",
  "displayName": "azure-cli-2022-xxxx",
  "password": "xxxxxx~xxxxxx~xxxxx",
  "tenant": "xxxxx-xxxx-xxxxx-xxxx-xxxxx"
}
```
3. Export the credentials so Terraform can read them.
```sh
export ARM_CLIENT_ID="xxxxxx-xxx-xxxx-xxxx-xxxxxxxxxx"
export ARM_CLIENT_SECRET="xxxxxx~xxxxxx~xxxxx"
export ARM_SUBSCRIPTION_ID="35akss-subscription-id"
export ARM_TENANT_ID="xxxxx-xxxx-xxxxx-xxxx-xxxxx"
```
4. Apply the minimal resource group configuration:
```hcl
provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = "myTFResourceGroup"
  location = "westus2"
}
```
Run `terraform apply` and confirm the resource group appears in the Azure portal. The syntax mirrors OpenStack resources, proving the provider abstraction works.

### Keep Config Files In Order
- `main.tf`: provider blocks, module calls, backend configuration.
- `variables.tf`: declare names, types, descriptions, defaults.
- `terraform.tfvars`: store actual values, especially per-environment overrides.
Terraform merges inputs in this order: defaults → `tfvars` → environment variables (`TF_VAR_*`) → CLI `-var`. Later wins. Test it:
```sh
export TF_VAR_instance_count=2
terraform plan -var="instance_count=3"
```
Terraform will use `3` because CLI overrides environment variables.

### State Handling Drill
Inspect the state after an apply so you understand what Terraform remembers:
```sh
terraform state list
terraform show
```
If you move to remote state (recommended for teams), add a backend block and re-init:
```hcl
terraform {
  backend "s3" {
    bucket = "openstack-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```
```sh
terraform init -migrate-state
```

### Practice Moves
1. Create a dummy module that outputs a string.
```hcl
output "module_message" {
  value = "Hello from module"
}
```
Call it from root and run `terraform output` to prove modules can pass data back.
2. Use a data block for a flavor and reference it in a resource to avoid hard-coded IDs.
3. Add both OpenStack and Azure providers to one config, but `-target` apply only OpenStack resources to see Terraform ignore the rest.

Tomorrow we wrap up by managing change: reading plans like a detective, locking state, and cleaning up safely.
