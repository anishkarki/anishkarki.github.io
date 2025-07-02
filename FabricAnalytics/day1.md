# Automation with Airflow, Spark and Datalake
## STEP 1: Setup the lakehouse
1. Go to Fabric and create a workspace ```Data Engineering Workspace```
2. We will be following the medallion schema cleaning approach. create lake_house ```bronze_lakehouse```
3. Under files, create folders 
    * ```/raw/latest.csv```
    * ```/bronze/current.csv```

## STEP 2: Create a datapipeline in Data factory
1. Create a new datapipeline
    * Use the source as the ULR HTTP
    * Use the destination as the file