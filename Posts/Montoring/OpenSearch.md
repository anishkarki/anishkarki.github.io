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
---
# Create webhook destination
```bash
curl -s -k -u admin:OpenSearch@2024 \
  -X POST \
  https://localhost:19200/_plugins/_alerting/destinations \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "mailhog-dest",
    "type": "email",
    "config": {
      "from": "alerts@local",
      "to": ["dev@local"],
      "host": "mailhog",
      "port": 1025,
      "method": "smtp",
      "auth": false
    }
  }'
```
1. Create a mail channel with recepient group manually. Either mail host with SMTP or use any webhook available (TEAMS /SLACK)
2. Get ID of your Test Email Channel: https://docs.opensearch.org/latest/observing-your-data/notifications/api/
```sh
(ansible_v) ➜  myDemoSetup git:(main) ✗ curl -k -u admin:OpenSearch@2024 -X GET https://localhost:19200/_plugins/_notifications/channels
{"start_index":0,"total_hits":1,"total_hit_relation":"eq","channel_list":[{"config_id":"epIsWJoBHocox8i_hA_y","name":"Test Email Channel","description":"","config_type":"email","is_enabled":true}]}% 

(ansible_v) ➜  myDemoSetup git:(main) ✗ curl -k -u admin:OpenSearch@2024 -X POST https://localhost:19200/_plugins/_notifications/configs \
  -H 'Content-Type: application/json' \
  -d '{
    "config": {
      "name": "Mailhog SMTP",
      "description": "Local Mailhog SMTP",
      "config_type": "smtp_account",
      "is_enabled": true,
      "smtp_account": {
        "host": "mailhog",
        "port": 1025,
        "method": "none",
        "from_address": "alerts@opensearch.local"
      }
    }
  }'
{"config_id":"v5I1WJoBHocox8i_-A8R"}%

(ansible_v) ➜  myDemoSetup git:(main) ✗ curl -k -u admin:OpenSearch@2024 -X POST https://localhost:19200/_plugins/_notifications/configs \
  -H 'Content-Type: application/json' \
  -d '{
    "config": {
      "name": "Dev Team",
      "description": "Developers email group",
      "config_type": "email_group",
      "is_enabled": true,
      "email_group": {
        "recipient_list": [
          { "recipient": "dev1@test.local" },
          { "recipient": "dev2@test.local" }
        ]
      }
    }
  }'
{"config_id":"wpI2WJoBHocox8i_MA92"}%                                                                                                                                                                                                 
(ansible_v) ➜  myDemoSetup git:(main) ✗ 

(ansible_v) ➜  myDemoSetup git:(main) ✗ curl -k -u admin:OpenSearch@2024 -X POST https://localhost:19200/_plugins/_notifications/configs \
  -H 'Content-Type: application/json' \
  -d '{
    "config": {
      "name": "Test Email Channel",
      "description": "Sends via Mailhog",
      "config_type": "email",
      "is_enabled": true,
      "email": {
        "email_account_id": "v5I1WJoBHocox8i_-A8R",
        "email_group_id_list": ["wpI2WJoBHocox8i_MA92"],
        "recipient_list": []
      }
    }
  }'
{"config_id":"yZI4WJoBHocox8i_xA-r"}%                                                                                                                                                                                                 
(ansible_v) ➜  myDemoSetup git:(main) ✗ 

(ansible_v) ➜  myDemoSetup git:(main) ✗ curl -k -u admin:OpenSearch@2024 -X GET \
  https://localhost:19200/_plugins/_notifications/feature/test/yZI4WJoBHocox8i_xA-r
{"event_source":{"title":"Test Message Title-yZI4WJoBHocox8i_xA-r","reference_id":"yZI4WJoBHocox8i_xA-r","severity":"info","tags":[]},"status_list":[{"config_id":"yZI4WJoBHocox8i_xA-r","config_type":"email","config_name":"Test Email Channel","email_recipient_status":[{"recipient":"dev1@test.local","delivery_status":{"status_code":"200","status_text":"Success"}},{"recipient":"dev2@test.local","delivery_status":{"status_code":"200","status_text":"Success"}}],"delivery_status":{"status_code":"200","status_text":"Success"}}]}% 
```
3. List all the available fields in the given index pattern
```bash
(ansible_v) ➜  myDemoSetup git:(main) ✗ curl -k -u admin:OpenSearch@2024 \
  https://localhost:19200/postgres\*/_mapping | \
  jq -r 'to_entries[] | .value.mappings.properties | if . == null then empty else keys[] end ' | sort -u
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  1309  100  1309    0     0   157k      0 --:--:-- --:--:-- --:--:--  159k
chart_name
cribl_pipe
dash_tag
duration_ms
event_type
host
level
message
pid
_raw
rest
source
sql_text
time
@timestamp
timestamp
tz
(ansible_v) ➜  myDemoSetup git:(main) ✗ 

## Find the text match in _raw
# 1. TEXT SEARCH on _raw (full-text match)
(ansible_v) ➜  myDemoSetup git:(main) ✗ curl -k -u admin:OpenSearch@2024 -X POST https://localhost:19200/postgres\*/_search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "match": { "_raw": "relation \"users\" does not exist" }
    }
  }' | jq '.hits.hits[]._source._raw'
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  6398  100  6309  100    89   716k  10351 --:--:-- --:--:-- --:--:--  781k
"2025-11-02 10:33:55.024 UTC [11750] ERROR:  relation \"nonexistent_table\" does not exist at character 38"
"2025-11-02 10:33:55.997 UTC [11750] ERROR:  relation \"nonexistent_table\" does not exist at character 38"
"2025-11-02 10:33:56.627 UTC [11750] ERROR:  relation \"nonexistent_table\" does not exist at character 38"
"2025-11-02 10:33:57.101 UTC [11750] ERROR:  relation \"nonexistent_table\" does not exist at character 38"
"2025-11-05 00:59:00.958 UTC [199459] ERROR:  function get_raw_page(unknown, integer) does not exist at character 31"
"2025-11-05 00:59:13.164 UTC [199459] ERROR:  function get_raw_page(unknown, integer) does not exist at character 31"
"2025-11-02 10:33:59.154 UTC [11750] ERROR:  relation \"test\" already exists"
"2025-11-02 10:33:59.854 UTC [11750] ERROR:  relation \"test\" already exists"
"2025-11-02 10:34:02.686 UTC [11750] ERROR:  relation \"test\" already exists"
"2025-11-05 00:42:51.132 UTC [199459] LOG:  statement: create extension if not exists pg_visibility;\n\t"

2. Lets aggregate the _raw.keyword (e.g top 10 unique values)
curl -k -u admin:OpenSearch@2024 -X POST https://localhost:19200/postgres\*/_search \
  -H 'Content-Type: application/json' \
  -d '{
    "size": 0,
    "aggs": {
      "top_raw": {
        "terms": { "field": "_raw.keyword", "size": 10 }
      }
    }
  }' | jq '.aggregations.top_raw.buckets[] | {key: .key, count: .doc_count}'
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  1759  100  1635  100   124   223k  17347 --:--:-- --:--:-- --:--:--  245k
{
  "key": "2025-11-02 10:33:55.024 UTC [11750] ERROR:  relation \"nonexistent_table\" does not exist at character 38",
  "count": 1
}
{
  "key": "2025-11-02 10:33:55.997 UTC [11750] ERROR:  relation \"nonexistent_table\" does not exist at character 38",
  "count": 1
}
{
  "key": "2025-11-02 10:33:56.627 UTC [11750] ERROR:  relation \"nonexistent_table\" does not exist at character 38",
  "count": 1
}
{
  "key": "2025-11-02 10:33:57.101 UTC [11750] ERROR:  relation \"nonexistent_table\" does not exist at character 38",
  "count": 1
}
{
  "key": "2025-11-02 10:33:59.154 UTC [11750] ERROR:  relation \"test\" already exists",
  "count": 1
}
{
  "key": "2025-11-02 10:33:59.154 UTC [11750] LOG:  statement: CREATE TABLE test(id INT);\n\tINSERT INTO test VALUES ('abc');\n\t\n\tSELECT 1/0;",
  "count": 1
}
{
  "key": "2025-11-02 10:33:59.154 UTC [11750] STATEMENT:  CREATE TABLE test(id INT);\n\tINSERT INTO test VALUES ('abc');\n\t\n\tSELECT 1/0;",
  "count": 1
}
{
  "key": "2025-11-02 10:33:59.854 UTC [11750] ERROR:  relation \"test\" already exists",
  "count": 1
}
{
  "key": "2025-11-02 10:33:59.854 UTC [11750] LOG:  statement: CREATE TABLE test(id INT);\n\tINSERT INTO test VALUES ('abc');\n\t\n\tSELECT 1/0;",
  "count": 1
}
{
  "key": "2025-11-02 10:33:59.854 UTC [11750] STATEMENT:  CREATE TABLE test(id INT);\n\tINSERT INTO test VALUES ('abc');\n\t\n\tSELECT 1/0;",
  "count": 1
}
(ansible_v) ➜  myDemoSetup git:(main) ✗ 


```

