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

(ansible_v) ➜  myDemoSetup git:(main) ✗ curl -k -u admin:OpenSearch@2024 https://localhost:19200/_plugins/_alerting/monitors/15I8WJoBHocox8i_sw9c | \
  jq -r '.monitor | "Name: \(.name)\nEnabled: \(.enabled)\nID: \(.id)\nType: \(.monitor_type)"'
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  2269  100  2269    0     0   179k      0 --:--:-- --:--:-- --:--:--  184k
Name: Postgres Raw Logs - 87b4cc23f27c
Enabled: true
ID: null
Type: query_level_monitor

(ansible_v) ➜  myDemoSetup git:(main) ✗ curl -k -u admin:OpenSearch@2024 -X POST https://localhost:19200/_plugins/_alerting/monitors/_search \
  -H 'Content-Type: application/json' \
  -d '{"query":{"match_all":{}}}' | \
  jq -r '.hits.hits[]._source | "• \(.name) (\(._id)) – Enabled: \(.enabled) – Type: \(.monitor_type // "query_level")"'
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  2480  100  2454  100    26   155k   1686 --:--:-- --:--:-- --:--:--  161k
• Postgres Raw Logs - 87b4cc23f27c (null) – Enabled: true – Type: query_level_monitor
(ansible_v) ➜  myDemoSetup git:(main) ✗ 



## Listing all the monitors
(ansible_v) ➜  myDemoSetup git:(main) ✗ curl -k -u admin:OpenSearch@2024 -X POST https://localhost:19200/_plugins/_alerting/monitors/_search \
  -H 'Content-Type: application/json' \
  -d '{"query":{"match_all":{}}}' | \
  jq                                                                                                                                                                                                            
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  2480  100  2454  100    26   202k   2197 --:--:-- --:--:-- --:--:--  220k
{
  "took": 2,
  "timed_out": false,
  "_shards": {
    "total": 1,
    "successful": 1,
    "skipped": 0,
    "failed": 0
  },
  "hits": {
    "total": {
      "value": 1,
      "relation": "eq"
    },
    "max_score": 2.0,
    "hits": [
      {
        "_index": ".opendistro-alerting-config",
        "_id": "15I8WJoBHocox8i_sw9c",
        "_version": 1,
        "_seq_no": 0,
        "_primary_term": 1,
        "_score": 2.0,
        "_source": {
          "type": "monitor",
          "schema_version": 0,
          "name": "Postgres Raw Logs - 87b4cc23f27c",
          "monitor_type": "query_level_monitor",
          "enabled": true,
          "enabled_time": 1762416963536,
          "schedule": {
            "period": {
              "interval": 5,
              "unit": "MINUTES"
            }
          },
          "inputs": [
            {
              "search": {
                "indices": [
                  "postgres*"
                ],
                "query": {
                  "size": 0,
                  "query": {
                    "bool": {
                      "must": [
                        {
                          "match": {
                            "host.name": {
                              "query": "87b4cc23f27c",
                              "operator": "OR",
                              "prefix_length": 0,
                              "max_expansions": 50,
                              "fuzzy_transpositions": true,
                              "lenient": false,
                              "zero_terms_query": "NONE",
                              "auto_generate_synonyms_phrase_query": true,
                              "boost": 1.0
                            }
                          }
                        },
                        {
                          "range": {
                            "@timestamp": {
                              "from": "now-5m/m",
                              "to": null,
                              "include_lower": true,
                              "include_upper": true,
                              "boost": 1.0
                            }
                          }
                        }
                      ],
                      "adjust_pure_negative": true,
                      "boost": 1.0
                    }
                  },
                  "aggregations": {
                    "raw_count": {
                      "value_count": {
                        "field": "_raw"
                      }
                    }
                  }
                }
              }
            }
          ],
          "triggers": [
            {
              "query_level_trigger": {
                "id": "0pI8WJoBHocox8i_rw_P",
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
                    "id": "05I8WJoBHocox8i_rw_Q",
                    "name": "Send to Test Email Channel",
                    "destination_id": "yZI4WJoBHocox8i_xA-r",
                    "message_template": {
                      "source": "Monitor {{ctx.monitor.name}} just entered alert status.\n\nHost: 87b4cc23f27c\nRaw log count (5 min): {{ctx.results[0].aggregations.raw_count.value}}\nTime: {{ctx.trigger.triggered_time}}",
                      "lang": "mustache"
                    },
                    "throttle_enabled": false,
                    "subject_template": {
                      "source": "High _raw logs on host 87b4cc23f27c",
                      "lang": "mustache"
                    }
                  }
                ]
              }
            }
          ],
          "last_update_time": 1762416963538,
          "data_sources": {
            "query_index": ".opensearch-alerting-queries",
            "findings_index": ".opensearch-alerting-finding-history-write",
            "findings_index_pattern": "<.opensearch-alerting-finding-history-{now/d}-1>",
            "alerts_index": ".opendistro-alerting-alerts",
            "alerts_history_index": ".opendistro-alerting-alert-history-write",
            "alerts_history_index_pattern": "<.opendistro-alerting-alert-history-{now/d}-1>",
            "comments_index": ".opensearch-alerting-comments-history-write",
            "comments_index_pattern": "<.opensearch-alerting-comments-history-{now/d}-1>",
            "query_index_mappings_by_type": {},
            "findings_enabled": false
          },
          "delete_query_index_in_every_run": false,
          "should_create_single_alert_for_findings": false,
          "owner": "alerting"
        }
      }
    ]
  }
}
(ansible_v) ➜  myDemoSetup git:(main) ✗ 

