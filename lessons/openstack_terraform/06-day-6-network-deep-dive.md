## Day 6: OpenStack Networking Deep Dive

### Must Remember
- OpenStack networking has layers: Network → Subnet → Router → Ports → Floating IPs. Each layer depends on the one below.
- Private subnets use RFC 1918 ranges (10.x, 172.16.x, 192.168.x) that are non-routable on the public internet.
- Security Groups are virtual firewalls with a default "deny all" policy. You must explicitly allow traffic.

### Can View Docs (Because IDs Change)
- Network, subnet, and router IDs are unique to your OpenStack deployment. Query them with CLI commands.
- External network names vary by cloud provider—confirm with `openstack network list --external`.

---

### Target Architecture

Today we build a complete network module with Terraform. Here's the project structure:

```
day-6/
├── main.tf
├── outputs.tf
├── terraform.tfvars
├── variables.tf
└── modules/
    └── network/
        ├── main.tf
        ├── outputs.tf
        └── variables.tf
```

---

### File Roles (Building A House With Blueprints)

| File | Purpose | Analogy |
|------|---------|---------|
| `main.tf` | Primary config where resources live | The main blueprint showing where every room goes |
| `variables.tf` | Declares input variables | The order form—customize sizes, names, counts |
| `terraform.tfvars` | Provides actual values | The filled-out order with your specific choices |
| `outputs.tf` | Exports information after apply | The receipt—here's your network ID and IPs |
| `modules/` | Reusable configuration packages | IKEA furniture kits—plug in values, get infrastructure |

---

### Networking Concepts Foundation

#### IP Address Anatomy
Every device on a network needs a unique address:
```
IPv4 Format: XXX.XXX.XXX.XXX
Example:     192.168.1.10
             └─┬─┘└─┬┘└┬┘└┬┘
              │   │  │  │
        Network  │  │  └── Specific device (0-255)
              │  │  └───── Subnet section
              │  └──────── More network info
              └─────────── Network identifier
```

#### CIDR Notation Demystified
CIDR tells you how many addresses are in a range. Think of it as pizza slices:

```
┌─────────────────────────────────────────────────────────┐
│  CIDR: 192.168.1.0/24                                   │
│  ════════════════════                                   │
│                                                         │
│  The /24 means: First 24 bits are LOCKED (network part) │
│                 Last 8 bits are FREE (host addresses)   │
│                                                         │
│  192.168.1.[0-255] = 256 addresses (254 usable)        │
└─────────────────────────────────────────────────────────┘

Common CIDRs:
  /24 = 256 IPs   (Small office)     → "One street"
  /16 = 65,536 IPs (Large company)   → "Entire city"
  /8  = 16 million IPs (Enterprise)  → "Entire country"
```

#### Reserved Addresses (The IP Tax)
Every subnet loses four addresses before VMs get any:

| Address | Purpose | Analogy |
|---------|---------|---------|
| `.0` | Network address | Street sign for the lane |
| `.1` | Gateway | Security gate to the internet |
| `.2` | DHCP server | Robot handing out IPs |
| `.255` | Broadcast | Megaphone shouting to everyone |

A `/28` gives 16 total addresses, but only 12 are usable.

---

### Private vs Public Subnets

