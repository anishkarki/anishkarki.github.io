|function | spark | pandas|
|---|---|---|
|loading data csv|```spark.read.csv(path, header='true', inferSchema=true, schema=None```| ```pd.read_csv(path, header=0, column_dtypes = {})```|
|describe data| ```df.summary().show()``` | ```df.describe()```|
|bin the dataset| ```bucket = Bucketizer(splits=splits,inputCol = 'median_income', outputCol="income_cat") df_binned = bucket.transform(spark_df)``` | ```pandas_df['income_cat'] = pd.cut(pandas_df['median_income'], bins=[0.,1.5,3.0,4.5,6.,np.inf], labels=[1,2,3,4,5])```|



## Sometimes it better to infer schema and set the type in prior
```py
custom_schema = StructType([
    StructField("ID", IntegerType(), False),      # ID cannot be null
    StructField("Name", StringType(), False),     # Name cannot be null
    StructField("Age", IntegerType(), True),      # Age can be null
    StructField("JoinedDate", DateType(), True),  # Date can be null
    StructField("Salary", DoubleType(), True),    # Salary can be null
    StructField("IsActive", BooleanType(), True)  # IsActive can be null
])

my_pandas_schema = {
    'User_ID': 'int',            # Standard integer
    'Name': 'string',            # Pandas string type (supports NaN)
    'Age': 'Int64',              # Pandas nullable integer type (can hold pd.NA)
    'JoinedDate': 'object',      # Read as object first, then parse dates separately
    'Salary': 'float32',         # Use smaller float for memory
    'Product_ID': 'str',         # Keep as string to preserve leading zeros
    'IsActive': 'object'         # Read as object, then map to boolean
}
```