# Automation with Airflow, Spark and Datalake

## Step 1: Set up the lakehouse
1. In Fabric, create a workspace called **Data Engineering Workspace**.
2. Follow the medallion schema cleaning approach and create a lakehouse named **bronze_lakehouse**.
3. Under **Files**, create the folders:
   - `/raw/latest.csv`
   - `/bronze/current.csv`

## Step 2: Create a Data Pipeline in Data Factory
1. Create a new data pipeline.
   - Use HTTP as the source.
   - Use the file system as the destination.

