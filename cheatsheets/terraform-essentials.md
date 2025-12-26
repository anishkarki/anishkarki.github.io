# Terraform Cheatsheet

The complete Terraform reference — from basics to production-ready patterns.

---

## Quick Navigation

| Section | Level |
|---------|-------|
| [What is Terraform?](#what-is-terraform) | 🟢 Basic |
| [Installation](#installation) | 🟢 Basic |
| [CLI Commands](#cli-commands) | 🟢 Basic |
| [Project Structure](#project-structure) | 🟢 Basic |
| [HCL Syntax](#hcl-syntax) | 🟢 Basic |
| [Providers](#providers) | 🟡 Intermediate |
| [Resources](#resources) | 🟡 Intermediate |
| [Variables](#variables) | 🟡 Intermediate |
| [Outputs](#outputs) | 🟡 Intermediate |
| [Data Sources](#data-sources) | 🟡 Intermediate |
| [Locals](#locals) | 🟡 Intermediate |
| [Loops](#loops) | 🟠 Advanced |
| [Conditionals](#conditionals) | 🟠 Advanced |
| [Dynamic Blocks](#dynamic-blocks) | 🟠 Advanced |
| [Modules](#modules) | 🟠 Advanced |
| [State Management](#state-management) | 🟠 Advanced |
| [Workspaces](#workspaces) | 🟠 Advanced |
| [Backend Configuration](#backend-configuration) | 🟠 Advanced |
| [Functions Reference](#functions-reference) | 📚 Reference |
| [Best Practices](#best-practices) | ✅ Production |
| [Troubleshooting](#troubleshooting) | 🔧 Debug |

---

## 🟢 BASIC

### What is Terraform?

Terraform is an **Infrastructure as Code (IaC)** tool that lets you define cloud and on-prem resources in human-readable configuration files.

**Core Workflow:**

```
Write → Plan → Apply
```

**Key Concepts:**

| Concept | Description |
|---------|-------------|
| **Declarative** | You describe WHAT you want, Terraform figures out HOW |
| **Idempotent** | Same config = same result, no matter how many times you run |
| **State-based** | Terraform tracks real infrastructure in a state file |
| **Provider-agnostic** | Works with AWS, Azure, GCP, Kubernetes, and 3000+ providers |

---

### Installation

**Linux (Ubuntu/Debian):**

```bash
# Add HashiCorp GPG key
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list

# Install
sudo apt update && sudo apt install terraform
```

**macOS:**

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

**Verify:**

```bash
terraform version
terraform -install-autocomplete  # Enable tab completion
```

---

### CLI Commands

**The Core Workflow:**

```bash
terraform init      # 1. Initialize (download providers, modules)
terraform plan      # 2. Preview changes
terraform apply     # 3. Apply changes
terraform destroy   # 4. Tear down infrastructure
```

**Essential Commands:**

| Command | Description |
|---------|-------------|
| `terraform init` | Initialize working directory |
| `terraform init -upgrade` | Upgrade providers to latest allowed version |
| `terraform init -reconfigure` | Reconfigure backend |
| `terraform plan` | Show execution plan |
| `terraform plan -out=tfplan` | Save plan to file |
| `terraform plan -destroy` | Plan destruction |
| `terraform apply` | Apply changes |
| `terraform apply -auto-approve` | Apply without confirmation |
| `terraform apply tfplan` | Apply saved plan |
| `terraform apply -target=aws_instance.web` | Apply specific resource |
| `terraform apply -replace=aws_instance.web` | Force recreate resource |
| `terraform destroy` | Destroy all resources |
| `terraform destroy -target=aws_instance.web` | Destroy specific resource |

**Utility Commands:**

| Command | Description |
|---------|-------------|
| `terraform fmt` | Format code |
| `terraform fmt -recursive` | Format all files in subdirs |
| `terraform fmt -check` | Check formatting (CI/CD) |
| `terraform validate` | Validate syntax |
| `terraform output` | Show outputs |
| `terraform output -json` | JSON format |
| `terraform console` | Interactive REPL |
| `terraform graph` | Generate dependency graph |
| `terraform show` | Show current state |
| `terraform refresh` | Sync state with real infrastructure |

---

### Project Structure

**Standard Layout:**

```
project/
├── main.tf           # Main resources
├── variables.tf      # Input variable declarations
├── outputs.tf        # Output declarations
├── versions.tf       # Terraform & provider versions
├── terraform.tfvars  # Variable values (git-ignored)
├── backend.tf        # Backend configuration
└── modules/          # Reusable modules
    └── vpc/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

**Environment-Based Layout:**

```
terraform/
├── modules/           # Shared modules
│   ├── vpc/
│   ├── ec2/
│   └── rds/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   └── prod/
```

---

### HCL Syntax

**Comments:**

```hcl
# Single line comment
// Also single line (alternative)

/*
  Multi-line
  comment
*/
```

**Block Structure:**

```hcl
block_type "label1" "label2" {
  argument = "value"
  
  nested_block {
    nested_arg = "nested_value"
  }
}
```

**Terraform Block:**

```hcl
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

---

## 🟡 INTERMEDIATE

### Providers

Providers are plugins that interact with cloud platforms and services.

**Basic Configuration:**

```hcl
provider "aws" {
  region = "us-west-2"
}
```

**Multiple Regions (Aliases):**

```hcl
provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}

# Use aliased provider
resource "aws_instance" "example" {
  provider = aws.us_east
  # ...
}
```

**Authentication (Best Practice - Environment Variables):**

```bash
# AWS
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_DEFAULT_REGION="us-west-2"

# Azure
export ARM_CLIENT_ID="..."
export ARM_CLIENT_SECRET="..."
export ARM_SUBSCRIPTION_ID="..."
export ARM_TENANT_ID="..."

# GCP
export GOOGLE_CREDENTIALS="path/to/key.json"
```

**Common Providers:**

```hcl
# AWS
provider "aws" {
  region = "us-west-2"
}

# Azure
provider "azurerm" {
  features {}
}

# Google Cloud
provider "google" {
  project = "my-project-id"
  region  = "us-central1"
}

# Kubernetes
provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

---

### Resources

Resources are the infrastructure objects Terraform manages.

**Basic Syntax:**

```hcl
resource "provider_type" "local_name" {
  argument1 = "value1"
  argument2 = "value2"
  
  tags = {
    Name = "MyResource"
  }
}
```

**Example - EC2 Instance:**

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
  
  tags = {
    Name        = "WebServer"
    Environment = "Production"
  }
}
```

**Resource References:**

```hcl
# Reference another resource's attribute
resource "aws_eip" "web_ip" {
  instance = aws_instance.web.id  # <type>.<name>.<attribute>
}
```

**Dependencies:**

```hcl
# Implicit (automatic via reference)
resource "aws_instance" "app" {
  subnet_id = aws_subnet.main.id  # Creates subnet first
}

# Explicit
resource "aws_instance" "app" {
  depends_on = [
    aws_iam_role_policy.example,
    aws_security_group.allow_ssh
  ]
}
```

**Lifecycle Rules:**

```hcl
resource "aws_instance" "example" {
  # ...
  
  lifecycle {
    create_before_destroy = true   # Create new before destroying old
    prevent_destroy       = true   # Prevent accidental deletion
    ignore_changes        = [tags] # Ignore external tag changes
    
    # Validation (Terraform 1.2+)
    precondition {
      condition     = var.instance_type != "t2.nano"
      error_message = "t2.nano is not supported."
    }
  }
}
```

---

### Variables

**Declaration (variables.tf):**

```hcl
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}
```

**Variable Types:**

```hcl
# Primitives
variable "name" { type = string }
variable "port" { type = number }
variable "enabled" { type = bool }

# Collections
variable "availability_zones" {
  type    = list(string)
  default = ["us-west-2a", "us-west-2b"]
}

variable "ami_ids" {
  type = map(string)
  default = {
    us-west-2 = "ami-abc123"
    us-east-1 = "ami-def456"
  }
}

# Structural
variable "server_config" {
  type = object({
    name          = string
    instance_type = string
    disk_size     = number
    public        = bool
  })
}

variable "servers" {
  type = list(object({
    name = string
    size = number
  }))
}

# Tuple (fixed length, mixed types)
variable "mixed" {
  type    = tuple([string, number, bool])
  default = ["hello", 42, true]
}
```

**Using Variables:**

```hcl
resource "aws_instance" "example" {
  instance_type = var.instance_type
  ami           = var.ami_ids[var.region]
  
  tags = {
    Name = "${var.project}-${var.environment}"
  }
}
```

**Setting Values:**

| Method | Priority | Example |
|--------|----------|---------|
| `-var` flag | 1 (highest) | `terraform apply -var="instance_type=t2.large"` |
| `-var-file` | 2 | `terraform apply -var-file="prod.tfvars"` |
| `*.auto.tfvars` | 3 | Auto-loaded files |
| `terraform.tfvars` | 4 | Default variable file |
| `TF_VAR_*` env | 5 | `export TF_VAR_instance_type=t2.large` |
| Default value | 6 (lowest) | In variable block |

**Validation:**

```hcl
variable "instance_type" {
  type = string
  
  validation {
    condition     = contains(["t2.micro", "t2.small", "t2.medium"], var.instance_type)
    error_message = "Must be t2.micro, t2.small, or t2.medium."
  }
}

variable "ami_id" {
  type = string
  
  validation {
    condition     = can(regex("^ami-", var.ami_id))
    error_message = "Must start with 'ami-'."
  }
}
```

**Sensitive Variables:**

```hcl
variable "db_password" {
  type      = string
  sensitive = true  # Won't show in logs/output
}
```

---

### Outputs

**Basic Output:**

```hcl
output "instance_ip" {
  value       = aws_instance.web.public_ip
  description = "Public IP of the web server"
}
```

**Complex Output:**

```hcl
output "instance_info" {
  value = {
    id         = aws_instance.web.id
    public_ip  = aws_instance.web.public_ip
    private_ip = aws_instance.web.private_ip
    dns        = aws_instance.web.public_dns
  }
}
```

**Sensitive Output:**

```hcl
output "db_password" {
  value     = random_password.db.result
  sensitive = true
}
```

**View Outputs:**

```bash
terraform output              # All outputs
terraform output instance_ip  # Specific output
terraform output -json        # JSON format
terraform output -raw ip      # Raw value (no quotes)
```

---

### Data Sources

Data sources fetch information about existing resources.

**Find Latest AMI:**

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical
  
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"]
  }
  
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Use it
resource "aws_instance" "web" {
  ami = data.aws_ami.ubuntu.id
}
```

**Get Current Account:**

```hcl
data "aws_caller_identity" "current" {}

output "account_id" {
  value = data.aws_caller_identity.current.account_id
}
```

**Get Availability Zones:**

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}
```

**External Data Source:**

```hcl
data "external" "example" {
  program = ["python3", "${path.module}/script.py"]
  
  query = {
    id = "some-id"
  }
}
```

---

### Locals

Locals are named values calculated within your configuration.

```hcl
locals {
  # Simple values
  project     = "myapp"
  environment = "production"
  
  # Computed values
  name_prefix = "${local.project}-${local.environment}"
  
  # Common tags
  common_tags = {
    Project     = local.project
    Environment = local.environment
    ManagedBy   = "Terraform"
    CreatedAt   = timestamp()
  }
  
  # Complex expressions
  availability_zones = slice(
    data.aws_availability_zones.available.names,
    0,
    min(3, length(data.aws_availability_zones.available.names))
  )
}

# Usage
resource "aws_instance" "example" {
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-instance"
  })
}
```

---

## 🟠 ADVANCED

### Loops

#### count

Creates multiple instances of a resource.

```hcl
resource "aws_instance" "server" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
  
  tags = {
    Name = "Server-${count.index}"  # Server-0, Server-1, Server-2
  }
}

# Reference specific instance
output "first_ip" {
  value = aws_instance.server[0].public_ip
}

# Reference all instances
output "all_ips" {
  value = aws_instance.server[*].public_ip  # Splat expression
}
```

**Conditional with count:**

```hcl
resource "aws_instance" "prod" {
  count = var.environment == "production" ? 1 : 0
  # ...
}
```

#### for_each

Iterate over maps or sets. More flexible than count.

**With Set:**

```hcl
resource "aws_iam_user" "users" {
  for_each = toset(["alice", "bob", "charlie"])
  
  name = each.key  # or each.value (same for sets)
}
```

**With Map:**

```hcl
resource "aws_instance" "servers" {
  for_each = {
    web = "t2.micro"
    app = "t2.small"
    db  = "t2.medium"
  }
  
  instance_type = each.value
  
  tags = {
    Name = "${each.key}-server"
    Role = each.key
  }
}

# Reference
output "web_ip" {
  value = aws_instance.servers["web"].public_ip
}
```

**When to use count vs for_each:**

| Use `count` | Use `for_each` |
|-------------|----------------|
| Simple numeric iteration | Need stable resource identifiers |
| Conditional creation (0 or 1) | Iterating over maps |
| Resources are interchangeable | Each resource is unique |

#### For Expressions

Create new collections from existing ones.

```hcl
# Transform list
locals {
  upper_names = [for name in var.names : upper(name)]
  # ["alice", "bob"] → ["ALICE", "BOB"]
}

# Filter list
locals {
  long_names = [for name in var.names : name if length(name) > 4]
}

# Create map from list
locals {
  name_lengths = { for name in var.names : name => length(name) }
  # {"alice" = 5, "bob" = 3}
}

# Transform resources
output "instance_ips" {
  value = { for instance in aws_instance.web : instance.tags.Name => instance.public_ip }
}
```

#### Splat Expressions

Shorthand for extracting attributes from lists.

```hcl
# Get all IPs
output "all_ips" {
  value = aws_instance.servers[*].public_ip
}

# Equivalent to:
output "all_ips_for" {
  value = [for s in aws_instance.servers : s.public_ip]
}
```

---

### Conditionals

**Ternary Operator:**

```hcl
instance_type = var.environment == "production" ? "t2.large" : "t2.micro"
```

**Conditional Resource Creation:**

```hcl
resource "aws_instance" "bastion" {
  count = var.create_bastion ? 1 : 0
  # ...
}

resource "aws_eip" "bastion" {
  count    = var.create_bastion ? 1 : 0
  instance = aws_instance.bastion[0].id
}
```

**Conditional with for_each:**

```hcl
resource "aws_instance" "optional" {
  for_each = var.create_instances ? var.instance_configs : {}
  # ...
}
```

---

### Dynamic Blocks

Generate nested blocks dynamically.

**Security Group Rules:**

```hcl
variable "ingress_rules" {
  default = [
    { port = 22,  cidr = "10.0.0.0/8" },
    { port = 80,  cidr = "0.0.0.0/0" },
    { port = 443, cidr = "0.0.0.0/0" },
  ]
}

resource "aws_security_group" "example" {
  name = "example"
  
  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = "tcp"
      cidr_blocks = [ingress.value.cidr]
    }
  }
}
```

**With Custom Iterator:**

```hcl
dynamic "ingress" {
  for_each = var.ingress_rules
  iterator = rule  # Custom name instead of 'ingress'
  
  content {
    from_port   = rule.value.port
    to_port     = rule.value.port
    protocol    = "tcp"
    cidr_blocks = [rule.value.cidr]
  }
}
```

**ASG Tags:**

```hcl
resource "aws_autoscaling_group" "example" {
  # ...
  
  dynamic "tag" {
    for_each = local.common_tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}
```

---

### Modules

Reusable infrastructure components.

**Using Local Module:**

```hcl
module "vpc" {
  source = "./modules/vpc"
  
  vpc_cidr     = "10.0.0.0/16"
  project_name = "myapp"
}

# Access module outputs
resource "aws_instance" "app" {
  subnet_id = module.vpc.public_subnet_ids[0]
}
```

**Using Registry Module:**

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"
  
  name = "my-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-west-2a", "us-west-2b", "us-west-2c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
}
```

**Using Git Module:**

```hcl
module "vpc" {
  source = "git::https://github.com/example/terraform-modules.git//vpc?ref=v1.0.0"
}
```

**Module with for_each:**

```hcl
module "s3_buckets" {
  source   = "./modules/s3-bucket"
  for_each = toset(["assets", "logs", "backups"])
  
  bucket_name = "${var.project}-${each.key}"
}
```

**Creating a Module:**

```
modules/vpc/
├── main.tf        # Resources
├── variables.tf   # Inputs
├── outputs.tf     # Outputs
└── versions.tf    # Provider requirements
```

```hcl
# modules/vpc/variables.tf
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
}

# modules/vpc/main.tf
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  
  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# modules/vpc/outputs.tf
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID of the VPC"
}
```

---

### State Management

**State Commands:**

| Command | Description |
|---------|-------------|
| `terraform state list` | List all resources |
| `terraform state show aws_instance.web` | Show resource details |
| `terraform state mv old_name new_name` | Rename resource |
| `terraform state rm aws_instance.web` | Remove from state (doesn't destroy) |
| `terraform state pull` | Download remote state |
| `terraform state push` | Upload state |
| `terraform force-unlock LOCK_ID` | Force unlock state |

**Import Existing Resources:**

```bash
# Basic import
terraform import aws_instance.web i-1234567890abcdef0

# Import with for_each
terraform import 'aws_instance.servers["web"]' i-1234567890abcdef0

# Import module resource
terraform import module.vpc.aws_vpc.main vpc-12345
```

**Import Block (Terraform 1.5+):**

```hcl
import {
  to = aws_instance.web
  id = "i-1234567890abcdef0"
}

# Generate config
# terraform plan -generate-config-out=generated.tf
```

**Moved Block (Terraform 1.1+):**

```hcl
moved {
  from = aws_instance.old_name
  to   = aws_instance.new_name
}

moved {
  from = aws_instance.example
  to   = module.compute.aws_instance.example
}
```

---

### Workspaces

Manage multiple environments with the same configuration.

```bash
terraform workspace list          # List workspaces
terraform workspace new dev       # Create workspace
terraform workspace select prod   # Switch workspace
terraform workspace show          # Current workspace
terraform workspace delete dev    # Delete workspace
```

**Use in Configuration:**

```hcl
locals {
  env_config = {
    dev  = { instance_type = "t2.micro",  count = 1 }
    prod = { instance_type = "t2.large",  count = 5 }
  }
}

resource "aws_instance" "web" {
  count         = local.env_config[terraform.workspace].count
  instance_type = local.env_config[terraform.workspace].instance_type
  
  tags = {
    Environment = terraform.workspace
  }
}
```

---

### Backend Configuration

**S3 Backend (AWS):**

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-lock"  # State locking
  }
}
```

**Azure Backend:**

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}
```

**GCS Backend:**

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "terraform/state"
  }
}
```

**Remote State Data Source:**

```hcl
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "network/terraform.tfstate"
    region = "us-west-2"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.network.outputs.subnet_id
}
```

---

## 📚 REFERENCE

### Functions Reference

**String Functions:**

| Function | Example | Result |
|----------|---------|--------|
| `upper("hello")` | | `"HELLO"` |
| `lower("HELLO")` | | `"hello"` |
| `title("hello world")` | | `"Hello World"` |
| `replace("hello", "l", "L")` | | `"heLLo"` |
| `split(",", "a,b,c")` | | `["a","b","c"]` |
| `join("-", ["a","b"])` | | `"a-b"` |
| `format("Hello, %s!", "World")` | | `"Hello, World!"` |
| `substr("hello", 0, 3)` | | `"hel"` |
| `trimspace(" hello ")` | | `"hello"` |
| `regex("^ami-", var.ami)` | | Match result |

**Collection Functions:**

| Function | Example | Result |
|----------|---------|--------|
| `length(list)` | `length(["a","b"])` | `2` |
| `element(list, idx)` | `element(["a","b"], 1)` | `"b"` |
| `index(list, val)` | `index(["a","b"], "b")` | `1` |
| `contains(list, val)` | `contains(["a","b"], "a")` | `true` |
| `keys(map)` | `keys({a=1})` | `["a"]` |
| `values(map)` | `values({a=1})` | `[1]` |
| `lookup(map, key, default)` | `lookup({a=1}, "b", 0)` | `0` |
| `merge(map1, map2)` | `merge({a=1}, {b=2})` | `{a=1, b=2}` |
| `concat(list1, list2)` | `concat(["a"], ["b"])` | `["a","b"]` |
| `flatten(list)` | `flatten([["a"],["b"]])` | `["a","b"]` |
| `distinct(list)` | `distinct(["a","a","b"])` | `["a","b"]` |
| `slice(list, start, end)` | `slice(["a","b","c"], 0, 2)` | `["a","b"]` |
| `sort(list)` | `sort(["c","a","b"])` | `["a","b","c"]` |
| `reverse(list)` | `reverse(["a","b"])` | `["b","a"]` |
| `zipmap(keys, values)` | `zipmap(["a"], [1])` | `{a=1}` |

**Numeric Functions:**

| Function | Description |
|----------|-------------|
| `abs(-5)` | Absolute value → `5` |
| `ceil(4.3)` | Round up → `5` |
| `floor(4.7)` | Round down → `4` |
| `max(1, 2, 3)` | Maximum → `3` |
| `min(1, 2, 3)` | Minimum → `1` |
| `pow(2, 3)` | Power → `8` |

**Type Conversion:**

| Function | Description |
|----------|-------------|
| `tostring(123)` | `"123"` |
| `tonumber("123")` | `123` |
| `tobool("true")` | `true` |
| `tolist(set)` | Set to list |
| `toset(list)` | List to set (removes duplicates) |
| `tomap(object)` | Object to map |

**IP Network Functions:**

| Function | Example | Result |
|----------|---------|--------|
| `cidrhost("10.0.0.0/16", 5)` | | `"10.0.0.5"` |
| `cidrsubnet("10.0.0.0/16", 8, 2)` | | `"10.0.2.0/24"` |
| `cidrnetmask("10.0.0.0/16")` | | `"255.255.0.0"` |

**File Functions:**

```hcl
file("${path.module}/file.txt")           # Read file
fileexists("${path.module}/file.txt")     # Check exists
templatefile("template.tpl", { var = "value" })  # Template
fileset("${path.module}", "*.tf")         # List files
```

**Encoding Functions:**

```hcl
base64encode("hello")          # Encode
base64decode("aGVsbG8=")       # Decode
jsonencode({a = 1})            # Object to JSON
jsondecode("{\"a\":1}")        # JSON to object
yamlencode({a = 1})            # Object to YAML
yamldecode("a: 1")             # YAML to object
```

---

## ✅ PRODUCTION

### Best Practices

**1. Version Control:**

```gitignore
# .gitignore
*.tfstate
*.tfstate.*
*.tfvars
.terraform/
.terraform.lock.hcl
crash.log
override.tf
override.tf.json
*_override.tf
*_override.tf.json
```

**2. Version Constraints:**

```hcl
terraform {
  required_version = ">= 1.0, < 2.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # >= 5.0, < 6.0
    }
  }
}
```

**3. Remote State with Locking:**

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}
```

**4. Use Modules for Reusability:**

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"  # Pin to specific version
}
```

**5. Naming Conventions:**

```hcl
# Use underscores for resource names
resource "aws_instance" "web_server" {}

# Use descriptive names
variable "enable_monitoring" {}
output "load_balancer_dns" {}
```

**6. Use Locals for Computed Values:**

```hcl
locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
```

**7. Never Commit Secrets:**

```bash
# Use environment variables
export TF_VAR_db_password="secret"

# Or use AWS Secrets Manager / HashiCorp Vault
data "aws_secretsmanager_secret_version" "db" {
  secret_id = "prod/db/password"
}
```

---

## 🔧 TROUBLESHOOTING

### Debugging

**Enable Logging:**

```bash
export TF_LOG=DEBUG           # TRACE, DEBUG, INFO, WARN, ERROR
export TF_LOG_PATH=terraform.log
terraform apply
```

**Provider-Specific Logging:**

```bash
export TF_LOG_PROVIDER=DEBUG
export TF_LOG_CORE=DEBUG
```

**Common Issues:**

| Issue | Solution |
|-------|----------|
| State lock timeout | `terraform force-unlock LOCK_ID` |
| Provider version conflict | `terraform init -upgrade` |
| Resource already exists | Import with `terraform import` |
| Cycle error | Check circular dependencies |
| Invalid resource address | Check resource naming and references |

**Validate Before Apply:**

```bash
terraform fmt -check -recursive   # Check formatting
terraform validate                # Check syntax
terraform plan                    # Preview changes
```

---

## 🔗 Quick Reference

```bash
# Complete workflow
terraform init        # Initialize
terraform fmt         # Format
terraform validate    # Validate
terraform plan        # Preview
terraform apply       # Apply
terraform destroy     # Cleanup

# Common flags
-auto-approve         # Skip confirmation
-var="key=value"      # Set variable
-var-file="file"      # Use variable file
-target=resource      # Target specific resource
-parallelism=10       # Concurrent operations
-replace=resource     # Force recreate
-refresh-only         # Only refresh state

# State management
terraform state list
terraform state show <resource>
terraform import <resource> <id>
terraform state mv <old> <new>
terraform state rm <resource>
```

---

> **Remember:** Write → Plan → Apply. Always review the plan before applying.