I need to figure out how to get the _raw of my postgres* pattern into the monitor
```sh
curl -k -u admin:OpenSearch@2024 -X POST https://localhost:19200/_plugins/_alerting/monitors \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Postgres Raw Logs - 87b4cc23f27c",
    "type": "monitor",
    "enabled": true,
    "schedule": {
      "period": {
        "interval": 5,
        "unit": "MINUTES"
      }
    },
    "inputs": [{
      "search": {
        "indices": ["postgres*"],
        "query": {
          "size": 0,
          "query": {
            "bool": {
              "must": [
                { "match": { "host.name": "87b4cc23f27c" } },
                { "range": { "@timestamp": { "gte": "now-5m/m" } } }
              ]
            }
          },
          "aggs": {
            "raw_count": {
              "value_count": { "field": "_raw" }
            }
          }
        }
      }
    }],
    "triggers": [
      {
        "name": "High Raw Log Volume",
        "severity": "1",
        "condition": {
          "script": {
            "source": "ctx.results[0].aggregations.raw_count.value > 10",
            "lang": "painless"
          }
        },
        "actions": [
          {
            "name": "Send to Test Email Channel",
            "destination_id": "yZI4WJoBHocox8i_xA-r",
            "subject_template": {
              "source": "High _raw logs on host 87b4cc23f27c"
            },
            "message_template": {
              "source": "Monitor {{ctx.monitor.name}} just entered alert status.\n\nHost: 87b4cc23f27c\nRaw log count (5 min): {{ctx.results[0].aggregations.raw_count.value}}\nTime: {{ctx.trigger.triggered_time}}"
            }
          }
        ]
      }
    ]
  }'

```