```SQL
-- CROSS APPLY: Correlated Join
select e.EmpID, e.EmpName, string_agg(p.ProjectName,', ') as Projects
from Employees e
cross apply dbo.GetProjectsByEmp(e.empID) p
group by e.EmpID, e.EmpName;

-- Outer APPLY: Coorelated outer join
select e.EmpID, e.EmpName, string_agg(p.ProjectName,', ') as Projects
from Employees e
outer apply dbo.GetProjectsByEmp(e.empID * 0) p
group by e.EmpID, e.EmpName;

-- CROSS APPLY: Uncorrelated -> Cartesian Behavior
select e.EmpID, e.EmpName, v.number
from Employees e
cross apply (
select number from master.dbo.spt_values where type='P' and number between 1 and 2
) v;
```