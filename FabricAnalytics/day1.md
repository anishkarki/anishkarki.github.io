#SparkTutorial1
# SPARK TUTORIAL
## Python os and path
<style>
.impressive-paragraph {
  font-size: 12px;
  font-weight: bold;
  color: #0f172a;
  background: linear-gradient(to right, #e0f2fe, #bae6fd);
  padding: 20px;
  border-left: 6px solid #0284c7;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  font-family: 'Segoe UI', sans-serif;
}
</style>

```Python
import os
import path

## Check the existance of the file and directory.
current_dir = os.getcwd() # get current working directory
print(f"{current_dir}") 
full_path = os.path.join("/lakehouse/default/Files/chicago_crimes.csv") #Create the full path to any file. 
# Get the directory name and base name
print(f"For {full_path} dirname:{os.path.dirname(full_path)}, basenaem: {os.path.basename(full_path)}")
print(os.path.split(full_path)) # Can also use the split function
print(os.path.splitext(os.path.basename(full_path))) # split the extensions
## checking the existance
print(os.path.exists(full_path)) #both file or directory
print(os.path.isfile(full_path), os.path.isdir(full_path)) # both check
print(os.path.isabs(full_path)) # check for absolute and relative
print(os.path.normpath(full_path)) # just remove any unnecessary thing

## File handeling
import shutil
target_path="/lakehouse/default/Files/Bronze"
if os.path.isdir(target_path):
    #shutil.move(full_path, target_path)
    pass
import shutil
target_path="/lakehouse/default/Files/Bronze"
file_path = os.path.join(target_path, "chicago_crimes.csv")
if os.path.isdir("/lakehouse/default/Files/"):
    shutil.move(file_path, "/lakehouse/default/Files/")

os.rename(full_path, os.path.join(os.path.dirname(full_path),"chicago_crimes.csv"))
# os.remove() --for deleteing file
# shutil.rmtree(<path>) # remoe the directory and its conetnet.
# shutil.copy(source, destinationdir or fullpath)
```
|Library | function|
|---|--|
os | this can manipulate the os and files and path of the underlying os directly (dangerous)
shutil | special library that can help to manipulate the files. Rename/copy/delete/create
---
### Directory structures in lakehouse
* File API path: This shows that the file are in the default part of the lakehouse. virtual path: /lakehouse/default/Files/chicago_crimes.csv
* Absolute ABFS Path: "abfss://workspacedev@onelake.dfs.fabric.microsoft.com/CrimeAnalysis.Lakehouse/Files/chicago_crimes.csv"
   * absolute path contains the root fo the lakehouse in azure blob storage.
* Realtive path: this is the relative path. It doesn't have the root. Files/chicago_crimes.csv. Location inside the lakhouse.

### Entry point for all the spark.
#### SparkSession: This is the abstraction of HIVE features inclduing ability to write HiveQL, access to HIVE UDFs and ability to read data from Hive tables. 
> * Microsoft has tweaked it into something of their own called Spark SQL that access the fabric lakehouse metdata store data in OneLake (Delta Lake), the file format is Delta and catalog acess is spark.catalog
> * The ```sparksession``` wraps the **sparkcontext**, which handles the actual engine execution.
```py
from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()
```
* *SparkContext*
   * manages connection to the spark cluster
   * tracks the resources
   * manages job and stage exection

Features:
1. session lifecycle managed with notebook
2. Stateless between sessions - metadata stored in lakehouse
3. fully managed pool ( no manual clustering)
4. session isolation: Each notebook/job has its own session and context
5. integrated with AAD.
6. No actual hoddop or YARN ResourceManager. Custom orchestration layer that abstracts spark jobs.

<p class="impressive-paragraph">
  Apache Spark is a distributed computing engine designed for fast and scalable data processing. It works by breaking large datasets into smaller chunks called partitions, which are processed in parallel across a cluster of machines. At the core is the SparkSession, which acts as the entry point and manages the job lifecycle. When you run a transformation (like map, filter, or groupBy), Spark builds a Directed Acyclic Graph (DAG) that represents the logical execution plan. Once an action (like collect() or write()) is triggered, Spark optimizes the DAG into physical stages and schedules tasks across executors—worker processes that run in parallel. Each task operates on a partition, allowing efficient use of memory and CPU across nodes. Unlike Python’s threading or multiprocessing, Spark runs distributed tasks at cluster scale. In Microsoft Fabric, Spark is fully managed: you don't need to set up clusters or manage resources—Fabric automatically provisions compute, handles partitioning, and executes your Spark code seamlessly in the cloud.
</p>

* The beauty is it created DAG (logical exection plan) and optimizes them before exection. So the initial part is slow but exection is really fast.

### Reading the FILE
```py
from pyspark.sql.functions import to_timestamp, col, lit
```

### Ttpes of dataframe API
1. dataframes (highlevel API): Spark dataframes are partitioned and sits on the hundreds of computers with processors.
2. RDD (resilient distributed datasets)

### Handeling the CSV, URL, Database connection to fetch data
* CSV load: ```df = spark.read.csv("path/to/file.csv", header=True, inferSchema=True)```
* URL: You can't do it. need to use python ```urllib.request.urlretrive()```
* Database: use jdbc connector to connect onto any realtional database (SQL server, PostgreSQL, MySQL)
```py
jdbc_url = "jdbc:sqlserver://<hostname>:<port>;databaseName=<dbname>"
connection_properties = {
    "user": "your_username",
    "password": "your_password",
    "driver": "com.microsoft.sqlserver.jdbc.SQLServerDriver"
}

df = spark.read.jdbc(url=jdbc_url, table="dbo.YourTable", properties=connection_properties)
```
### Loading data with schema
1. Reading data with known schema
   * improves performance
   * prevents wrong data types
   * avoid nulls caused by parsing errors
---
## Common daily syntaxs
|syntax-spark |Syntax-pandas | functions|
|---|---|---|
|```df.select([<rows>]).show(5)```|```df[[<name of columns>]]``` | select the specific columns from the dataframe and limit to 5 rows|
|```df.withColumnRenamed(ExistingColumnName, NewColumnName)``` | ```df.rename(columns={'Existing':'NewName'})``` | Rename the existing column|
| rc.withColumn('One',lit(1)) |  |add a column with anem One; with entries all 1s.
| df.remove(<colname>)| |remove a solumn from dataframe




#### Lit function: It is used to create a column with a constant literal value. Unlike pandas pyspark requires everything to to be a column object. lit() wraps literal values so that can be used like column exp.
```df_spark.filter(df_spark['age']>lit(30)).show()```

### Using pivot keyword to make it 
```py
.groupby().pivot(<pivotkey>).sum()
pivot_df = df_spark.groupBy(col('arrest')).count().groupBy().pivot('arrest').sum('count')
```

## Important Collect()[0]['ratio']
* Collect(): returns all rows to the driver like a cursor. A list of Row objects, used to pull small results into the python memeory.
* .show() print content to console

```Python
# What % of reported crimes that resulted in an arrest
pivot_df = df_spark.groupBy(col('arrest')).count().groupBy().pivot('arrest').sum('count')
ratio = pivot_df.select((col("`true`") / df_spark.count()).alias("ratio")).collect()[0]["ratio"]
print(f"True Arrest Ratio: {ratio:.4f}")

# Straight forward
true_count = df_spark.filter(col('arrest')=='true').count()
total_count = df_spark.count()
ratio = true_count/total_count
print(ratio)

# Using agg() with when()
from pyspark.sql.functions import when, count, col

agg_df = df_spark.agg(
    count(when(col('arrest')=='true',1)).alias("true_count"),
    count("*").alias('total_count')
)

ratio = agg_df.select((col('true_count')/col('total_count')).alias("arrest_ratio")).collect()[0]
print(ratio)
```





