## Day 7: OpenStack Networking Troubleshooting

### Must Remember
- DevStack/All-in-One deployments often need manual bridge configuration after reboots.
- The `br-ex` bridge connects OpenStack virtual networks to the physical host.
- Floating IPs only work when the full path from host to Neutron router is complete.

### Can View Docs (Because Values Change)
- Bridge names and IP ranges depend on your DevStack/Packstack configuration.
- OVS (Open vSwitch) commands may vary between versions.

---

### Understanding the Architecture

When you can't ping your floating IP, understand where the problem might be:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         YOUR PHYSICAL MACHINE                               │
│                        (OpenStack All-in-One)                               │
│                                                                             │
│   ┌─────────────────┐          ┌─────────────────────────────────────────┐ │
│   │  YOUR TERMINAL  │          │           OPENSTACK                      │ │
│   │   (ping from    │          │                                          │ │
│   │    here)        │          │  ┌─────────────────────────────────┐    │ │
│   │                 │          │  │     NEUTRON (Networking)        │    │ │
│   │ Needs route to  │          │  │                                 │    │ │
│   │ 172.24.4.0/24   │          │  │  ┌─────────────────────────┐   │    │ │
│   │       │         │          │  │  │   Virtual Router        │   │    │ │
│   │       │         │          │  │  │   (qrouter namespace)   │   │    │ │
│   │       ▼         │          │  │  │         │               │   │    │ │
│   └───────┼─────────┘          │  │  │    NAT/Routing          │   │    │ │
│           │                    │  │  │         │               │   │    │ │
│           │                    │  │  │    ┌────▼────┐          │   │    │ │
│           │                    │  │  │    │ Float IP│          │   │    │ │
│           │                    │  │  │    │172.24.4.│          │   │    │ │
│           │                    │  │  │    │  189    │          │   │    │ │
│   ┌───────▼─────────┐          │  │  └────┴────┬────┴──────────┘   │    │ │
│   │                 │          │  │            │                   │    │ │
│   │     br-ex       │◄─────────┼──┼────────────┘                   │    │ │
│   │  (OVS Bridge)   │          │  │   Connected via OVS            │    │ │
│   │                 │          │  │                                 │    │ │
│   │  ❌ WAS DOWN!   │          │  └─────────────────────────────────┘    │ │
│   │  ❌ NO IP!      │          │                                          │ │
│   └─────────────────┘          └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Diagnostic Steps

#### Step 1: Check Routes
```sh
# Check if route exists to floating IP range
ip route | grep -E "172.24|default"
```

If no route to `172.24.4.0/24`, packets can't reach the floating IPs.

#### Step 2: Check the br-ex Bridge
```sh
# Check if br-ex bridge exists
ip addr show | grep -E "br-ex|172.24"

# Detailed bridge info
sudo ip addr show br-ex
```

**Common Problems:**
- Bridge exists but is **DOWN**
- Bridge has **no IP assigned**

#### Step 3: Fix the Bridge
```sh
# Bring up the bridge
sudo ip link set br-ex up

# Assign IP address (gateway for floating IP range)
sudo ip addr add 172.24.4.1/24 dev br-ex
```

---

### Why Does This Happen?

**Possible reasons:**

1. **DevStack/Packstack restart** - Development deployments don't always persist network config
2. **System reboot** - Network config wasn't made permanent
3. **OVS (Open vSwitch) issue** - Bridge exists in OVS but wasn't activated in Linux
4. **Manual configuration missing** - All-in-one setups need manual br-ex config

---

### The Complete Traffic Path

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Your Terminal│    │    br-ex     │    │   Neutron    │    │     VM       │
│              │    │   Bridge     │    │   Router     │    │              │
│  ping        │───►│ 172.24.4.1   │───►│  NAT/Route   │───►│ 10.0.1.10    │
│ 172.24.4.189 │    │              │    │              │    │              │
│              │◄───│              │◄───│   (DNAT)     │◄───│  replies     │
│  reply!      │    │              │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
      │                    │                   │                   │
      │                    │                   │                   │
   Layer 3             Layer 2/3          Layer 3              Layer 3
   (IP routing)     (Bridge + IP)      (NAT + Routing)     (Private IP)
```

---

### Verification Commands

After fixing, verify everything works:

```sh
# Verify br-ex is up with IP
ip addr show br-ex

# Expected output:
# br-ex: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
#     inet 172.24.4.1/24 scope global br-ex

# Verify route exists
ip route | grep 172.24.4

# Test ping to floating IP
ping 172.24.4.189

# If ping works, try SSH
ssh -i ~/.ssh/id_rsa ubuntu@172.24.4.189
```

---

### Making Configuration Persistent

To survive reboots, add to `/etc/network/interfaces` or create a systemd service:

**Option 1: Network interfaces file**
```sh
# /etc/network/interfaces.d/br-ex
auto br-ex
iface br-ex inet static
    address 172.24.4.1
    netmask 255.255.255.0
```

**Option 2: Post-boot script**
```sh
#!/bin/bash
# /usr/local/bin/fix-br-ex.sh
ip link set br-ex up
ip addr add 172.24.4.1/24 dev br-ex 2>/dev/null || true
```

---

### Common Troubleshooting Checklist

| Symptom | Check | Fix |
|---------|-------|-----|
| Can't ping floating IP | `ip route` | Add route to 172.24.4.0/24 |
| Route exists, still no ping | `ip addr show br-ex` | Bring up br-ex, add IP |
| br-ex up, still no ping | `openstack port list` | Verify floating IP is attached |
| Floating IP attached, no ping | Security groups | Add ICMP ingress rule |
| Ping works, SSH fails | Security groups | Add TCP/22 ingress rule |

---

### Neutron Debug Commands

```sh
# Check router namespaces
sudo ip netns list

# Enter router namespace
sudo ip netns exec qrouter-<router-id> ip addr

# Check iptables NAT rules in router
sudo ip netns exec qrouter-<router-id> iptables -t nat -L -n

# Check OVS bridges
sudo ovs-vsctl show

# Check OVS ports on br-ex
sudo ovs-vsctl list-ports br-ex
```

---

### End-Of-Day Checklist

- [ ] Understand the traffic path: Terminal → br-ex → Neutron Router → VM
- [ ] Know how to diagnose bridge issues
- [ ] Can bring up br-ex and assign IP manually
- [ ] Understand why DevStack needs manual config after reboot
- [ ] Know the Neutron debug commands for deeper troubleshooting

You now have the tools to debug any OpenStack networking issue!