| Type | Definition | IP Ranges |
|------|------------|-----------|
| Private | Cannot be accessed directly from internet | 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 |
| Public | Can be accessed directly from internet | Any globally routable IP |

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET                              │
│                      🌍 (The World)                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              │ Can access directly
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PUBLIC SUBNET (10.0.1.0/24)                                │
│  🏪 Store Front - Web Servers, Load Balancers               │
│  "Anyone can walk in"                                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              │ Internal only
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PRIVATE SUBNET (10.0.2.0/24)                               │
│  🏠 Living Room - Databases, Internal Apps                  │
│  "Must go through front door (router) first"                │
└─────────────────────────────────────────────────────────────┘
```

These ranges are defined by RFC 1918. Routers on the public internet drop traffic from these ranges, making them safe to reuse behind NAT.

---

### OpenStack Network Components

#### 1. Network (`openstack_networking_network_v2`)
A Layer 2 virtual switch—an isolated broadcast domain.
```
┌──────────────────────────────────────┐
│           NETWORK                    │
│    "The Office Building"             │
│                                      │
│   ┌──────────┐    ┌──────────┐      │
│   │ Subnet 1 │    │ Subnet 2 │      │
│   │ "Floor 1"│    │ "Floor 2"│      │
│   └──────────┘    └──────────┘      │
│                                      │
│   Internal wiring connects all      │
└──────────────────────────────────────┘
```

#### 2. Subnet (`openstack_networking_subnet_v2`)
IP range within a network. Each floor has its own room numbers.
```
Subnet Properties:
├── network_id  → Which building am I in?
├── cidr        → What room numbers? (10.0.1.0/24)
├── gateway_ip  → Where's the elevator to other floors?
├── dns         → Who handles name resolution? (8.8.8.8)
└── dhcp        → Auto-assign room numbers? (true/false)
```

#### 3. Router (`openstack_networking_router_v2`)
Connects subnets and provides external access—the building's main entrance plus elevator system.
```
                    INTERNET
                        │
                   ┌────▼────┐
                   │ ROUTER  │ ← Main Entrance
                   │ "Lobby" │
                   └────┬────┘
           ┌────────────┼────────────┐
           │            │            │
      ┌────▼───┐   ┌────▼───┐   ┌────▼───┐
      │Subnet 1│   │Subnet 2│   │Subnet 3│
      │Floor 1 │   │Floor 2 │   │Floor 3 │
      └────────┘   └────────┘   └────────┘
```

#### 4. Router Interface (`openstack_networking_router_interface_v2`)
The elevator door on each floor. Without it, the router can't stop there.
```hcl
router_interface:
├── router_id  → Which elevator system?
└── subnet_id  → Which floor to add a door to?
```

#### 5. Floating IP (`openstack_networking_floatingip_v2`)
A portable public phone number you can attach to any VM.
```
┌─────────────────────────────────────────────────────────┐
│  Internet User dials: 203.0.113.50 (Floating IP)       │
│                           │                             │
│                           ▼                             │
│              ┌─────────────────────┐                    │
│              │   NAT Translation   │                    │
│              │ "Phone Switchboard" │                    │
│              └──────────┬──────────┘                    │
│                         │                               │
│                         ▼                               │
│              Internal: 10.0.1.5 (Private IP)           │
│              "Your desk phone rings"                    │
└─────────────────────────────────────────────────────────┘
```

#### 6. Security Group (`openstack_networking_secgroup_v2`)
Virtual firewall with rules defining who can enter and what ports they can use.
```hcl
# Default: deny all
# You must explicitly allow traffic

resource "openstack_networking_secgroup_rule_v2" "ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.main.id
}
```

---

### Complete Network Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET 🌍                                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   FLOATING IP 📱        │
                    │   "Public Phone Number" │
                    │   (203.0.113.50)        │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      ROUTER 🚪          │
                    │   "Building Lobby"      │
                    │   + External Gateway    │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼─────────┐       │       ┌──────────▼─────────┐
    │ ROUTER INTERFACE 🛗│       │       │ ROUTER INTERFACE 🛗 │
    │ "Elevator Door"   │       │       │ "Elevator Door"    │
    └─────────┬─────────┘       │       └──────────┬─────────┘
              │                 │                  │
    ┌─────────▼─────────┐       │       ┌──────────▼─────────┐
    │ PUBLIC SUBNET 🏪   │       │       │ PRIVATE SUBNET 🏠   │
    │ 10.0.1.0/24       │       │       │ 10.0.2.0/24        │
    │ "Web Servers"     │       │       │ "Databases"        │
    └─────────┬─────────┘       │       └──────────┬─────────┘
              │                 │                  │
              └─────────────────┼──────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │     NETWORK 🏢        │
                    │  "The Building"       │
                    └───────────────────────┘
```

---

### Terraform Resource Mapping

