## Life cycle of machine learning beings with (business probelm)
1. Data exploration
2. modeling
3. validation
4. deployment
5. montioring, refresh, retirement
6. Data access
---
## Data access and collection

## Data exploration and preparation
* understand the data
* explore the data
* clean the data
* Label the data
## Feature Exploration:
* identify the features that are useful. 
* like skewed, range, values, categories, outlier, missing value
* for traffic analysis, we might have traffic per hour and it can be converted into 
    * early morining
    * mid morining
    * day and so on
## Modeling
1. Supervised
- Classification
- Regression
2. Unsupervised
- KNN clustering
---
It is an extensive experimental process.
---
## Validation:
* Precision/Recall
* F1-score
* ROC Curve
* Confusion matrix
* Lift chart, gain chart

1. Classification: Accuracy, confusion matrix
2. Regression: RMSE, MAE, R^2
3. Unsupervised: high coesion clusters


### Model deployment
* model preservation and cataloging
* Real-time or batch consumption
* Usage consideration

### Model monitoring
1. Data drifting: The quality of deployment should be monitored.
    * Check for the distribution of training data and live data
2. Ops monitoring
    * latency, memory, cpu
    * logs
---

# Access Data
1. Data collection: history, streaming, application
2. Bring data to oci.
---
* access from Object Storage: Use API ```oci://*<bucketname>@<namespcae>/<file-name>```
* access data from local storage: use ads read_file. ```pd.DataFrame.ads.read_sql(..., connection_paramters)```
3. Read from MySQL and Save to mysql
4. Access Data from Amazon S3: ```pd.read_csv('blocksize':1000000)```

### PyArrow: is development of in-memory analytics
* PyArrow have first-class integration with NumPy, pandas and built-in python objects.
* import ocifs
---
#### Data Types
1. Categorical
2. Continuous
3. Datetime
4. Ordinal
---
* inspect with ADS datatype use feature_types
* show_in_notebook()
---
## Data Preprocessing
### data transformation and manipulations
* errors and outliers, missingness
#### Steps:
1. combining and cleaning data: Formats, units and naming, concat horizontal or vertical (union/intersection)
2. Data imputation: 
3. Dummy variables: endoer label encoder, onehot encoder, ordinal, fit_tranform()
4. Outlier detection: Error or true data points.
5. Feature scaling: eclidian distance (min-max/standarization)
6. Feature engineering: 
7. Feature selection
8. Feature Extraction
---
## Dimensionality Reduction
* Feature selection
    * variance thresholds
    * correlation thresholds
    * genetic algorithms
* Feature Extraction
    * PCA
    * Autoencoder
    * linear discriminant analysis
---
#### Text Data
* Vectorize: text into numerical feature vectors
* stop words: common stop words
* pos tagging: identify each token's part and then tagging it
* tokenize: breaking down text into tokens, such as words, chars or n-gram
* stemming: text standardization to stem words to their root.
* lemmatization: stemming accoriding to context usually from a dictinary.
---
* ```suggest_recommendations()```: variable, imbalance, transformation
* ```auto_transform()```: imbalance fix, fix_imbalance = true. downsample majority class. 
* ```visualize_transform()```: flow chart
---
suggest_recommendations(): Employee attrition Data set.
--- 
### Split dataset
* ```transformed_ds.train_test_split(80%,10%,10%)``` : generalisation error
---