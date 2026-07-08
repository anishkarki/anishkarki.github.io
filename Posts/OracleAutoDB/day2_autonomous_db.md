# Oracle Autonomous Database — Auto Scaling Quick Reference  
*Presented by Kamryn Vinson, Oracle University*

---

## Auto Scaling Overview

- **Scale compute (ECPUs) and storage independently** → no need to scale both together.
- **Auto Scaling** = Database **automatically scales compute up to 3x your base ECPU count** when workload demands it.
- ❗ **Not available for Always Free tier** databases.
- ✅ **Enabled by default** for paid/standard tier databases.
- 🔄 **Zero downtime** — changes applied dynamically while database remains online and operational.

---

## Key Capabilities

| Feature                  | Details |
|--------------------------|---------|
| **Manual Scaling**       | Adjust ECPUs or storage anytime via console or API — no downtime. |
| **Auto Scaling Limit**   | Max = **3x base ECPU count** (e.g., base=6 → auto-scale up to 18). |
| **Storage Scaling**      | Scale storage up or down independently — no impact on compute. |
| **Live Operations**      | Database stays **fully available** during scaling — users & apps uninterrupted. |
| **Lifecycle State**      | Console/API shows “Scaling in Progress” → then “Available” when complete. |

---

## Demo Walkthrough: Scaling ATP Demo Database

1. **Navigate to Database Console** → Select target database (e.g., `ATP Demo`).
2. **View Current Settings**:
   - Base ECPU: `2`
   - Storage: `1 TB`
   - Auto Scaling: `Enabled`
3. **Click “Manage Resource Allocation”** → Popup opens.
4. **Adjust Settings**:
   - Increase ECPU from `2` → `6` (manual scale).
   - Storage unchanged (optional).
   - Auto Scaling remains ON → system can now scale up to `18 ECPUs` if needed.
5. **Click “Apply”** → Scaling begins immediately.
6. **Monitor Status**:
   - Tile shows: **“Scaling in Progress”**
   - Lifecycle State: **“SCALING”**
   - ECPU still shows old value until scaling completes.
7. **Completion**:
   - Tile updates to: **“Available”**
   - Lifecycle State: **“AVAILABLE”**
   - ECPU count now reflects new value: `6`
> ✅ Users can connect and run queries **throughout the entire process** — no disruption.

---

## Pro Tips

- **Plan Base Capacity Wisely**: Auto Scaling gives you burst capacity — set base ECPU to handle typical load, let auto-scale handle peaks.
- **Monitor Usage**: Use OCI Monitoring or ADB Performance Hub to track when auto-scaling triggers.
- **Cost Awareness**: You’re billed for **actual ECPU usage**, including auto-scaled resources — optimize to avoid surprise costs.
- **Storage ≠ Auto-Scaled**: Only compute auto-scales — storage must be scaled manually if needed.
---

## ✅ Key Takeaways

- Auto Scaling = **elastic compute** for unpredictable or spiky workloads.
- Manual scaling = **full control** over resources anytime, no downtime.
- Always Free tier = ❌ No auto scaling.
- Enterprise advantage = **performance + availability + cost-efficiency** in one.
