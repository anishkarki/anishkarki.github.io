## Day 8: Cluster Architecture & Multi-Node Deployment

### Must Remember
- Terraform auto-loads ALL `.tf` files in the same directory and merges them into one configuration.
- `.auto.tfvars` files are automatically loaded; regular `.tfvars` require `-var-file` flag.
- Bastion hosts provide secure access to private subnet resources without exposing them to the internet.

### Can View Docs (Because Values Change)
- Flavor IDs and image names vary per OpenStack deployment.
- Floating IP ranges depend on your external network configuration.

---

### Target Architecture

Today we build a production-like cluster with bastion host and private worker nodes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EVERYTHINGIS0AND1-NETWORK                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PUBLIC SUBNET (10.0.1.0/24)           PRIVATE SUBNET (10.0.2.0/24)       │
│   ┌─────────────────────────┐           ┌─────────────────────────────┐    │
│   │                         │           │                             │    │
│   │   BASTION VM            │           │   CLUSTER P1                │    │
│   │   ┌─────────────────┐   │           │   ┌───────────┐ ┌─────────┐ │    │
│   │   │ 10.0.1.10 (eth0)│   │    SSH    │   │ p1-n1     │ │ p1-n2   │ │    │
│   │   │                 │◄──┼───────────┼──►│ 10.0.2.21 │ │10.0.2.22│ │    │
│   │   │ 10.0.2.10 (eth1)│───┼───────────┼──►│ 256MB     │ │256MB    │ │    │
│   │   └────────┬────────┘   │           │   └───────────┘ └─────────┘ │    │
│   │            │            │           │                             │    │
│   └────────────┼────────────┘           └─────────────────────────────┘    │
│                │                                                            │
│         Floating IP                                                         │
│        172.24.4.189                                                        │
│                │                                                            │
└────────────────┼────────────────────────────────────────────────────────────┘
                 │
           YOUR LAPTOP
```

---

### Project Structure

```
Cloud_Lab/day-7/
├── main.tf              ─┐
├── variables.tf          │
├── outputs.tf            ├── ALL loaded together as ONE configuration
├── cluster.tf            │
├── cluster.auto.tfvars  ─┘
└── modules/
    └── network/          ← Separate module (called via "module" block)
```

---

### How Terraform Loads Files

Terraform **automatically loads** all `.tf` files in the same directory and merges them:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TERRAFORM LOADING PROCESS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Terraform reads ALL .tf files in day-7/                           │
│  ─────────────────────────────────────────────────                          │
│                                                                             │
│    main.tf         variables.tf      cluster.tf       outputs.tf           │
│       │                 │                │                │                 │
│       ▼                 ▼                ▼                ▼                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MERGED INTO ONE CONFIGURATION                     │   │
│  │                                                                      │   │
│  │  • provider "openstack" { }     (from main.tf)                      │   │
│  │  • variable "clusters" { }      (from variables.tf)                 │   │
│  │  • resource "...cluster..." { } (from cluster.tf)                   │   │
│  │  • output "cluster_nodes" { }   (from outputs.tf)                   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Step 2: Terraform loads .tfvars files                                     │
│  ─────────────────────────────────────                                      │
│                                                                             │
│    cluster.auto.tfvars  ──► Automatically loaded (*.auto.tfvars)           │
│    terraform.tfvars     ──► Automatically loaded                            │
│                                                                             │
│  Step 3: Variables get their values                                        │
│  ───────────────────────────────────                                        │
│                                                                             │
│    var.clusters = {                                                         │
│      "p1" = { nodes = 2, ram_mb = [256, 256] }                             │
│    }                                                                        │
│                                                                             │
│  Step 4: Resources in cluster.tf use those variables                       │
│  ─────────────────────────────────────────────────────                      │
│                                                                             │
│    cluster.tf reads var.clusters ──► Creates VMs                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### The Connection Chain

```
# cluster.auto.tfvars (VALUES)
clusters = {
  "p1" = { nodes = 2, ram_mb = [256, 256] }
}
        │
        ▼
# variables.tf (DEFINITION)
variable "clusters" {
  type = map(object({...}))
}
        │
        ▼
# cluster.tf (USAGE)
for cluster_id, cluster in var.clusters : [...]
        │
        ▼
# Creates: everythingis0and1-p1-n1, everythingis0and1-p1-n2
```

---

### File Breakdown

#### cluster.auto.tfvars
```hcl
# Cluster definitions - automatically loaded
clusters = {
  "p1" = {
    nodes  = 2
    ram_mb = [256, 256]  # RAM for each node
  }
}
```

#### variables.tf (Cluster Variables)
```hcl
variable "clusters" {
  description = "Map of cluster configurations"
  type = map(object({
    nodes  = number
    ram_mb = list(number)
  }))
  default = {}
}

variable "name_prefix" {
  type        = string
  description = "Prefix for all resource names"
  default     = "everythingis0and1"
}
```

#### cluster.tf
```hcl
# Flatten cluster definitions into individual node specs
locals {
  cluster_nodes = flatten([
    for cluster_id, cluster in var.clusters : [
      for i in range(cluster.nodes) : {
        cluster_id = cluster_id
        node_index = i + 1
        node_name  = "${var.name_prefix}-${cluster_id}-n${i + 1}"
        ram_mb     = cluster.ram_mb[i]
      }
    ]
  ])
}

# Find the flavor that matches RAM requirements
data "openstack_compute_flavor_v2" "cluster_flavors" {
  for_each = { for node in local.cluster_nodes : node.node_name => node }
  ram      = each.value.ram_mb
}

