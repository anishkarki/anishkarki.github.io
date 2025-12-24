## Day 1: Network Fundamentals & The Island Bridges

### Must Remember
- Modules are isolated islands; `output.tf` pulls data back to root, `variables.tf` pushes data down to children.
- CIDR math always reserves four addresses (network, gateway, DHCP, broadcast) before you get usable VM slots.
- Routers handle both outbound NAT and inbound floating IP forwarding; no router, no internet.
- NAT (Network Address Translation) hides private IPs behind the router's public address.

### Can View Docs (Because Values Change)
- Exact OpenStack subnet IDs and router IDs: check `openstack subnet show` when you run the lab.
- DNS servers, allocation pools, and project IDs come from your cloud tenant configuration.

---

### Build The Island Bridges

In a modular Terraform setup, modules are like **separate islands** that cannot see each other directly.

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ROOT (Mainland)                            │
│                                                                      │
│   ┌─────────────────┐                      ┌─────────────────┐      │
│   │  ISLAND A       │                      │   ISLAND B      │      │
│   │  (Network)      │                      │   (Compute)     │      │
│   │                 │                      │                 │      │
│   │  output.tf ─────┼─────► variables.tf ──┼──►             │      │
│   │  (the boat)     │      (the boat)      │                 │      │
│   └─────────────────┘                      └─────────────────┘      │
│                                                                      │
│   output.tf ferries data FROM the module back to ROOT               │
│   variables.tf carries data FROM root INTO the module               │
└─────────────────────────────────────────────────────────────────────┘
```

- **output.tf** is like the boat that carries data from ISLAND A (Network) back to the MAINLAND (ROOT)
- **variables.tf** is the boat that carries data from mainland to ISLAND B (Compute)

---

### CIDRs Without The Math Panic

Think of the IP range as a pizza. The `/28` or `/29` is how many slices we cut.

**Technical Secret:** An IP address has 32 bits (like 32 light switches).
- If you say `/28`, you are locking 28 switches in the "On" position.
- You only have 4 switches left to play with.
- Math: 2^4 = 16 addresses total.

#### Reserved Addresses (The IP Tax)

Every subnet loses these addresses before VMs get any:

| Address | Purpose | Analogy |
|---------|---------|---------|
| `.0` (first) | Network address | Street sign for the lane ("This is 10.10.10 lane") |
| `.1` | Gateway | The exit door/security gate to the internet |
| `.2` (variable) | DHCP server | Robot handing out IPs ("Welcome! You are 10.10.10.5") |
| `.255` (last) | Broadcast | Megaphone shouting "Does anyone have a printer?" |

**Example:** A `/28` gives 16 total slices, but 4 disappear, leaving **12 usable** for VMs.

```
Common CIDRs:
  /24 = 256 IPs   (Small office)     → "One street"
  /16 = 65,536 IPs (Large company)   → "Entire city"
  /8  = 16 million IPs (Enterprise)  → "Entire country"
```

---

### Inspect The Network Hands-On

Source your `openrc` file and run these commands:

```sh
openstack network list
# Shows the outside of the house