(ansible_v) ➜  myDemoSetup git:(main) ✗ curl -k -u admin:OpenSearch@2024 -X POST https://localhost:19200/_plugins/_alerting/monitors/_search \
  -H 'Content-Type: application/json' \
  -d '{"query":{"match_all":{}}}' | \
  jq -r '.hits.hits[0]._id'
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  2480  100  2454  100    26   127k   1381 --:--:-- --:--:-- --:--:--  134k
15I8WJoBHocox8i_sw9c
(ansible_v) ➜  myDemoSetup git:(main) ✗ 

Delete: curl -k -u admin:OpenSearch@2024 -X DELETE https://localhost:19200/_plugins/_alerting/monitors/15I8WJoBHocox8i_sw9c



# Create a new monitor that check _raw and gives out alert if more than 10 counts in 5 minutes
curl -k -u admin:OpenSearch@2024 -X POST https://localhost:19200/_plugins/_alerting/monitors \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "monitor",
    "name": "Postgres ERROR Count Alert",
    "monitor_type": "query_level_monitor",
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
                { "match": { "_raw": "ERROR" } },
                { "range": { "@timestamp": { "gte": "now-5m/m" } } }
              ]
            }
          },
          "aggregations": {
            "error_count": {
              "value_count": { "field": "_id" }
            }
          }
        }
      }
    }],
    "triggers": [{
      "name": "High ERROR Count",
      "severity": "1",
      "condition": {
        "script": {
          "source": "ctx.results[0].aggregations.error_count.value > 10",
          "lang": "painless"
        }
      },
      "actions": [{
        "name": "Send Email Alert",
        "destination_id": "yZI4WJoBHocox8i_xA-r",
        "subject_template": { "source": "High ERROR Count in Postgres Logs" },
        "message_template": {
          "source": "Monitor {{ctx.monitor.name}} triggered!\n\n> 10 ERROR logs detected in last 5 minutes\nCount: {{ctx.results[0].aggregations.error_count.value}}\nTime: {{ctx.trigger.triggered_time}}\n\nCheck logs for: relation does not exist, function does not exist, etc."
        }
      }]
    }]
  }'
  
