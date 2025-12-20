## Day 1: Meet The Network Playground

### Must Remember
- Modules are isolated islands; `output.tf` pulls data back to root, `variables.tf` pushes data down to children.
- CIDR math always reserves four addresses (network, gateway, DHCP, broadcast) before you get usable VM slots.
- Routers handle both outbound NAT and inbound floating IP forwarding; no router, no internet.

### Can View Docs (Because Values Change)
- Exact OpenStack subnet IDs and router IDs: check `openstack subnet show` when you run the lab.
- DNS servers, allocation pools, and project IDs come from your cloud tenant configuration.

### Build The Island Bridges
Once Terraform is initialized, keep the module communication clear:
- `output.tf` ferries results from a module back so other modules can read them.
- `variables.tf` supplies each module with the input it expects.
Put real values in those files today so tomorrow's compute module can reference the network IDs.

### CIDRs Without The Math Panic
Think of the IP range as a pizza. The `/28` or `/29` is simply how many slices we cut. A `/28` means 16 total slices, but four pieces instantly disappear:
- The very first address is the street sign for the whole lane (network address).
- The next one is the security gate (gateway) that opens the city to the internet.
- One address is reserved for the friendly robot who hands out IPs (DHCP).
- The last one is the giant megaphone that shouts to everyone at once (broadcast).
That leaves us with 12 usable slices for real devices. Smaller slash numbers (like `/24`) mean more elbow room; bigger slash numbers (like `/29`) mean a cramped cul-de-sac perfect for a lab.

### Inspect The Network Hands-On
Source your `openrc` file and actually run the commands. Watch the output scroll; it makes the topology real.
```sh
openstack network list
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

Drill into one subnet so you know exactly which IP is the gateway and where the DHCP range lives:
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
| id                   | 5a823a4a-4bce-4033-812d-d3d3799c6bb3 |
| name                 | patroni-prod-subnet                  |
| router:external      | False                                |
+----------------------+--------------------------------------+
```
Write the subnet ID and gateway IP into your notebook; we use them in `variables.tf`.

### Floating IP Drill
Practice the full loop of allocating and attaching a floating IP so you already know the CLI flow when a VM needs public access.
```sh
# Allocate a floating IP from the public pool
openstack floating ip create public

# Attach it to a server
openstack server add floating ip patroni-01 172.24.4.251
```
Follow up by checking the router ports so you see which interface now owns the external address:
```sh
openstack port list --router patroni-prod-router --device-owner network:router_gateway
```
```text
+--------------------------------------+------+-------------------+-----------------------------------------------------------------------------+--------+
| ID                                   | Name | MAC Address       | Fixed IP Addresses                                                          | Status |
+--------------------------------------+------+-------------------+-----------------------------------------------------------------------------+--------+
| 47a13d78-d494-46de-b8ec-11bd7f160652 |      | fa:16:3e:43:cf:75 | ip_address='172.24.4.251', subnet_id='31f53fd5-4c10-49c3-ba3c-8ed39142c463' | ACTIVE |
|                                      |      |                   | ip_address='2001:db8::bf', subnet_id='350787f4-a794-4715-b649-c81ae184a750' |        |
+--------------------------------------+------+-------------------+-----------------------------------------------------------------------------+--------+
```

### End-Of-Day Checklist
- Update `variables.tf` and `output.tf` with the actual IDs you collected.
- Note how many IPs your CIDR really gives you after reservations.
- Confirm you can allocate and attach a floating IP without guessing.
Tomorrow we start dropping actual compute instances onto this city, now that the streets and routers are real in your head.
