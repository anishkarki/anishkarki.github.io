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