{"_id":"dJKLWJoBHocox8i_ZxIG","_version":1,"_seq_no":3,"_primary_term":1,"monitor":{"type":"monitor","schema_version":0,"name":"Postgres ERROR Count Alert","monitor_type":"query_level_monitor","enabled":true,"enabled_time":1762422122243,"schedule":{"period":{"interval":5,"unit":"MINUTES"}},"inputs":[{"search":{"indices":["postgres*"],"query":{"size":0,"query":{"bool":{"must":[{"match":{"_raw":{"query":"ERROR","operator":"OR","prefix_length":0,"max_expansions":50,"fuzzy_transpositions":true,"lenient":false,"zero_terms_query":"NONE","auto_generate_synonyms_phrase_query":true,"boost":1.0}}},{"range":{"@timestamp":{"from":"now-5m/m","to":null,"include_lower":true,"include_upper":true,"boost":1.0}}}],"adjust_pure_negative":true,"boost":1.0}},"aggregations":{"error_count":{"value_count":{"field":"_id"}}}}}}],"triggers":[{"query_level_trigger":{"id":"cpKLWJoBHocox8i_ZxID","name":"High ERROR Count","severity":"1","condition":{"script":{"source":"ctx.results[0].aggregations.error_count.value > 10","lang":"painless"}},"actions":[{"id":"c5KLWJoBHocox8i_ZxID","name":"Send Email Alert","destination_id":"yZI4WJoBHocox8i_xA-r","message_template":{"source":"Monitor {{ctx.monitor.name}} triggered!\n\n> 10 ERROR logs detected in last 5 minutes\nCount: {{ctx.results[0].aggregations.error_count.value}}\nTime: {{ctx.trigger.triggered_time}}\n\nCheck logs for: relation does not exist, function does not exist, etc.","lang":"mustache"},"throttle_enabled":false,"subject_template":{"source":"High ERROR Count in Postgres Logs","lang":"mustache"}}]}}],"last_update_time":1762422122243,"data_sources":{"query_index":".opensearch-alerting-queries","findings_index":".opensearch-alerting-finding-history-write","findings_index_pattern":"<.opensearch-alerting-finding-history-{now/d}-1>","alerts_index":".opendistro-alerting-alerts","alerts_history_index":".opendistro-alerting-alert-history-write","alerts_history_index_pattern":"<.opendistro-alerting-alert-history-{now/d}-1>","comments_index":".opensearch-alerting-comments-history-write","comments_index_pattern":"<.opensearch-alerting-comments-history-{now/d}-1>","query_index_mappings_by_type":{},"findings_enabled":false},"delete_query_index_in_every_run":false,"should_create_single_alert_for_findings":false,"owner":"alerting"}}%  



## DSL To filter the data:
GET /postgres*/_search
{
  "size": 0,
  "aggs": {
    "top_raw": {
      "terms": {
        "field": "_raw.keyword",
        "size": 10
      }
    }
  }
}

GET /postgres*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "host.name": {
              "value": "87b4cc23f27c"
            }
          }
        },
        {
          "match": {
            "_raw": "ERROR:"
          }
        }
        ]
    }
  }
}

