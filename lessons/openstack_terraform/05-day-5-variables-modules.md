## Day 5: Variables, Outputs & Modules

### Must Remember
- Variables with `variable` blocks let you parameterize infrastructure. Outputs with `output` blocks expose useful values to other workflows.
- Modules are reusable packages of Terraform configuration. They turn repetitive code into clean, shareable components.
- Value precedence: defaults → `terraform.tfvars` → environment variables (`TF_VAR_*`) → CLI flags. Later sources win.

### Can View Docs (Because Defaults Change)
- Default variable values in `variables.tf` are project-specific; verify they match your cloud environment.
- Module versions from the Terraform Registry are frequently updated—pin them to avoid breaking changes.

---

### Input Variables Deep Dive

Input variables let you customize resources without editing the core configuration. Declare them in `variables.tf`:

```hcl
variable "OS_REGION_NAME" {
  type        = string
  description = "OpenStack region to target (OS_REGION_NAME)."
  default     = "RegionOne"
}

variable "instance_count" {
  type        = number
  description = "Number of compute instances to launch."
  default     = 3
}

variable "enable_monitoring" {
  type        = bool
  description = "Whether to attach monitoring agents."
  default     = true
}
```

Reference them anywhere in your configuration:
```hcl
provider "openstack" {
  region = var.OS_REGION_NAME
}

resource "openstack_compute_instance_v2" "worker" {
  count = var.instance_count
  name  = "worker-${count.index + 1}"
}
```

### Supplying Variable Values

There are multiple ways to provide values, each with a different priority:

| Source | Priority | Example |
|--------|----------|---------|
| Default in `variables.tf` | Lowest | `default = "RegionOne"` |
| `terraform.tfvars` file | Medium | `OS_REGION_NAME = "us-west-1"` |
| Environment variable | Higher | `export TF_VAR_OS_REGION_NAME="us-east-1"` |
| CLI flag | Highest | `terraform apply -var="OS_REGION_NAME=eu-central-1"` |

Test the precedence:
```sh
# Set via environment
export TF_VAR_instance_count=2

# Override via CLI
terraform plan -var="instance_count=3"
```
Terraform uses `3` because CLI always wins.

---

### Output Values

Outputs expose computed values so other tools (or humans) can consume them after apply. Define them in `outputs.tf`:

```hcl
output "instance_ips" {
  description = "Private IPs of all compute instances"
  value       = openstack_compute_instance_v2.worker[*].access_ip_v4
}

output "instance_hostname" {
  description = "Private DNS name of the first instance"
  value       = openstack_compute_instance_v2.worker[0].name
}

output "network_id" {
  description = "Network ID for downstream modules"
  value       = openstack_networking_network_v2.main.id
}
```

After `terraform apply`, view outputs:
```sh
terraform output
terraform output instance_ips
terraform output -json
```

Outputs can feed into automation scripts:
```sh
# Capture the first IP in a shell variable
FIRST_IP=$(terraform output -raw instance_ips | jq -r '.[0]')
ssh ubuntu@$FIRST_IP
```

---

### Modules: Reusable Infrastructure Kits

Think of modules as IKEA furniture kits. You plug in values, and they build the same structure every time.

#### Using Public Modules

The Terraform Registry hosts verified modules:
```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.19.0"

  name = "example-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-west-2a", "us-west-2b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24"]

  enable_dns_hostnames = true
}
```

#### Creating Your Own Modules

Structure a module as a directory with its own `main.tf`, `variables.tf`, and `outputs.tf`:
```
modules/
└── network/
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

**modules/network/variables.tf**
```hcl
variable "network_name" {
  type        = string
  description = "Name for the network"
}

variable "cidr" {
  type        = string
  description = "CIDR block for the subnet"
}
```

**modules/network/main.tf**
```hcl
resource "openstack_networking_network_v2" "main" {
  name           = var.network_name
  admin_state_up = true
}

resource "openstack_networking_subnet_v2" "main" {
  name       = "${var.network_name}-subnet"
  network_id = openstack_networking_network_v2.main.id
  cidr       = var.cidr
}
```

**modules/network/outputs.tf**
```hcl
output "network_id" {
  value = openstack_networking_network_v2.main.id
}

output "subnet_id" {
  value = openstack_networking_subnet_v2.main.id
}
```

#### Calling Your Module

From the root `main.tf`:
```hcl
module "prod_network" {
  source       = "./modules/network"
  network_name = "production-net"
  cidr         = "10.0.1.0/24"
}

module "dev_network" {
  source       = "./modules/network"
  network_name = "development-net"
  cidr         = "10.0.2.0/24"
}

# Reference module outputs
resource "openstack_compute_instance_v2" "web" {
  network {
    uuid = module.prod_network.network_id
  }
}
```

---

### Integration With Other Tools

Terraform outputs integrate with many automation workflows:

| Tool | Integration |
|------|-------------|
| **Ansible** | Generate dynamic inventory from `terraform output -json` |
| **CI/CD** | Capture outputs as pipeline variables |
| **Scripts** | Parse JSON output with `jq` |
| **Monitoring** | Push instance IPs to discovery systems |

Example: Generate Ansible inventory:
```sh
terraform output -json instance_ips | jq -r '.[]' > hosts.txt
ansible -i hosts.txt all -m ping
```

---

### End-Of-Day Checklist

- [ ] Declare variables with types, descriptions, and sensible defaults
- [ ] Store environment-specific values in `terraform.tfvars` (git-ignored if sensitive)
- [ ] Expose useful values through outputs for downstream consumption
- [ ] Extract repeated patterns into reusable modules
- [ ] Pin module versions to avoid surprise changes

Tomorrow we deep-dive into OpenStack networking architecture and build a complete network module from scratch.