# Create cluster nodes in private subnet
resource "openstack_compute_instance_v2" "cluster_nodes" {
  for_each = { for node in local.cluster_nodes : node.node_name => node }

  name            = each.value.node_name
  image_id        = data.openstack_images_image_v2.cirros.id
  flavor_id       = data.openstack_compute_flavor_v2.cluster_flavors[each.key].id
  key_pair        = openstack_compute_keypair_v2.main.name
  security_groups = [module.network.security_group_name]

  network {
    uuid = module.network.network_id
    fixed_ip_v4 = cidrhost(var.private_cidr, 100 + each.value.node_index - 1)
  }
}
```

---

### Bastion Host Configuration

The bastion has **two NICs** - one in public subnet (accessible via floating IP), one in private subnet (can reach cluster nodes):

```hcl
resource "openstack_compute_instance_v2" "bastion" {
  name            = "${var.name_prefix}-bastion"
  image_id        = data.openstack_images_image_v2.cirros.id
  flavor_id       = data.openstack_compute_flavor_v2.small.id
  key_pair        = openstack_compute_keypair_v2.main.name
  security_groups = [module.network.security_group_name]

  # Public network interface (eth0)
  network {
    uuid        = module.network.network_id
    fixed_ip_v4 = "10.0.1.10"
  }

  # Private network interface (eth1)
  network {
    uuid        = module.network.network_id
    fixed_ip_v4 = "10.0.2.10"
  }
}

# Floating IP for external access
resource "openstack_networking_floatingip_v2" "bastion" {
  pool = var.external_network_name
}

resource "openstack_compute_floatingip_associate_v2" "bastion" {
  floating_ip = openstack_networking_floatingip_v2.bastion.address
  instance_id = openstack_compute_instance_v2.bastion.id
}
```

---

### Traffic Flow

```
YOUR LAPTOP
     │
     │ ssh cirros@172.24.4.182
     ▼
┌─────────────────────────────────────────────────────────────────┐
│  BASTION (172.24.4.182)                                         │
│  ├── Public:  10.0.1.10                                         │
│  └── Private: 10.0.2.10                                         │
│           │                                                      │
│           │ ssh cirros@10.0.2.100                               │
│           ▼                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │ p1-n1               │  │ p1-n2               │              │
│  │ 10.0.2.100          │  │ 10.0.2.101          │              │
│  │ 256MB RAM           │  │ 256MB RAM           │              │
│  └─────────────────────┘  └─────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

### Testing The Deployment

#### Step 1: SSH to Bastion
```sh
ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no \
    cirros@172.24.4.182 -i ~/.ssh/id_rsa_terra \
    "echo 'SSH works!'"
```

Expected output:
```
Warning: Permanently added '172.24.4.182' (ED25519) to the list of known hosts.
SSH works!
```

#### Step 2: Ping Cluster Nodes from Bastion
```sh
ssh -o StrictHostKeyChecking=no cirros@172.24.4.182 -i ~/.ssh/id_rsa_terra \
    "ping -c 2 10.0.2.100 && ping -c 2 10.0.2.101"
```

Expected output:
```
PING 10.0.2.100 (10.0.2.100) 56(84) bytes of data.
64 bytes from 10.0.2.100: icmp_seq=1 ttl=64 time=4.26 ms
64 bytes from 10.0.2.100: icmp_seq=2 ttl=64 time=1.58 ms

--- 10.0.2.100 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1002ms

PING 10.0.2.101 (10.0.2.101) 56(84) bytes of data.
64 bytes from 10.0.2.101: icmp_seq=1 ttl=64 time=3.88 ms
64 bytes from 10.0.2.101: icmp_seq=2 ttl=64 time=1.59 ms

--- 10.0.2.101 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1001ms
```

#### Step 3: SSH to Cluster Node via Bastion
```sh
# First, copy your key to bastion
scp -i ~/.ssh/id_rsa_terra ~/.ssh/id_rsa_terra cirros@172.24.4.182:~/.ssh/

# Then SSH to cluster node
ssh -o StrictHostKeyChecking=no cirros@172.24.4.182 -i ~/.ssh/id_rsa_terra \
    "ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_rsa_terra cirros@10.0.2.100 'hostname'"
```

---

### Outputs

```hcl
output "bastion_floating_ip" {
  description = "Floating IP of the bastion host"
  value       = openstack_networking_floatingip_v2.bastion.address
}

output "bastion_private_ip" {
  description = "Private subnet IP of bastion"
  value       = openstack_compute_instance_v2.bastion.network[1].fixed_ip_v4
}

output "cluster_nodes" {
  description = "Map of cluster node names to their private IPs"
  value = {
    for name, instance in openstack_compute_instance_v2.cluster_nodes :
    name => instance.access_ip_v4
  }
}
```

---

### Quick Quiz

**Q: Why does the bastion need two NICs?**
A: One NIC in the public subnet receives external traffic via floating IP. The second NIC in the private subnet can reach cluster nodes that have no public access.

**Q: What's the difference between `.tfvars` and `.auto.tfvars`?**
A: Files ending in `.auto.tfvars` are automatically loaded. Regular `.tfvars` files require `-var-file=filename.tfvars` on the command line.

**Q: Why use `for_each` instead of `count` for cluster nodes?**
A: `for_each` creates resources with meaningful names (`cluster_nodes["p1-n1"]`) instead of indices (`cluster_nodes[0]`), making state management easier when adding/removing nodes.

---

### End-Of-Day Checklist

- [ ] Understand Terraform's file loading order
- [ ] Know the difference between `.tfvars` and `.auto.tfvars`
- [ ] Grasp the bastion pattern for accessing private resources
- [ ] Successfully SSH to bastion and ping cluster nodes
- [ ] Understand the `for_each` pattern for dynamic resource creation

You now have a production-ready cluster architecture with secure bastion access!