GET /postgres*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "host.name": {
              "value": "87b4cc23f27c"
            }
          }
        },
        {
          "match": {
            "_raw": "ERROR:"
          }
        }
        ]
    }
  },
  "aggs": {
    "top_raw": {
      "terms": {
        "field": "_raw.keyword",
        "size": 10
      }
    }
  }
}
```
| keyword|Meaning|
|---|---|
| Get| Http method to retrieve data. used for read-only operations|
| /postgres*/_search| search API endpoints|
|"size": 0| Return 0 documents in hits. We only want aggregations, not raw docs|
|"query" | Filter documents before aggregation. Only matching docs are counted|
|"bool"| Boolean query -combines multiple condition with logic (```must```, ```shoudl```, ```must_not```) etc.|
|"must" | all confitions inside must be true (logical AND)|
|{"term": {"host.name": "..."}}| Exact match on host.name field|
|{"Match": {"_raw": "ERROR:"}} | Full text-search on _raw field. Analyzes text and matches docs contianing ERROR: (case-insensative by default)|
|"aggs" | Aggregates -- compute metrics, stats, or buckets over filtered docs|
| "top_raw"| Custom name for the aggregation|
|"terms" | bucket aggreagtion--group docs by unique values of a field|
| "field": "_raw.keyword"| use the keyword version of _raw for exact string bucketing (required for terms aggs).|
|size:10| returns top 10 most frequent log line|

* Buckets are the building blocks of aggregations, the other being metrics.
* Buckets as groups or containers that hold docuements with similar char. 
* Let you group and organize the data.
























### Getting stated with vector search and the Opensearch provided ML model
```bash
# Allow the node to give out the ml run in single node
PUT _cluster/settings
{
  "persistent": {
    "plugins.ml_commons.only_run_on_ml_node": "false",
    "plugins.ml_commons.native_memory_threshold": "99"
  }
}
## Start by using opensource huggingface distilbert: will get into details later
POST /_plugins/_ml/models/_register?deploy=true
{
  "name": "huggingface/sentence-transformers/msmarco-distilbert-base-tas-b",
  "version": "1.0.3",
  "model_format": "TORCH_SCRIPT"
}
#Output
{
  "task_id": "upJlWJoBHocox8i_tBGP",
  "status": "CREATED"
}

# Check the status of the download:
GET /_plugins/_ml/tasks/upJlWJoBHocox8i_tBGP
{
  "model_id": "xZJlWJoBHocox8i_vREK",
  "task_type": "REGISTER_MODEL",
  "function_name": "TEXT_EMBEDDING",
  "state": "COMPLETED",
  "worker_node": [
    "PRbPvKIxTvq8dUFkBwZE9Q"
  ],
  "create_time": 1762419651564,
  "last_update_time": 1762419717673,
  "is_async": true
}

# Now using the model id we can test the new output
GET /_plugins/_ml/models/xZJlWJoBHocox8i_vREK
## Output
{
  "name": "huggingface/sentence-transformers/msmarco-distilbert-base-tas-b",
  "model_group_id": "spJlWJoBHocox8i_sxHY",
  "algorithm": "TEXT_EMBEDDING",
  "model_version": "1",
  "model_format": "TORCH_SCRIPT",
  "model_state": "DEPLOYED",
  "model_content_size_in_bytes": 266357253,
  "model_content_hash_value": "2fcc51bd52df9bd55f0d46007b80663dc6014687a321d23c00508a08d9c86d86",
  "model_config": {
    "model_type": "distilbert",
    "embedding_dimension": 768,
    "framework_type": "SENTENCE_TRANSFORMERS",
    "all_config": """{"_name_or_path": "sentence-transformers/msmarco-distilbert-base-tas-b", "activation": "gelu", "architectures": ["DistilBertModel"], "attention_dropout": 0.1, "dim": 768, "dropout": 0.1, "hidden_dim": 3072, "initializer_range": 0.02, "max_position_embeddings": 512, "model_type": "distilbert", "n_heads": 12, "n_layers": 6, "pad_token_id": 0, "qa_dropout": 0.1, "seq_classif_dropout": 0.2, "sinusoidal_pos_embds": false, "tie_weights_": true, "torch_dtype": "float32", "transformers_version": "4.49.0", "vocab_size": 30522}""",
    "additional_config": {
      "space_type": "innerproduct"
    },
    "pooling_mode": "CLS"
  },
  "created_time": 1762419653743,
  "last_updated_time": 1762419736267,
  "last_registered_time": 1762419717657,
  "last_deployed_time": 1762419735539,
  "auto_redeploy_retry_times": 0,
  "total_chunks": 27,
  "planning_worker_node_count": 1,
  "current_worker_node_count": 1,
  "planning_worker_nodes": [
    "PRbPvKIxTvq8dUFkBwZE9Q"
  ],
  "deploy_to_all_nodes": true,
  "is_hidden": false
}
## We can see that model_state is deployed and the model was split into 27 smaller chunks.

