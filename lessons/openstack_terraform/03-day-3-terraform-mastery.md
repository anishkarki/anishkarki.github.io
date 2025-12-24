## Day 3: Terraform Developer Workflows

### Must Remember
- Providers define individual units of infrastructure as **resources**.
- Terraform uses **state files** to track real infrastructure.
- The same patterns work across clouds: Azure, AWS, OpenStack, GCP.

### Can View Docs (Because Values Change)
- Provider versions and API endpoints change frequently.
- Service Principal credentials and subscription IDs are tenant-specific.

---

### Core Terraform Concepts

1. **Providers** define individual units of infrastructure (compute instance, networks) as resources
2. **Modules** compose resources from different providers into reusable configurations
3. **Automatic ordering** - Terraform figures out dependency order for you

---

### The Terraform Workflow

| Step | Action | Command |
|------|--------|---------|
| **Scope** | Identify infrastructure for your project | Planning |
| **Author** | Write the configuration | Edit `.tf` files |
| **Initialize** | Install provider plugins | `terraform init` |
| **Plan** | Preview changes | `terraform plan` |
| **Apply** | Create/modify infrastructure | `terraform apply` |

---

### State Management

Terraform uses a **state file** to track your real infrastructure.

```
⚠️ WARNING: State files can contain sensitive information!
   - Passwords
   - Security keys
   - API tokens

Store your state file securely and restrict access.
```

**Collaboration Options:**
- **HCP Terraform** (free for up to 5 users) - securely share state with teammates
- **S3/Azure Blob** backend - remote state storage
- **GitLab/GitHub integration** - version control for infrastructure

---

### Setting Up Azure Resources

Azure uses **Service Principals** for authentication (similar to OpenStack's Application Credentials).

#### Step 1: Login and Get Subscription ID
```sh
az login

# Output:
[
  {
    "cloudName": "AzureCloud",
    "id": "35akss-subscription-id",
    "isDefault": true,
    "name": "Subscription-Name",
    "state": "Enabled",
    "tenantId": "0envbwi39-TenantId"
  }
]

# Set the subscription
az account set --subscription "<subscription-id>"
```

#### Step 2: Create a Service Principal
```sh
az ad sp create-for-rbac --role="Contributor" --scopes="/subscriptions/<SUBSCRIPTION_ID>"

# Output:
{
  "appId": "xxxxxx-xxx-xxxx-xxxx-xxxxxxxxxx",
  "displayName": "azure-cli-2022-xxxx",
  "password": "xxxxxx~xxxxxx~xxxxx",
  "tenant": "xxxxx-xxxx-xxxxx-xxxx-xxxxx"
}
```

#### Step 3: Set Environment Variables
```sh
export ARM_CLIENT_ID="<APPID_VALUE>"
export ARM_CLIENT_SECRET="<PASSWORD_VALUE>"
export ARM_SUBSCRIPTION_ID="<SUBSCRIPTION_ID>"
export ARM_TENANT_ID="<TENANT_VALUE>"
```

#### Step 4: Write Azure Configuration
```hcl
# main.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0.2"
    }
  }
  required_version = ">= 1.1.0"
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = "myTFResourceGroup"
  location = "westus2"
}
```

---

### Components of main.tf

#### 1. Terraform Block
Installs providers from the Terraform Registry.
```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"  # shorthand for registry.terraform.io/hashicorp/azurerm
      version = "~> 3.0.2"
    }
  }
}
```

#### 2. Provider Block
Configures the specified provider. You can define **multiple providers** to manage resources across clouds.
```hcl
provider "azurerm" {
  features {}
}

provider "openstack" {
  auth_url = var.OS_AUTH_URL
  region   = var.OS_REGION_NAME
}
```

#### 3. Resource Block
Defines components of your infrastructure.
```hcl
resource "azurerm_resource_group" "rg" {
  name     = "myTFResourceGroup"
  location = "westus2"
}
```

- **Resource type prefix** maps to provider name (`azurerm_resource_group` → `azurerm` provider)
- **Unique ID** = type + name (`azurerm_resource_group.rg`)

---

### OpenStack Setup

#### Authentication with Application Credentials
Best practice: use **Application Credentials** (similar to Service Principal).

1. In Horizon dashboard: **Identity > Application Credentials > Create**
2. Download the `openrc` file
3. Source it: `source openrc`

#### The Three Essential Files

| File | Purpose | When Loaded |
|------|---------|-------------|
| `main.tf` | Terraform block, provider blocks, resources | Always |
| `variables.tf` | Declares input variables (names, types, defaults) | Always |
| `terraform.tfvars` | Provides variable values | Auto-loaded at plan/apply |

**Value Precedence (later overrides earlier):**
```
defaults (variables.tf) → terraform.tfvars → TF_VAR_* env vars → CLI flags (-var)
```

---

### Provider Block Deep Dive

```hcl
provider "openstack" {
  auth_url                      = var.OS_AUTH_URL
  region                        = var.OS_REGION_NAME
  endpoint_type                 = var.OS_INTERFACE
  application_credential_id     = var.OS_APPLICATION_CREDENTIAL_ID
  application_credential_secret = var.OS_APPLICATION_CREDENTIAL_SECRET
}
```

---

### Data Sources (Data Block)

Query your cloud provider for information about **existing** resources.

```hcl
# Simple query by name
data "openstack_compute_flavor_v2" "small" {
  name = "m1.small"
}

# Query with filters (when not sure of exact name)
data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  owners = ["099720109477"]  # Canonical
}
```

Reference data attributes: `data.openstack_compute_flavor_v2.small.id`

---

### Resource Block Examples

```hcl
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t2.micro"

  tags = {
    Name = "learn-terraform"
  }
}

resource "openstack_compute_instance_v2" "vm" {
  name      = "my-instance"
  image_id  = data.openstack_images_image_v2.ubuntu.id
  flavor_id = data.openstack_compute_flavor_v2.small.id
}
```

---

### Essential Commands

```sh
terraform validate   # Check syntax
terraform init       # Download providers
terraform plan       # Preview changes
terraform apply      # Create resources
terraform apply -auto-approve  # Skip confirmation
terraform state list # List managed resources
terraform show       # Show current state
terraform destroy    # Remove everything
```

---

### End-Of-Day Checklist

- [ ] Understand Terraform block, provider block, resource block
- [ ] Know how to set up Azure Service Principal
- [ ] Know how to use OpenStack Application Credentials
- [ ] Understand the three essential files and value precedence
- [ ] Practice querying with data sources
- [ ] Run through the init → plan → apply workflow

Tomorrow we manage existing infrastructure and learn about variables and outputs!
