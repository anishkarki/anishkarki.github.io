# OpenSearch: The ultimate monitoring beast
### Important API commands for Dev Tools
```json
# view everything on index

GET /postgreslogs/_search
{
  "query": {
    "match_all": {}
  },
  "size": 1
}

# get all the meta info of index
GET /_cat/indices/postgreslogs?v&h=health,status,index,docs.count,docs.deleted,pri,rep,store.size

# View full index setttings and mappings
GET /postgreslogs

# View all docs order by date desc + get _raw
GET /postgreslogs/_search
{
  "size": 100,
  "sort": [
    {
      "@timestamp": {"order":"desc"}
    }
    ],
    "query": {"match_all": {}},
    "_source": ["@timestamp", "_raw", "level", "db"]
}

# Create index pattern
POST /api/saved_objects/index-pattern
{
  "attributes": {
    "title": "postgreslogs*",
    "timeFieldName": "@timestamp",
    "fields": "[]"
  }
}
```
### Similar python scipt
```py
from opensearchpy import OpenSearch 
import json

host = 'localhost'
port = 19200
auth = ('admin','OpenSearch@2024')

client = OpenSearch(
    hosts=[{'host':host, 'port': port}],
    http_compres=True,
    http_auth=auth,
    use_ssl=True,
    verify_certs=False,
    ssl_asserts_hostname=False,
    ssl_show_warn=False
)

# View all the details about the indices
def get_index_metainfo(client=None, index=None, format='json'):
    return client.cat.indices(index=index, format=format)

# view index mapping and settings
def get_index_mapandSettings(client=None, index=None):
    respose =  client.indices.get(index=index)
    return json.dumps(respose)

def get_logs_orderbydate(client=None, index=None, size=0):
    query = {
        "size":size,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {"match_all": {}},
        "_source": ["@timestamp", "_raw", "level"]
    }
    resp = client.search(index=index, body=query)
    for hit in resp['hits']['hits']:
        raw_log = hit['_source'].get('_raw', hit['_source'].get('message', 'N/A'))
        ts = hit['_source']['@timestamp']
        print(f"[{ts}] Full log:\n {raw_log}\n {'-'*80}")


info = get_index_metainfo(client, index='postgreslogs', format='json')
print(info[0])

respose = get_index_mapandSettings(client, index='postgreslogs')
print(respose)

get_logs_orderbydate(client, index='postgreslogs', size=100)
```
#### Creating index pattern with python using requests
```py
import requests

url = "http://localhost:5601/api/saved_objects/index-pattern"
headers = {"kbn-xsrf": "true", "Content-Type": "application/json"}
auth = ('admin', 'admin')
data = {
    "attributes": {
        "title": "postgreslogs*",
        "timeFieldName": "@timestamp"
    }
}

r = requests.post(url, json=data, headers=headers, auth=auth, verify=False)
print(r.json())  # {'id': 'index-pattern:...', 'attributes': {...}}
```
### Location of index pattern:
* dashboard management &rarr; opensearch-dashboards/indexPatterns

