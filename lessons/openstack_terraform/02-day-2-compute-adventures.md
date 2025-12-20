data "openstack_compute_flavor_v2" "small" {
## Day 2: Spin Up The Robots

### Must Remember
- `cluster_config.yaml` holds node counts, SSH keys, and any per-instance metadata you pass into modules.
- `data.tf` and `security.tf` glue external info (images, flavors, keypairs, security rules) into the resource definitions.
- Terraform workflow is always `init` → `plan` → `apply`; skipping plan is how surprises happen.

### Can View Docs (Because Names Vary)
- Flavor and image names differ per OpenStack cloud; confirm with `openstack flavor list` and `openstack image list` before wiring them into `data.tf`.
- Security group inbound rules may need project-specific ports—double-check with your platform team.

### Inventory The Building Blocks
Create or update these files in the root so the compute story is reproducible:
- `cluster_config.yaml`
- `data.tf`
- `security.tf`
- `main.tf`

Your `data.tf` should fetch real flavor and image IDs from OpenStack instead of hard-coding UUIDs.
```hcl
data "openstack_compute_flavor_v2" "small" {
  name = "m1.small"
}

data "openstack_images_image_v2" "ubuntu" {
  name = "ubuntu-22.04"
}
```
Validate that the names exist by querying OpenStack directly:
```sh
openstack image list
openstack flavor list
```

### Security Group In Practice
Build the security perimeter in `security.tf`. Keep the rules tight.
```hcl
resource "openstack_compute_secgroup_v2" "cluster" {
  name        = "cluster-secgroup"
  description = "Allow SSH from my laptop and intra-cluster traffic"

  rule {
    from_port   = 22
    to_port     = 22
    ip_protocol = "tcp"
    cidr        = var.operator_ip_cidr
  }

  rule {
    from_port   = 1
    to_port     = 65535
    ip_protocol = "tcp"
    self        = true
  }
}
```
Replace `var.operator_ip_cidr` with your actual home or campus IP. Test the rule immediately:
```sh
openstack security group show cluster-secgroup
```

### Run The Terraform Loop
Stay in the project directory and work through the init-plan-apply rhythm.
```sh
terraform init
terraform plan -out=day2.plan
terraform apply day2.plan
```
Sample plan output (trimmed) so you know what to expect:
```text
  # openstack_compute_instance_v2.worker[0] will be created
  + resource "openstack_compute_instance_v2" "worker" {
      + flavor_name = "m1.small"
      + image_name  = "ubuntu-22.04"
      + name        = "worker-1"
      + security_groups = [
          + "cluster-secgroup",
        ]
    }
```
If the plan shows creates you did not intend, stop and adjust the YAML or variables.

### Wire The Modules Together
Use `main.tf` to pass data from YAML and data sources into the compute module. Inline example:
```hcl
module "compute" {
  source           = "./modules/compute"
  cluster_config   = yamldecode(file("cluster_config.yaml"))
  image_id         = data.openstack_images_image_v2.ubuntu.id
  flavor_id        = data.openstack_compute_flavor_v2.small.id
  security_group   = openstack_compute_secgroup_v2.cluster.name
  network_id       = module.network.network_id
}
```
After `apply`, confirm instances exist in OpenStack:
```sh
openstack server list
```

### Wrap-Up Reflection
- YAML → `data.tf` → module inputs: verify the data flow is real by printing outputs after apply.
- Security groups should now be visible in OpenStack and attached to each VM.
- You ran the full Terraform cycle with plan files stored as evidence (`day2.plan`).
Tomorrow we switch focus to Terraform's brain: providers, state, and multi-cloud workflows.
