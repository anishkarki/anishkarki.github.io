---
title: "OpenStack Management: Complete Setup, Infrastructure as Code, and Essential Commands"
date: "2025-11-16"
category: "Cloud Infrastructure - OpenStack"
tags: ["OpenStack", "Infrastructure as Code", "Terraform", "Cloud Management", "DevOps", "Networking"]
excerpt: "Master OpenStack management from authentication to infrastructure provisioning. Learn how to use Terraform for Infrastructure as Code, configure networking, manage VMs, and essential OpenStack CLI commands for production environments."
author: "Anish Karki"
featured: true
---

# OpenStack Management: Complete Setup, Infrastructure as Code, and Essential Commands

OpenStack is a powerful open-source cloud computing platform that provides Infrastructure as a Service (IaaS). In this comprehensive guide, I'll share everything I've learned managing OpenStack environments—from initial setup and authentication to deploying production infrastructure using Terraform, and the essential commands needed to operate it effectively.

## Introduction: Why OpenStack?

OpenStack has become the backbone of enterprise private cloud deployments worldwide. Whether you're managing a small proof-of-concept or a massive multi-region deployment, OpenStack provides the flexibility and control that proprietary cloud solutions often lack.

**Key advantages I've experienced**:
- Complete control over your infrastructure
- No vendor lock-in compared to AWS or Azure
- Ability to run on-premises or hybrid deployments
- Cost-effective scaling for large workloads

## Part 1: OpenStack Authentication & RC Files

### Understanding OpenStack RC Files

The OpenStack RC file (Resource Configuration) is your gateway to authenticating with your cloud. It contains credentials and endpoint information needed for the OpenStack CLI.

```bash
#!/usr/bin/env bash

# === OPENSTACK RC FILE ===
export OS_AUTH_URL=http://<your-openstack-ip>/identity
export OS_IDENTITY_API_VERSION=3
export OS_INTERFACE=public

export OS_PROJECT_NAME="admin"
export OS_PROJECT_ID=<your-project-id>
export OS_PROJECT_DOMAIN_NAME="Default"
export OS_USER_DOMAIN_NAME="Default"

export OS_USERNAME="admin"
export OS_PASSWORD="<your-password>"

export OS_REGION_NAME="RegionOne"

# Optional: disable SSL warnings (if self-signed cert)
# export OS_INSECURE=true
```

### Sourcing the RC File

Before running any OpenStack commands, source your RC file:

```bash
source ./admin-openrc.sh
```

Once sourced, your environment variables are set and you can interact with OpenStack:

```bash
# Verify authentication
openstack token issue

# See current project
openstack project show admin
```

## Part 2: Infrastructure as Code with Terraform

### Why Terraform for OpenStack?

Terraform provides Infrastructure as Code capabilities for OpenStack, allowing you to:
- Version control your infrastructure
- Reproduce environments consistently
- Collaborate on infrastructure changes
- Implement CI/CD for infrastructure

### Project Repository

