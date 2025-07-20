# PySpark and Pandas Optimization Tips & Common Errors

## PySpark Optimization Tips & Common Errors

| Topic                       | Tips & Tricks                                                                                                    | Common Errors & How to Fix                                                      |
| :-------------------------- | :--------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Lazy Evaluation** | Spark transformations (e.g., `select`, `filter`) are lazy; actions (e.g., `show()`, `collect()`) trigger execution. | Forgetting that transformations alone don't run queries; no output until action. |
| **Avoid Collecting Large Data** | Don't use `.collect()` on large datasets; use `.take(n)` or write results to disk instead.                     | OutOfMemoryError when collecting too much data to driver.                         |
| **Broadcast Join** | Use `broadcast(df2)` if one DataFrame is small to speed up joins.                                                | Not broadcasting small tables leads to expensive shuffle join.                  |
| **Partitioning** | Repartition large datasets before joins or shuffle-heavy operations to balance cluster workload.                 | Skewed partitions cause slow jobs or OOM errors.                                |
| **Cache/Persist** | Cache intermediate DataFrames when reused multiple times (`df.cache()` or `df.persist()`).                     | Over-caching causes memory pressure; unpersist after use (`df.unpersist()`).    |
| **Filter Early** | Push filtering operations early to reduce data processed downstream.                                             | Filtering after wide transformations wastes resources.                          |
| **Use Built-in Functions** | Prefer `pyspark.sql.functions` built-ins over UDFs; they're optimized and faster.                                | UDFs are slower and don't support Catalyst optimization.                        |
| **Avoid Python UDFs** | Replace Python UDFs with Spark SQL expressions or Pandas UDFs (`pandas_udf`) for better performance.            | Python UDFs cause serialization overhead and slow execution.                    |
| **Avoid Wide Transformations** | Minimize wide transformations (`groupBy`, `join`, `reduceByKey`), which trigger shuffles.                      | Shuffles are expensive; use partitioning, bucketing, and broadcasting to optimize. |
| **Shuffle Partitions** | Tune `spark.sql.shuffle.partitions` (default 200) for workload size; too many causes overhead, too few causes skew. | Improper shuffle partitions cause slow or failed jobs.                          |
| **Schema Inference** | When reading files, explicitly define schema instead of `inferSchema` to speed up reads.                         | Schema inference on big files is slow.                                          |
| **Avoid Using .count() Frequently** | It triggers a full job; use `.limit()` or `.take()` for sampling.                                        | Excessive `.count()` leads to slowdowns.                                        |
| **Use .select() Before .join()** | Select only necessary columns before join to reduce data shuffle size.                                     | Joining with all columns wastes bandwidth and memory.                           |
| **Handling Nulls** | Use `na.drop()` or `na.fill()` carefully to avoid data loss or incorrect imputation.                           | Improper null handling can cause downstream errors.                             |
| **Spark UI / Logs** | Use Spark UI to monitor stages, tasks, shuffle operations, and debug bottlenecks.                                | Not monitoring leads to missed optimization opportunities.                      |

## Pandas Optimization Tips & Common Errors

| Topic                           | Tips & Tricks                                                                                     | Common Errors & How to Fix                                                    |
| :------------------------------ | :------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------- |
| **Avoid Loops; Use Vectorized Ops** | Use vectorized Pandas/Numpy operations instead of Python loops for speed.                         | Slow code when using for loops over DataFrame rows.                           |
| **Use .loc and .iloc Wisely** | `.loc` for label-based indexing, `.iloc` for positional indexing.                                 | Chained indexing causes `SettingWithCopyWarning`.                             |
| **Beware of Chained Indexing** | Avoid `df[df['col'] > 0]['other_col'] = val`; instead use `.loc` to avoid ambiguous assignment. | `SettingWithCopyWarning` — changes may not persist.                           |
| **Use .astype() Efficiently** | Convert column types to reduce memory usage, e.g. `astype('category')` for strings with few unique values. | Memory bloat if data types not optimized.                                     |
| **Use .query() for Complex Filters** | Use `df.query('col > 0 and other_col < 5')` for readable filtering.                             | Complex filtering with many `&` and `|` can become hard to read.              |
| **Use category dtype for Strings** | Convert repetitive string columns to `category` dtype to save memory and speed up grouping/joins. | Using `object` dtype wastes memory.                                           |
| **Use pd.eval() for Expression Evaluation** | Speeds up complex expression calculations.                                                | Less common, but can improve performance on complex filtering/assignments.    |
| **Read Data with Proper Dtypes** | Use `dtype` argument in `read_csv` to speed up and reduce memory usage.                           | Slow reads and excessive memory usage without `dtype` specification.          |
| **Use .apply() Sparingly** | Vectorized operations > `.apply()`, which is slower; consider rewriting in vectorized form or using numba. | `.apply()` is often slower, especially with Python functions.                 |
| **Memory Usage Checks** | Use `df.info(memory_usage='deep')` to check true memory usage.                                    | Memory leaks or bloat due to large DataFrames.                                |
| **Use .copy() to Avoid Side Effects** | When slicing data, use `.copy()` to avoid unintended modifications on original DataFrame.         | Unexpected behavior due to view vs copy confusion.                            |
| **Drop Columns Early** | Remove unused columns ASAP to reduce memory and speed.                                            | Retaining unnecessary data slows processing.                                  |
| **Avoid Large DataFrames in Memory** | For really large datasets, use libraries like `dask` or `modin` or switch to PySpark.             | Pandas will crash or be very slow with huge data.                             |
| **Datetime Parsing** | Use `parse_dates` argument in `read_csv` to parse dates directly.                                 | Parsing dates manually after loading is slow.                                 |

## Common PySpark & Pandas Error Examples

| Error/Warning                   | Cause                                                                       | Solution                                                              |
|--|--|--|
| `SettingWithCopyWarning` (Pandas) | Chained indexing assignment (e.g., `df[df.col > 0]['col2'] = val`)        | Use `.loc` for assignment: `df.loc[df.col > 0, 'col2'] = val`         |
| `OutOfMemoryError` (PySpark)    | `.collect()` on large dataset; caching too many big DataFrames            | Avoid collect, cache judiciously, increase executor memory            |
| `AnalysisException: Resolved attribute ... missing` (PySpark) | Column not found, typo, or using non-existent column in transformation | Check column names, use `df.printSchema()`                            |
| `Py4JJavaError`                 | JVM errors usually related to resource limits or invalid operations         | Check Spark logs, fix memory configs, check schema compatibility      |
| `TypeError: can only concatenate str (not "int") to str` (Pandas) | Mixing string and int without conversion                                | Convert types explicitly before concat: `df['col'].astype(str)`       |
| `Slow code due to Python loops` | Using Python for loops instead of vectorized ops                            | Replace with vectorized Pandas/Numpy operations or Spark built-ins    |