| Component | Terraform Resource |
|-----------|-------------------|
| Network | `openstack_networking_network_v2` |
| Subnet | `openstack_networking_subnet_v2` |
| Router | `openstack_networking_router_v2` |
| Router Interface | `openstack_networking_router_interface_v2` |
| Security Group | `openstack_networking_secgroup_v2` |
| Security Group Rule | `openstack_networking_secgroup_rule_v2` |
| Floating IP | `openstack_networking_floatingip_v2` |
| Port | `openstack_networking_port_v2` |

---

### Building The Network Module

**modules/network/variables.tf**
```hcl
variable "name_prefix" {
  type        = string
  description = "Prefix for all resource names"
}

variable "cidr" {
  type        = string
  description = "CIDR block for the subnet"
  default     = "10.0.1.0/24"
}

variable "dns_servers" {
  type        = list(string)
  description = "DNS nameservers for the subnet"
  default     = ["8.8.8.8", "8.8.4.4"]
}

variable "external_network" {
  type        = string
  description = "Name of the external network for router gateway"
  default     = "public"
}
```

**modules/network/main.tf**
```hcl
# Get external network for router gateway
data "openstack_networking_network_v2" "external" {
  name = var.external_network
}

# Create the network
resource "openstack_networking_network_v2" "main" {
  name           = "${var.name_prefix}-network"
  admin_state_up = true
}

# Create the subnet
resource "openstack_networking_subnet_v2" "main" {
  name            = "${var.name_prefix}-subnet"
  network_id      = openstack_networking_network_v2.main.id
  cidr            = var.cidr
  dns_nameservers = var.dns_servers
  ip_version      = 4
}

# Create the router
resource "openstack_networking_router_v2" "main" {
  name                = "${var.name_prefix}-router"
  admin_state_up      = true
  external_network_id = data.openstack_networking_network_v2.external.id
}

# Attach subnet to router
resource "openstack_networking_router_interface_v2" "main" {
  router_id = openstack_networking_router_v2.main.id
  subnet_id = openstack_networking_subnet_v2.main.id
}

# Create security group
resource "openstack_networking_secgroup_v2" "main" {
  name        = "${var.name_prefix}-secgroup"
  description = "Security group for ${var.name_prefix}"
}

# Allow SSH
resource "openstack_networking_secgroup_rule_v2" "ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.main.id
}

# Allow ICMP (ping)
resource "openstack_networking_secgroup_rule_v2" "icmp" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "icmp"
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.main.id
}
```

**modules/network/outputs.tf**
```hcl
output "network_id" {
  description = "ID of the created network"
  value       = openstack_networking_network_v2.main.id
}

output "subnet_id" {
  description = "ID of the created subnet"
  value       = openstack_networking_subnet_v2.main.id
}

output "router_id" {
  description = "ID of the created router"
  value       = openstack_networking_router_v2.main.id
}

output "security_group_id" {
  description = "ID of the security group"
  value       = openstack_networking_secgroup_v2.main.id
}

output "security_group_name" {
  description = "Name of the security group"
  value       = openstack_networking_secgroup_v2.main.name
}
```

---

### CLI Verification Commands

Before and after applying, verify with OpenStack CLI:
```sh
# List external networks (for router gateway)
openstack network list --external

# Check your networks
openstack network list

# Inspect subnet details
openstack subnet show <subnet-id>

# View router ports
openstack port list --router <router-name>

# List security groups
openstack security group list
openstack security group rule list <secgroup-name>
```

---

### End-Of-Day Checklist

- [ ] Understand the network hierarchy: Network → Subnet → Router → Ports
- [ ] Know which addresses are reserved in every subnet (the IP tax)
- [ ] Grasp the difference between private and public subnets
- [ ] Build a reusable network module with Terraform
- [ ] Verify resources exist using OpenStack CLI
- [ ] Connect security groups with explicit allow rules

You now have a complete mental model of OpenStack networking. Use this foundation to build multi-tier architectures with web servers in public subnets and databases hidden in private subnets.
