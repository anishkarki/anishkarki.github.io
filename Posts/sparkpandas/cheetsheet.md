# Pandas vs. PySpark Cheatsheet

This cheatsheet provides a detailed comparison of common everyday operations in Pandas and PySpark DataFrame APIs, along with optimization tips and common errors for both.

---

## Common Everyday Operations

| Operation/Task              | Pandas                                                                   | PySpark                                                                   | Notes & Tips                                                                     |
| :-------------------------- | :----------------------------------------------------------------------- | :------------------------------------------------------------------------ | :------------------------------------------------------------------------------- |
| **Load Data** | `pd.read_csv("file.csv")`                                                | `spark.read.csv("file.csv", header=True, inferSchema=True)`             | PySpark requires `SparkSession` (spark) to be initialized first                  |
|                             | `pd.read_parquet("file.parquet")`                                        | `spark.read.parquet("file.parquet")`                                    | Parquet is preferred in big data / datalake contexts                             |
|                             | `pd.read_json("file.json")`                                              | `spark.read.json("file.json")`                                          |                                                                                  |
| **Save Data** | `df.to_csv("output.csv", index=False)`                                   | `df.write.csv("path", header=True, mode="overwrite")`                   | PySpark writes folder of part files by default                                   |
|                             | `df.to_parquet("output.parquet")`                                        | `df.write.parquet("path", mode="overwrite")`                            |                                                                                  |
| **View Data** | `df.head()`                                                              | `df.show(n=5)`                                                            | `show()` prints nicely in Spark                                                  |
|                             | `df.info()`                                                              | `df.printSchema()`                                                        |                                                                                  |
| **Select Columns** | `df['col']` or `df[['col1', 'col2']]`                                    | `df.select('col')` or `df.select('col1', 'col2')`                         |                                                                                  |
| **Filter Rows** | `df[df['col'] > 100]`                                                    | `df.filter(df.col > 100)` or `df.where(df.col > 100)`                     |                                                                                  |
| **Add New Column** | `df['new_col'] = df['col1'] + 10`                                        | `df = df.withColumn('new_col', df.col1 + 10)`                             | PySpark requires reassignment because DataFrames are immutable                   |
| **Rename Columns** | `df.rename(columns={'old': 'new'}, inplace=True)`                      | `df = df.withColumnRenamed('old', 'new')`                               |                                                                                  |
| **Drop Columns** | `df.drop(columns=['col1', 'col2'], inplace=True)`                      | `df = df.drop('col1', 'col2')`                                          |                                                                                  |
| **Window Functions** | Use `pandas.DataFrame.rolling()`, `expanding()` or `groupby().apply()` | Use `Window` from `pyspark.sql.window` with `over()`                    | PySpark Window supports partitioning, ordering, framing explicitly               |
|                             | Example: `df['rolling_avg'] = df['col'].rolling(3).mean()`             | Example: <br>`from pyspark.sql import Window, functions as F`<br>`w = Window.partitionBy('grp').orderBy('time')`<br>`df = df.withColumn('rolling_avg', F.avg('col').over(w))` | Pandas window functions are simpler but less scalable                          |
| **Aggregations** | `df['col'].sum()`, `df.agg({'col1': 'sum', 'col2': 'mean'})`            | `df.groupBy().agg(F.sum('col').alias('sum_col'))`                       | PySpark aggregation functions are in `pyspark.sql.functions` module            |
| **GroupBy** | `df.groupby('col').agg({'col2': 'mean'})`                                | `df.groupBy('col').agg(F.mean('col2').alias('mean_col2'))`              |                                                                                  |
| **Order By (Sort)** | `df.sort_values(by='col', ascending=False)`                            | `df.orderBy(df.col.desc())` or `df.sort('col', ascending=False)`         |                                                                                  |
| **Distinct / Drop Duplicates** | `df.drop_duplicates()`                                                   | `df.dropDuplicates()`                                                   |                                                                                  |
| **Join / Merge** | `pd.merge(df1, df2, on='key', how='inner')`                              | `df1.join(df2, on='key', how='inner')`                                  |                                                                                  |
| **Handle Nulls** | `df.dropna()`, `df.fillna(0)`, `df['col'].isnull()`                     | `df.na.drop()`, `df.na.fill(0)`, `df.filter(df.col.isNull())`            |                                                                                  |
| **Cast Column Types** | `df['col'] = df['col'].astype('int')`                                    | `df = df.withColumn('col', df['col'].cast('int'))`                      |                                                                                  |
| **Convert to Pandas / PySpark** | `df_pandas = df.toPandas() (from PySpark)`                               | `spark.createDataFrame(df_pandas) (from Pandas)`                        | Use carefully with large datasets to avoid OOM                                   |
| **Handling Data in Datalake** | Use Pandas to read/write local files or mounted datalake paths         | Use Spark to read/write directly from distributed datalake (S3, ADLS Gen2, GCS) via `spark.read` and `df.write` | Supports many file formats: CSV, Parquet, JSON, ORC, Avro                        |
| **Partitioning (for big data)** | Not applicable                                                           | Use `df.write.partitionBy('col')` for partitioned parquet output          | Improves query performance on big datasets                                       |
| **Caching / Persisting Data** | Not typical (in-memory operation)                                        | `df.cache()` or `df.persist()`                                            | Useful for iterative Spark queries to speed up                                   |
| **Repartition / Coalesce** | Not applicable                                                           | `df.repartition(n)` or `df.coalesce(n)`                                  | Controls the number of output partitions for performance and downstream processing |
| **Sampling** | `df.sample(frac=0.1, random_state=42)`                                   | `df.sample(fraction=0.1, seed=42)`                                      |                                                                                  |
| **Collect Data to Driver** | N/A (Pandas is always local)                                             | `df.collect()` or `df.take(n)`                                            | Collects data to driver program; be careful with large datasets                  |
| **Explode Array Column** | `df.explode('col')` (Pandas 1.3+)                                        | `df.select(F.explode('col'))`                                           | Useful for nested arrays                                                         |
| **String Functions** | `df['col'].str.lower()`, `.contains()`, `.replace()`                   | `F.lower(df.col)`, `df.filter(df.col.contains('val'))`, `F.regexp_replace(df.col, 'old', 'new')` | PySpark string functions in `pyspark.sql.functions`                           |
| **Date Functions** | `pd.to_datetime()`, `dt.year`, `dt.month`, `dt.weekday`                | `F.to_date()`, `F.year()`, `F.month()`, `F.dayofweek()`                 |                                                                                  |

