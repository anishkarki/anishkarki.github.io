# merging in febric using KQL
* Join operator
* Union operator
## Basic QUery
```kql
TableName
```
2. Filtering
```kql
TableName
| where column == "value"
| where Timestamp > ago(7d)
| where Column contains "text"
```
**Operators**
* ==,!=, <,>, <=,>=
* contains, !contains
* startswith, endwith, has, !has
* in/ !in

3. Projection (select equivalent)
```kql
| project Column1, Column2
| project-rename NewName = OldName
```
4. Sorting
```
| sort by Column asc
| sort by Column desc
```
5. Joining Tables
```
TableA
| join kind=inner ( 
    TableB
    | project id, value
) on id
```
7. Aggregation
```
| summarize count() by bin(Timestamp, 1h)
```

# Loading very large dataset into delta tables step by step
1. Need to find the partition column. Probably the year is best stop.
```py

```
