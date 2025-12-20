## Day 4: Keep The Lights On

### Must Remember
- Read every plan; Terraform tells you exactly what it will create, change, or destroy. You just have to notice.
- Remote, locked state prevents teammates from stomping on each other and keeps secrets out of git.
- Drift (manual edits) is real—either import unmanaged resources or recreate them through Terraform.

### Can View Docs (Because Tooling Differs)
- Backend configuration syntax changes by storage provider (S3, Swift, HCP Terraform). Follow the doc for your chosen backend when enabling locking and encryption.
- Plan output formatting can shift between Terraform versions; upgrade guides explain the differences.

### Plan Like A Detective
Run the validation and plan sequence before touching production.
```sh
terraform fmt
terraform validate
terraform plan -out=day4.plan
```
Scan the plan output for three danger signs:
- `-/+` (destroy then create) on critical resources usually means a recreation—double-check why.
- `~` (update in place) on instances might reboot them; verify with provider docs.
- Unexpected `+` (create) often means a default variable changed or drifted.

### State File Hygiene
Inspect state regularly so you know what Terraform thinks exists.
```sh
terraform state list
terraform show module.compute.openstack_compute_instance_v2.worker[0]
```
Move state to a shared backend as soon as more than one person touches the repo.
```hcl
terraform {
	backend "swift" {
		auth_url   = var.OS_AUTH_URL
		region     = var.OS_REGION_NAME
		container  = "terraform-state"
		tenant_name = var.OS_PROJECT_NAME
	}
}
```
```sh
terraform init -migrate-state
```
Enable locking if the backend supports it, and make sure only trusted people have credentials.

### Handle Changes Safely
When introducing a risky resource, scope the apply with `-target` so you can test in isolation.
```sh
terraform apply -target="openstack_compute_instance_v2.worker[0]"
```
After a successful targeted apply, rerun a full plan to make sure no pending changes remain.

### Clean Up Deliberately
Lab complete? Tear it down the same way you built it—through Terraform.
```sh
terraform destroy -auto-approve
```
Watch the output and cross-check in OpenStack with `openstack server list` to ensure nothing is left running (and billing).

If you created resources manually (for example a floating IP via the Horizon UI), import them so Terraform tracks them:
```sh
terraform import openstack_networking_floatingip_v2.dbg 123.45.67.200
```

### Where To Go Next
- Split networking, compute, and database code into modules with clear outputs and inputs.
- Add CI steps that run `terraform fmt`, `terraform validate`, and `terraform plan` against pull requests.
- Document the command sequences you just practiced so new students can follow the same safe routine.

You now have a mental model for networking, compute provisioning, Terraform workflow, and ongoing care—enough to run a real student lab or step into a junior cloud automation role.