---

## Examples for Some Key Operations:

### Load CSV:

**Pandas**
```python
# Pandas
import pandas as pd
df = pd.read_csv('path/to/file.csv')
```
## 🧩 Merge DataFrames: Pandas vs. PySpark

| Operation/Task           | Pandas                                                                 | PySpark                                                                 | Notes & Tips                                                                 |
|--------------------------|------------------------------------------------------------------------|-------------------------------------------------------------------------|------------------------------------------------------------------------------|
| **Merge on Column(s)**   | `pd.merge(df1, df2, on='key')`                                         | `df1.join(df2, on='key', how='inner')`                                  | Same as SQL join; default `how='inner'`                                      |
| **Merge on Multiple Columns** | `pd.merge(df1, df2, on=['key1', 'key2'])`                            | `df1.join(df2, on=['key1', 'key2'], how='inner')`                        | Use a list of keys                                                           |
| **Merge on Index**       | `pd.merge(df1, df2, left_index=True, right_index=True)`                | `df1.join(df2, df1.index == df2.index)` *(not typical)*<br>Use `.withColumn("id", ...)` instead | PySpark doesn't support index-based merge natively                          |
| **Join Types**           | `how='inner'`, `'left'`, `'right'`, `'outer'`                          | `how='inner'`, `'left'`, `'right'`, `'outer'`                            | Same semantics                                                              |
| **Concatenate Rows**     | `pd.concat([df1, df2])`                                                | `df1.unionByName(df2)` or `df1.union(df2)`                               | PySpark requires same schema                                                |
| **Concatenate Columns**  | `pd.concat([df1, df2], axis=1)`                                        | `df1.join(df2)` *(if no conflicting column names)*                      | Pandas `axis=1` = columns; PySpark must handle duplicate columns carefully  |
| **Merge with Suffixes**  | `pd.merge(df1, df2, on='key', suffixes=('_left', '_right'))`           | Rename columns before join using `withColumnRenamed()`                  | PySpark doesn’t support suffixes directly                                   |
| **Join on Expressions**  | *Not applicable*                                                       | `df1.join(df2, df1.col1 == df2.col2, 'inner')`                           | Use for non-equal column names                                              |


## Plotly Syntax
|figure|syntax|
|---|---|
