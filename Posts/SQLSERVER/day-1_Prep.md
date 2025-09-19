# Day 1 of preparing for interview with 5+ years of experience
## Technical Portion (SQL concepts)
#### Recursive CTEs
* Its similar to the recursive programming. 
* The query refers to itself until the termination condition is met. 
    * Org chart visualisation (hierarchy)
* Without recursion, It will take a lot of self-joins, which breaks when depth is unknown. 
###### Parts of Query:
1. Anchor member: the base query (like the root of the recursion). It is basically like ```if n<= 1 return fixed value```. SQL that generates the first row. 
2. Recursive memebr: The query that references the CTE and keeps running until a condition is met. 
3. Combination: ```UNION ALL```: Stitches them together. 
4. Terminiation conditions:

|WHY|UNION ALL | UNION|
|---|---|---|
|Performance|simply appends all the rows | union removes duplicate rows|


```AdventureWorks2022```

```SQL

```