# To show the inside of the house/furnitures
openstack subnet show <id>
```

Sample output from my lab:
```text
+--------------------------------------+------------------+----------------------------------------------------------------------------+
| ID                                   | Name             | Subnets                                                                    |
+--------------------------------------+------------------+----------------------------------------------------------------------------+
| 10065711-784e-4e13-82db-293158abf8d6 | patroni-prod-net | 5a823a4a-4bce-4033-812d-d3d3799c6bb3                                       |
| 328c0483-7f5b-42a6-ae5d-8bcd7b5d837f | private          | 07f66ca0-5375-4240-9dc5-6e5bb2dceeb2, 878c3526-dac7-4177-869a-3440734ff59b |
| c33742e1-9354-42fc-adbc-7a70bc2df959 | shared           | 8450ef6d-afb1-4d8f-b93a-8486227eba1d                                       |
| c50a1324-3247-4529-aa0d-545257458c35 | public           | 31f53fd5-4c10-49c3-ba3c-8ed39142c463, 350787f4-a794-4715-b649-c81ae184a750 |
+--------------------------------------+------------------+----------------------------------------------------------------------------+
```

Drill into one subnet:
```sh
openstack subnet show 5a823a4a-4bce-4033-812d-d3d3799c6bb3
```
```text
+----------------------+--------------------------------------+
| Field                | Value                                |
+----------------------+--------------------------------------+
| allocation_pools     | 10.10.10.2-10.10.10.254              |
| cidr                 | 10.10.10.0/24                        |
| dns_nameservers      | 8.8.8.8, 8.8.4.4                     |
| gateway_ip           | 10.10.10.1                           |
| name                 | patroni-prod-subnet                  |
| enable_dhcp          | True                                 |
+----------------------+--------------------------------------+
```

#### The Core of OpenStack Networking: THE ROUTER

Look at the devices (virtual network cables plugged into your switch):
1. Router
2. DHCP agents
3. VMs

---

### How VMs Connect to the Internet

Router handles **two different functions**:

#### 1. Outbound Internet Access (GOING OUT) - NAT

```
┌──────────────────────────────────────────────────────────────────┐
│  NAT - The Post Office Works                                      │
│                                                                   │
│  VM (10.0.1.5)          Router              Internet             │
│      │                    │                    │                  │
│      │ "Hi Google!"       │                    │                  │
│      │ From: 10.0.1.5     │                    │                  │
│      │───────────────────►│                    │                  │
│      │                    │ Changes address    │                  │
│      │                    │ From: 172.24.4.251 │                  │
│      │                    │ (Router's public)  │                  │
│      │                    │───────────────────►│                  │
│      │                    │                    │                  │
│      │                    │◄───────────────────│ "Hi Router!"    │
│      │                    │ To: 172.24.4.251   │                  │
│      │                    │ Router remembers   │                  │
│      │◄───────────────────│ original sender    │                  │
│      │ "Hi VM!"           │                    │                  │
│      │ To: 10.0.1.5       │                    │                  │
└──────────────────────────────────────────────────────────────────┘
```

#### 2. Inbound Internet Access (SSH) - Floating IP

VM's private IP is hidden by NAT. You need a **public address** - this is what a **Floating IP** is for.

A Floating IP is a public IP address allocated from the `public` network that you manually attach to a private VM:
1. Ask OpenStack for a floating IP from the shared pool
2. Attach it: "Hey router, whenever you see traffic for `123.45.67.200`, send it to VM at `10.10.10.5`"
3. Router becomes a tunnel

```sh
# 1. Allocate a Floating IP from the 'public' network pool
openstack floating ip create public

# 2. Attach the Floating IP to your server
openstack server add floating ip patroni-01 <your-new-floating-ip>
```

#### Traffic Path Summary

| Link | Address Type | IP Address |
|------|--------------|------------|
| VM Private IP (Internal) | Private IPv4 | 10.10.10.x |
| Router Internal Port (Gateway) | Private IPv4 | 10.10.10.1 |
| Router External Port (Public) | Public IPv4 | 172.24.4.251 |

---

### Understanding Network Types

| Network Name | Your Use | Subnet Count | Interpretation |
|--------------|----------|--------------|----------------|
| patroni-prod-net | Your custom cluster network | 1 | Single IPv4 range (/24) |
| public | Internet connection for router | 2 | Supports IPv4 and IPv6 |
| private | Default tenant network | 2 | Supports IPv4 and IPv6 |
| shared | Utility network | 1 | Single IPv4 range |

**Two subnets** means the network supports both **IPv4 and IPv6**.

---

### Floating IP Drill

Check the router ports to see which interface owns the external address:
```sh
openstack port list --router patroni-prod-router --device-owner network:router_gateway
```
```text
+--------------------------------------+------+-------------------+-----------------------------------------------------------------------------+--------+
| ID                                   | Name | MAC Address       | Fixed IP Addresses                                                          | Status |
+--------------------------------------+------+-------------------+-----------------------------------------------------------------------------+--------+
| 47a13d78-d494-46de-b8ec-11bd7f160652 |      | fa:16:3e:43:cf:75 | ip_address='172.24.4.251', subnet_id='31f53fd5-4c10-49c3-ba3c-8ed39142c463' | ACTIVE |
+--------------------------------------+------+-------------------+-----------------------------------------------------------------------------+--------+
```

The **MAC Address** is the physical layer address of the router's external interface.

---

### End-Of-Day Checklist

- [ ] Update `variables.tf` and `output.tf` with actual IDs you collected
- [ ] Note how many IPs your CIDR really gives after reservations
- [ ] Confirm you can allocate and attach a floating IP
- [ ] Understand how NAT works for outbound traffic
- [ ] Know why floating IPs are needed for inbound access

Tomorrow we start dropping actual compute instances onto this city!