# Lets ingest the data
# Setup a text embedding processor: a task that transfoms docuement fields before documents are ingested into an index. 
# Register a pipeline:
PUT /_ingest/pipeline/nlp-ingest-pipeline
{
  "description": "An NLP ingest pipeline",
  "processors": [
    {
      "text_embedding": {
        "model_id": "xZJlWJoBHocox8i_vREK",
        "field_map": {
          "text": "passage_embedding"
        }
      }
    }
  ]
}


```
````

---

# PostgreSQL Error Monitoring & Alerting (Day 1: Replication Slots & SQL Errors)

## Overview
Create two monitors for production PostgreSQL error tracking:
1. **Monitor 1**: Alert on ANY FATAL or PANIC error (1 count threshold)
2. **Monitor 2**: Alert when 2+ ERROR logs occur within 5 minutes

Both use the same webhook/email channel for notifications with customizable message templates.

---

## Setup: Create a Webhook Notification Channel

If you already have a custom webhook (Teams, Slack, PagerDuty), register it as a config:

```bash
# Create a custom webhook channel
curl -k -u admin:OpenSearch@2024 -X POST \
  https://localhost:19200/_plugins/_notifications/configs \
  -H 'Content-Type: application/json' \
  -d '{
    "config": {
      "name": "PostgreSQL Alerts Webhook",
      "description": "Webhook for PostgreSQL critical alerts (FATAL, PANIC, ERROR)",
      "config_type": "webhook",
      "is_enabled": true,
      "webhook": {
        "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
        "header_params": {
          "Content-Type": "application/json"
        }
      }
    }
  }'

# Response: {"config_id": "your_webhook_config_id"}
# Save the config_id for use in monitors below
```

Or use an existing email channel if already configured:
```bash
# List all notification channels
curl -k -u admin:OpenSearch@2024 -X GET \
  https://localhost:19200/_plugins/_notifications/channels
