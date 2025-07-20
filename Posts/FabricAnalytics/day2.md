## Spark to table
### Basic SQL functions
* Date: ```to_date, to_timestamp```
### Joins
1. inner joins: keep rows with keys in left and right
2. Outer joins: keep rows with keys in either left or right
3. Left outer joins: keep rows with keys in left dataset
4. right outer joins: keep rows with kyes in right dataset


```#df.join(df2, df.column==df2.column, how={'inner'})```

## RDD (Resilient Distributed Datasets)
* Still avaiable in spark v2. all the df get converted into rdd.
* records are just java, scala and python objects in RDD
* RDD APIs. Running Python RDD is bad. Use RDD in java and scala
---

* physical distribution and parition control of data.
* maintain lagecy code base in RDDs.
* define everything as a function.
* transformation, actions and lazy writer are same.
---
