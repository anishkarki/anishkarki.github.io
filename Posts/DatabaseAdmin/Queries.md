# Queries [SQL Server]
```SQL
-- CROSS APPLY: Correlated Join
SELECT e.EmpID, e.EmpName, STRING_AGG(p.ProjectName, ', ') AS Projects
FROM Employees e
CROSS APPLY dbo.GetProjectsByEmp(e.EmpID) p
GROUP BY e.EmpID, e.EmpName;

-- OUTER APPLY: Correlated outer join
SELECT e.EmpID, e.EmpName, STRING_AGG(p.ProjectName, ', ') AS Projects
FROM Employees e
OUTER APPLY dbo.GetProjectsByEmp(e.EmpID * 0) p
GROUP BY e.EmpID, e.EmpName;

-- CROSS APPLY: Uncorrelated -> Cartesian behavior
SELECT e.EmpID, e.EmpName, v.number
FROM Employees e
CROSS APPLY (
    SELECT number FROM master.dbo.spt_values WHERE type = 'P' AND number BETWEEN 1 AND 2
) v;
```