```

---

## DSL Filter: Extract PostgreSQL Error Levels

### Test Query: Find all FATAL, PANIC, and ERROR logs
```json
GET /postgres*/_search
{
  "size": 100,
  "query": {
    "bool": {
      "must": [
        {
          "range": { "@timestamp": { "gte": "now-24h" } }
        }
      ],
      "should": [
        { "match": { "_raw": "FATAL:" } },
        { "match": { "_raw": "PANIC:" } },
        { "match": { "_raw": "ERROR:" } }
      ],
      "minimum_should_match": 1
    }
  },
  "_source": ["@timestamp", "_raw", "host", "pid"]
}
```

### Aggregation: Count errors by severity and host
```json
GET /postgres*/_search
{
  "size": 0,
  "query": {
    "range": { "@timestamp": { "gte": "now-5m" } }
  },
  "aggs": {
    "by_severity": {
      "filters": {
        "filters": {
          "FATAL": { "match": { "_raw": "FATAL:" } },
          "PANIC": { "match": { "_raw": "PANIC:" } },
          "ERROR": { "match": { "_raw": "ERROR:" } }
        }
      },
      "aggs": {
        "by_host": {
          "terms": { "field": "host.keyword", "size": 10 }
        }
      }
    }
  }
}
```

---

## Monitor 1: Alert on ANY FATAL or PANIC Error (Count >= 1)

### Create the Monitor
```bash
curl -k -u admin:OpenSearch@2024 -X POST \
  https://localhost:19200/_plugins/_alerting/monitors \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "monitor",
    "name": "Postgres FATAL/PANIC Alert",
    "monitor_type": "query_level_monitor",
    "enabled": true,
    "schedule": {
      "period": {
        "interval": 1,
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
                { "range": { "@timestamp": { "gte": "now-1m" } } }
              ],
              "should": [
                { "match": { "_raw": "FATAL:" } },
                { "match": { "_raw": "PANIC:" } }
              ],
              "minimum_should_match": 1
            }
          },
          "aggs": {
            "critical_count": {
              "value_count": { "field": "_id" }
            },
            "sample_logs": {
              "top_hits": {
                "size": 3,
                "_source": ["@timestamp", "_raw", "host", "pid"],
                "sort": [{ "@timestamp": { "order": "desc" } }]
              }
            }
          }
        }
      }
    }],
    "triggers": [{
      "name": "FATAL/PANIC Error Detected",
      "severity": "1",
      "condition": {
        "script": {
          "source": "ctx.results[0].aggregations.critical_count.value >= 1",
          "lang": "painless"
        }
      },
      "actions": [{
        "name": "Send to Webhook",
        "destination_id": "YOUR_WEBHOOK_CONFIG_ID",
        "subject_template": {
          "source": "🚨 CRITICAL: PostgreSQL FATAL/PANIC Error Detected"
        },
        "message_template": {
          "source": "**Alert:** {{ctx.monitor.name}}\n\n**Severity:** CRITICAL\n\n**Count (last 1 min):** {{ctx.results[0].aggregations.critical_count.value}}\n\n**Sample Logs:**\n{{#ctx.results[0].aggregations.sample_logs.hits.hits}}\n- [{{_source.@timestamp}}] {{_source._raw}}\n{{/ctx.results[0].aggregations.sample_logs.hits.hits}}\n\n**Time Triggered:** {{ctx.trigger.triggered_time}}\n\n**Action:** Investigate immediately. FATAL/PANIC errors indicate critical system failures."
        }
      }]
    }]
  }'
```

---

## Monitor 2: Alert on 2+ ERROR Logs Within 5 Minutes

### Create the Monitor
```bash
curl -k -u admin:OpenSearch@2024 -X POST \
  https://localhost:19200/_plugins/_alerting/monitors \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "monitor",
    "name": "Postgres High ERROR Count (5 min)",
    "monitor_type": "query_level_monitor",
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
                { "match": { "_raw": "ERROR:" } },
                { "range": { "@timestamp": { "gte": "now-5m" } } }
              ]
            }
          },
          "aggs": {
            "error_count": {
              "value_count": { "field": "_id" }
            },
            "by_host": {
              "terms": { "field": "host.keyword", "size": 5 },
              "aggs": {
                "top_errors": {
                  "top_hits": {
                    "size": 2,
                    "_source": ["@timestamp", "_raw", "pid"],
                    "sort": [{ "@timestamp": { "order": "desc" } }]
                  }
                }
              }
            }
          }
        }
      }
    }],
    "triggers": [{
      "name": "High ERROR Count in 5 Minutes",
      "severity": "2",
      "condition": {
        "script": {
          "source": "ctx.results[0].aggregations.error_count.value >= 2",
          "lang": "painless"
        }
      },
      "actions": [{
        "name": "Send to Webhook",
        "destination_id": "YOUR_WEBHOOK_CONFIG_ID",
        "subject_template": {
          "source": "⚠️ WARNING: PostgreSQL ERROR Count Threshold Exceeded"
        },
        "message_template": {
          "source": "**Alert:** {{ctx.monitor.name}}\n\n**Severity:** WARNING (2+ errors in 5 min)\n\n**Total ERROR Count:** {{ctx.results[0].aggregations.error_count.value}}\n\n**Errors by Host:**\n{{#ctx.results[0].aggregations.by_host.buckets}}\n- **Host:** {{key}} (Count: {{doc_count}})\n  {{#top_errors.hits.hits}}\n  • [{{_source.@timestamp}}] {{_source._raw}}\n  {{/top_errors.hits.hits}}\n{{/ctx.results[0].aggregations.by_host.buckets}}\n\n**Time Triggered:** {{ctx.trigger.triggered_time}}\n\n**Action:** Review error logs and identify patterns. Common causes: missing tables, constraint violations, permission issues."
        }
      }]
    }]
  }'