All Terraform configurations are available in my repository:
📁 **Repo**: [anishkarki/openstack-terraform](https://github.com/anishkarki/openstack-terraform)

### Core Terraform Files

#### 1. Provider Configuration (`provider.tf`)

```terraform
terraform {
  required_providers {
    openstack = {
      source = "terraform-provider-openstack/openstack"
    }
  }
}

provider "openstack" {
  auth_url    = var.auth_url
  project_name = var.project_name
  username    = var.username
  password    = var.password
  region      = var.region
}
```

#### 2. Variables Configuration (`variables.tf`)

```terraform
variable "config_file" {
  default = "config.yaml"
}

variable "private_key_path" {
  default = "~/.ssh/id_rsa_terra"
}
```

#### 3. Configuration File (`config.yaml`)

```yaml
vpc:
  name: "prod-vpc"
  cidr: "10.200.0.0/24"
  gateway_ip: "10.200.0.1"
  dns_nameservers: ["8.8.8.8", "8.8.4.4"]

nsg:
  name: "prod-nsg"
  description: "Production Network Security Group"
  allow_ssh_from: "0.0.0.0/0"
  allow_http: true
  allow_https: true
  allow_icmp: true

cluster:
  keypair_name: "terra-key"
  external_network: "external"
  image: "Debian 12"
  flavor: "m1.small"

vms:
  - name: "app-1"
    ip: "10.200.0.11"
  - name: "app-2"
    ip: "10.200.0.12"
  - name: "db-1"
    ip: "10.200.0.13"
```

#### 4. Main Infrastructure (`main.tf`)

The main Terraform file orchestrates the entire infrastructure:

**VPC & Networking**:
```terraform
resource "openstack_networking_network_v2" "vpc_net" {
  name           = local.vpc.name
  admin_state_up = true
}

resource "openstack_networking_subnet_v2" "vpc_subnet" {
  name            = "${local.vpc.name}-subnet"
  network_id      = openstack_networking_network_v2.vpc_net.id
  cidr            = local.vpc.cidr
  gateway_ip      = local.vpc.gateway_ip
  dns_nameservers = local.vpc.dns_nameservers
}
```

**Router & External Gateway**:
```terraform
resource "openstack_networking_router_v2" "router" {
  name                = "${local.vpc.name}-router"
  admin_state_up      = true
  external_network_id = data.openstack_networking_network_v2.ext_net.id
}

resource "openstack_networking_router_interface_v2" "router_int" {
  router_id = openstack_networking_router_v2.router.id
  subnet_id = openstack_networking_subnet_v2.vpc_subnet.id
}
```

**Security Group**:
```terraform
resource "openstack_networking_secgroup_v2" "nsg" {
  name        = local.nsg.name
  description = local.nsg.description
}

# SSH
resource "openstack_networking_secgroup_rule_v2" "ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = local.nsg.allow_ssh_from
  security_group_id = openstack_networking_secgroup_v2.nsg.id
}

# HTTP
resource "openstack_networking_secgroup_rule_v2" "http" {
  count             = local.nsg.allow_http ? 1 : 0
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 80
  port_range_max    = 80
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.nsg.id
}
```

**VM Deployment**:
```terraform
resource "openstack_compute_instance_v2" "vm" {
  for_each = { for vm in local.vms : vm.name => vm }

  name      = each.value.name
  image_id  = data.openstack_images_image_v2.img.id
  flavor_id = data.openstack_compute_flavor_v2.flavor.id
  key_pair  = openstack_compute_keypair_v2.key.name

  network {
    port = openstack_networking_port_v2.vm_port[each.key].id
  }
}
```

**Floating IPs for External Access**:
```terraform
resource "openstack_networking_floatingip_v2" "fip" {
  for_each = openstack_networking_port_v2.vm_port
  pool     = data.openstack_networking_network_v2.ext_net.name
}

resource "openstack_networking_floatingip_associate_v2" "fip_assoc" {
  for_each    = openstack_networking_port_v2.vm_port
  floating_ip = openstack_networking_floatingip_v2.fip[each.key].address
  port_id     = each.value.id
}
```

### Deploying with Terraform

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply configuration
terraform apply

# Destroy when done (use with caution!)
terraform destroy
```

## Part 3: Essential OpenStack Management Commands

### 1. Server/Instance Management

#### List All Servers
```bash
openstack server list
openstack server list --all-projects  # as admin
```

#### Create a Server
```bash
openstack server create \
  --image <image-id> \
  --flavor m1.small \
  --key-name <keypair-name> \
  --security-group <security-group> \
  --nic net-id=<network-id> \
  my-server
```

#### Show Server Details
```bash
openstack server show <server-id>
```

#### Start/Stop/Reboot Server
```bash
openstack server start <server-id>
openstack server stop <server-id>
openstack server reboot <server-id>
openstack server reboot --hard <server-id>  # Force reboot
```

#### Delete a Server
```bash
openstack server delete <server-id>
```

#### Get Server Logs
```bash
openstack console log show <server-id>
openstack console url show <server-id>  # VNC console URL
```

### 2. Floating IP Management

#### List Floating IPs
```bash
openstack floating ip list
```

#### Create a Floating IP
```bash
openstack floating ip create <external-network>
```

#### Assign Floating IP to Server
```bash
openstack server add floating ip <server-id> <floating-ip>
```

#### Remove Floating IP
```bash
openstack server remove floating ip <server-id> <floating-ip>
openstack floating ip delete <floating-ip>
```

### 3. Network & Subnet Management

#### List Networks
```bash
openstack network list
```

#### Create Network
```bash
openstack network create \
  --project <project-id> \
  my-network
```

#### Create Subnet
```bash
openstack subnet create \
  --network <network-id> \
  --subnet-range 10.0.0.0/24 \
  my-subnet
```

#### Show Network Details
```bash
openstack network show <network-id>
openstack subnet show <subnet-id>
```

### 4. Security Group Management

#### List Security Groups
```bash
openstack security group list
```

#### Create Security Group
```bash
openstack security group create \
  --description "My Security Group" \
  my-sg
```

#### Add Security Group Rule
```bash
# SSH (port 22)
openstack security group rule create \
  --protocol tcp \
  --dst-port 22:22 \
  my-sg

# HTTP (port 80)
openstack security group rule create \
  --protocol tcp \
  --dst-port 80:80 \
  my-sg

# Custom port range
openstack security group rule create \
  --protocol tcp \
  --dst-port 8000:8999 \
  my-sg

# ICMP (ping)
openstack security group rule create \
  --protocol icmp \
  my-sg
```

#### Remove Security Group Rule
```bash
openstack security group rule delete <rule-id>
```

### 5. Image Management

#### List Available Images
```bash
openstack image list
```

#### Upload Custom Image
```bash
openstack image create \
  --file <image-file>.qcow2 \
  --disk-format qcow2 \
  --container-format bare \
  my-custom-image
```

#### Show Image Details
```bash
openstack image show <image-id>
```

### 6. Flavor Management

#### List Available Flavors
```bash
openstack flavor list
```

#### Create Custom Flavor
```bash
openstack flavor create \
  --ram 4096 \
  --disk 20 \
  --vcpus 2 \
  --public \
  m1.custom
```

### 7. SSH Key Management

#### List Key Pairs
```bash
openstack keypair list
```

#### Create Key Pair
```bash
openstack keypair create my-key > my-key.pem
chmod 600 my-key.pem
```

#### Delete Key Pair
```bash
openstack keypair delete my-key
```

### 8. Volume Management

#### List Volumes
```bash
openstack volume list
```

#### Create Volume
```bash
openstack volume create \
  --size 10 \
  my-volume
```

#### Attach Volume to Server
```bash
openstack server add volume <server-id> <volume-id>
```

#### Detach Volume
```bash
openstack server remove volume <server-id> <volume-id>
```

#### Delete Volume
```bash
openstack volume delete <volume-id>
```

### 9. Router Management

#### List Routers
```bash
openstack router list
```

#### Create Router
```bash
openstack router create my-router
```

#### Add Subnet to Router
```bash
openstack router add subnet <router-id> <subnet-id>
```

#### Set External Gateway
```bash
openstack router set \
  --external-gateway <external-network> \
  my-router
```

### 10. Project & User Management (Admin)

#### List Projects
```bash
openstack project list
```

#### Create Project
```bash
openstack project create \
  --domain default \
  my-project
```

#### List Users
```bash
openstack user list
```

#### Create User
```bash
openstack user create \
  --domain default \
  --password <password> \
  my-user
```

#### Assign Role to User
```bash
openstack role add \
  --project <project-id> \
  --user <user-id> \
  <role-name>
```

### 11. Quota Management (Admin)

#### Show Project Quotas
```bash
openstack quota show <project-id>
```

#### Set Quotas
```bash
openstack quota set \
  --instances 10 \
  --cores 20 \
  --ram 10240 \
  --volumes 5 \
  <project-id>
```

### 12. Monitoring & Diagnostics

#### Check Service Status
```bash
openstack service list
openstack endpoint list
```

#### Server Diagnostics
```bash
# Get CPU, disk, memory stats
openstack server lock <server-id>    # Lock server
openstack server unlock <server-id>  # Unlock server
openstack server pause <server-id>
openstack server unpause <server-id>
```

#### Check Hypervisor Status
```bash
openstack hypervisor list
openstack hypervisor show <hypervisor-name>
```

## Practical Workflow: Deploying a Multi-Tier Application

Here's how I typically deploy a production environment:

### Step 1: Source Credentials
```bash
source ./admin-openrc.sh
```

### Step 2: Prepare Infrastructure with Terraform
```bash
cd openstack-terraform
terraform init
terraform plan
terraform apply -auto-approve
```

### Step 3: Verify Deployment
```bash
openstack server list
openstack floating ip list
```

### Step 4: SSH into Instances
```bash
ssh -i ~/.ssh/id_rsa_terra debian@<floating-ip>
```

### Step 5: Configure Applications
```bash
# From the VM
curl http://169.254.169.254/latest/meta-data/  # Instance metadata
```

### Step 6: Monitor and Maintain
```bash
# Regular health checks
openstack server list
openstack volume list
openstack floating ip list

# Check resource quotas
openstack quota show <project-id>

# Monitor server resources
openstack server show <server-id> | grep status
```

## Best Practices I've Learned

### 1. Always Use Security Groups
Don't rely on network segmentation alone—use security groups for defense-in-depth.

### 2. Implement Proper Tagging
```bash
openstack server set --property environment=production <server-id>
openstack server set --property owner=platform-team <server-id>
```

### 3. Use Terraform for Everything
Version control and automation reduce human error significantly.

### 4. Regular Backups
```bash
# Create volume snapshot
openstack volume snapshot create \
  --volume <volume-id> \
  my-snapshot
```

### 5. Monitor Quotas
Always check quotas before deploying:
```bash
openstack quota show <project-id>
openstack limits show
```

### 6. Use Floating IPs Wisely
Floating IPs are a precious resource. Only assign them when needed for external access.

### 7. Implement Proper Naming Conventions
Use clear, descriptive names:
```
Format: <environment>-<component>-<version>
Example: prod-api-v1, staging-db-v2
```

## Troubleshooting Common Issues

### Server Stuck in Build State
```bash
openstack server reset state <server-id>
openstack server delete <server-id>  # Force delete if needed
```

### Cannot Connect via SSH
```bash
# Check security group
openstack security group show <sg-id>

# Check floating IP assignment
openstack server show <server-id> | grep -E "floating|addresses"

# Verify network connectivity
openstack network show <network-id>
```

### Floating IP Already in Use
```bash
openstack floating ip unset <floating-ip>
openstack floating ip delete <floating-ip>
openstack floating ip create <external-network>
```

## Advanced Topics

### Automation with Heat (CloudFormation for OpenStack)

Heat is OpenStack's orchestration engine:

```bash
# List stacks
openstack stack list

# Create stack from template
openstack stack create \
  -t my-template.yaml \
  my-stack

# Delete stack
openstack stack delete my-stack
```

### Volume Snapshots and Backups

```bash
# Create snapshot
openstack volume snapshot create \
  --volume <volume-id> \
  my-snapshot

# Create backup
openstack volume backup create <volume-id>

# List backups
openstack volume backup list
```

## Conclusion: Mastering OpenStack Management

OpenStack provides tremendous flexibility and control for managing your infrastructure. Whether you're using Terraform for Infrastructure as Code or managing resources through the CLI, the key is to:

1. **Automate Everything** - Use Terraform for reproducibility
2. **Document Your Setup** - Keep RC files and configurations versioned
3. **Monitor Continuously** - Regular checks prevent surprises
4. **Use Security Groups** - Implement proper network segmentation
5. **Plan for Scale** - Design with growth in mind

## Resources

- 📁 **Terraform Repository**: [anishkarki/openstack-terraform](https://github.com/anishkarki/openstack-terraform)
- 📚 **OpenStack Documentation**: [docs.openstack.org](https://docs.openstack.org)
- 🔧 **Terraform Provider**: [registry.terraform.io/providers/terraform-provider-openstack/openstack](https://registry.terraform.io/providers/terraform-provider-openstack/openstack)

---

*Managing complex cloud infrastructure doesn't have to be overwhelming. Start with Terraform, master the essential CLI commands, and build from there. Happy infrastructure coding!*

*Have questions about OpenStack management or want to discuss infrastructure automation? Connect with me on [LinkedIn](https://www.linkedin.com/in/anish-karki-dba/) or [send me an email](mailto:anish.karki1.618@outlook.com).*