```

---

## Webhook Message Template Examples

### For Slack Webhook (JSON format)
If using Slack, format the message as JSON:

```json
{
  "text": "PostgreSQL Alert",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚨 PostgreSQL FATAL Error"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Severity:*\nCRITICAL"
        },
        {
          "type": "mrkdwn",
          "text": "*Count:*\n{{ctx.results[0].aggregations.critical_count.value}}"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "{{ctx.monitor.name}} triggered at {{ctx.trigger.triggered_time}}"
      }
    }
  ]
}
```

### For Microsoft Teams Webhook (JSON format)
```json
{
  "@type": "MessageCard",
  "@context": "https://schema.org/extensions",
  "summary": "PostgreSQL Alert",
  "themeColor": "cc0000",
  "title": "🚨 PostgreSQL FATAL/PANIC Error",
  "sections": [
    {
      "activityTitle": "Monitor: {{ctx.monitor.name}}",
      "facts": [
        {
          "name": "Severity:",
          "value": "CRITICAL"
        },
        {
          "name": "Count:",
          "value": "{{ctx.results[0].aggregations.critical_count.value}}"
        },
        {
          "name": "Time:",
          "value": "{{ctx.trigger.triggered_time}}"
        }
      ]
    }
  ],
  "potentialAction": [
    {
      "@type": "OpenUri",
      "name": "View Logs in OpenSearch",
      "targets": [
        {
          "os": "default",
          "uri": "https://localhost:5601/app/discover"
        }
      ]
    }
  ]
}
```

---

## List, Update, Delete Monitors

### List all monitors
```bash
curl -k -u admin:OpenSearch@2024 -X POST \
  https://localhost:19200/_plugins/_alerting/monitors/_search \
  -H 'Content-Type: application/json' \
  -d '{"query": {"match_all": {}}}' | jq
```

### Get a specific monitor by ID
```bash
curl -k -u admin:OpenSearch@2024 -X GET \
  https://localhost:19200/_plugins/_alerting/monitors/MONITOR_ID
```

### Update a monitor
```bash
curl -k -u admin:OpenSearch@2024 -X PUT \
  https://localhost:19200/_plugins/_alerting/monitors/MONITOR_ID \
  -H 'Content-Type: application/json' \
  -d '{...updated monitor JSON...}'
```

### Delete a monitor
```bash
curl -k -u admin:OpenSearch@2024 -X DELETE \
  https://localhost:19200/_plugins/_alerting/monitors/MONITOR_ID
```

### Test a monitor (trigger manually)
```bash
curl -k -u admin:OpenSearch@2024 -X POST \
  https://localhost:19200/_plugins/_alerting/monitors/MONITOR_ID/_execute
```

---

## Key Points

- **Monitor 1 (FATAL/PANIC)**: Runs every 1 minute, triggers on ANY occurrence (threshold >= 1)
- **Monitor 2 (ERROR)**: Runs every 5 minutes, triggers when count >= 2 in that window
- **Webhook**: Already created; just add the `config_id` to `destination_id` in monitor actions
- **Message Template**: Uses Mustache syntax (`{{...}}`) to embed dynamic monitor data
- **Aggregations**: Include `top_hits` to show sample logs in alert message for quick diagnosis

---

## Customization

Replace `YOUR_WEBHOOK_CONFIG_ID` with the actual config ID from your webhook setup. You can:
- Adjust thresholds (change `>= 1` or `>= 2`)
- Modify schedule interval (1m, 5m, 15m, 1h, etc.)
- Add additional filters (by `host`, `database`, `user`, etc.)
- Change message templates per your team's notification needs


```