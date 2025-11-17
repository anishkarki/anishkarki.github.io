# OpenSearch: Complete Monitoring & Alerting Guide

> Master OpenSearch indexing, searching, aggregations, vector embeddings, and production-grade alerting with PostgreSQL monitoring examples.

---

## Table of Contents
1. [Index Operations](#index-operations)
2. [Querying & Aggregations](#querying--aggregations)
3. [Index Patterns](#index-patterns)
4. [Notification Channels Setup](#notification-channels-setup)
5. [PostgreSQL Error Monitoring](#postgresql-error-monitoring)
6. [Vector Search & ML Models](#vector-search--ml-models)

---

## Index Operations

### View Index Metadata

```bash
# Search index data
GET /postgreslogs/_search
{
  "query": { "match_all": {} },
  "size": 1
}

# View index health and stats
GET /_cat/indices/postgreslogs?v&h=health,status,index,docs.count,docs.deleted,pri,rep,store.size

# Get full index settings and mappings
GET /postgreslogs

# View documents ordered by timestamp
GET /postgreslogs/_search
{
  "size": 100,
  "sort": [{ "@timestamp": {"order":"desc"} }],
  "query": {"match_all": {}},
  "_source": ["@timestamp", "_raw", "level", "db"]
}
```

### Create Index Pattern (Kibana/OpenSearch Dashboards)

**Via REST API:**
```bash
curl -X POST http://localhost:5601/api/saved_objects/index-pattern \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{
    "attributes": {
      "title": "postgreslogs*",
      "timeFieldName": "@timestamp"
    }
  }'
```

**Via Python:**
```python
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

response = requests.post(url, json=data, headers=headers, auth=auth, verify=False)
print(response.json())  # {'id': 'index-pattern:...', 'attributes': {...}}
```

---

## Querying & Aggregations

### Python: OpenSearch Client Setup

```python
from opensearchpy import OpenSearch
import json

# Configure client
client = OpenSearch(
    hosts=[{'host': 'localhost', 'port': 19200}],
    http_compress=True,
    http_auth=('admin', 'OpenSearch@2024'),
    use_ssl=True,
    verify_certs=False,
    ssl_show_warn=False
)

# Get index metadata
def get_index_info(client, index):
    return client.cat.indices(index=index, format='json')

# Get index settings and mappings
def get_index_config(client, index):
    return json.dumps(client.indices.get(index=index), indent=2)

# Retrieve logs ordered by timestamp
def get_logs_by_date(client, index, size=100):
    query = {
        "size": size,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {"match_all": {}},
        "_source": ["@timestamp", "_raw", "level"]
    }
    resp = client.search(index=index, body=query)
    for hit in resp['hits']['hits']:
        log = hit['_source'].get('_raw', hit['_source'].get('message', 'N/A'))
        ts = hit['_source']['@timestamp']
        print(f"[{ts}] {log}\n{'-'*80}")

# Usage
info = get_index_info(client, 'postgreslogs')
print(info[0])

config = get_index_config(client, 'postgreslogs')
print(config)

get_logs_by_date(client, 'postgreslogs', size=100)
```

### List Available Fields in Index

```bash
curl -k -u admin:OpenSearch@2024 \
  https://localhost:19200/postgres*/_mapping | \
  jq -r 'to_entries[] | .value.mappings.properties | if . == null then empty else keys[] end' | sort -u
```

**Output Example:**
```
@timestamp
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
timestamp
tz
```

---

## Advanced Filtering & Text Search

### Full-Text Search on `_raw` Field

Find logs matching error messages:
```bash
curl -k -u admin:OpenSearch@2024 -X POST https://localhost:19200/postgres*/_search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "match": { "_raw": "relation \"users\" does not exist" }
    }
  }' | jq '.hits.hits[]._source._raw'
```

### Aggregation: Top Unique Log Lines

Count and display the 10 most frequent log entries:
```bash
GET /postgres*/_search
{
  "size": 0,
  "aggs": {
    "top_raw": {
      "terms": { "field": "_raw.keyword", "size": 10 }
    }
  }
}
```

### Complex Query: Filter by Host & Error Level

```bash
GET /postgres*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "must": [
        { "term": { "host.name": "87b4cc23f27c" } },
  "content":"# OpenSearch: Complete Monitoring & Alerting Guide

> Master OpenSearch indexing, searching, aggregations, vector embeddings, and production-grade alerting with PostgreSQL monitoring examples.

---

## Table of Contents
1. [Index Operations](#index-operations)
2. [Querying & Aggregations](#querying--aggregations)
3. [Index Patterns](#index-patterns)
4. [Notification Channels Setup](#notification-channels-setup)
5. [PostgreSQL Error Monitoring](#postgresql-error-monitoring)
6. [Vector Search & ML Models](#vector-search--ml-models)

---

## Index Operations

### View Index Metadata

```bash
# Search index data
GET /postgreslogs/_search
{
  "query": { "match_all": {} },
  "size": 1
}

# View index health and stats
GET /_cat/indices/postgreslogs?v&h=health,status,index,docs.count,docs.deleted,pri,rep,store.size

# Get full index settings and mappings
GET /postgreslogs

# View documents ordered by timestamp
GET /postgreslogs/_search
{
  "size": 100,
  "sort": [{ "@timestamp": {"order":"desc"} }],
  "query": {"match_all": {}},
  "_source": ["@timestamp", "_raw", "level", "db"]
}
```

### Create Index Pattern (Kibana/OpenSearch Dashboards)

**Via REST API:**
```bash
curl -X POST http://localhost:5601/api/saved_objects/index-pattern \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{
    "attributes": {
      "title": "postgreslogs*",
      "timeFieldName": "@timestamp"
    }
  }'
```

**Via Python:**
```python
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

response = requests.post(url, json=data, headers=headers, auth=auth, verify=False)
print(response.json())  # {'id': 'index-pattern:...', 'attributes': {...}}
```

---

## Querying & Aggregations

### Python: OpenSearch Client Setup

```python
from opensearchpy import OpenSearch
import json

# Configure client
client = OpenSearch(
    hosts=[{'host': 'localhost', 'port': 19200}],
    http_compress=True,
    http_auth=('admin', 'OpenSearch@2024'),
    use_ssl=True,
    verify_certs=False,
    ssl_show_warn=False
)

# Get index metadata
def get_index_info(client, index):
    return client.cat.indices(index=index, format='json')

# Get index settings and mappings
def get_index_config(client, index):
    return json.dumps(client.indices.get(index=index), indent=2)

# Retrieve logs ordered by timestamp
def get_logs_by_date(client, index, size=100):
    query = {
        "size": size,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {"match_all": {}},
        "_source": ["@timestamp", "_raw", "level"]
    }
    resp = client.search(index=index, body=query)
    for hit in resp['hits']['hits']:
        log = hit['_source'].get('_raw', hit['_source'].get('message', 'N/A'))
        ts = hit['_source']['@timestamp']
        print(f"[{ts}] {log}\n{'-'*80}")

# Usage
info = get_index_info(client, 'postgreslogs')
print(info[0])

config = get_index_config(client, 'postgreslogs')
print(config)

get_logs_by_date(client, 'postgreslogs', size=100)
```

### List Available Fields in Index

```bash
curl -k -u admin:OpenSearch@2024 \
  https://localhost:19200/postgres*/_mapping | \
  jq -r 'to_entries[] | .value.mappings.properties | if . == null then empty else keys[] end' | sort -u
```

**Output Example:**
```
@timestamp
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
timestamp
tz
```

---

## Advanced Filtering & Text Search

### Full-Text Search on `_raw` Field

Find logs matching error messages:
```bash
curl -k -u admin:OpenSearch@2024 -X POST https://localhost:19200/postgres*/_search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "match": { "_raw": "relation \"users\" does not exist" }
    }
  }' | jq '.hits.hits[]._source._raw'
```

### Aggregation: Top Unique Log Lines

Count and display the 10 most frequent log entries:
```bash
GET /postgres*/_search
{
  "size": 0,
  "aggs": {
    "top_raw": {
      "terms": { "field": "_raw.keyword", "size": 10 }
    }
  }
}
```

### Complex Query: Filter by Host & Error Level

```bash
GET /postgres*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "must": [
        { "term": { "host.name": "87b4cc23f27c" } },
        { "match": { "_raw": "ERROR:" } }
      ]
    }
  },
  "aggs": {
    "top_errors": {
      "terms": { "field": "_raw.keyword", "size": 10 }
    }
  }
}
```

### Query Syntax Reference

| Keyword | Meaning |
|---------|---------|
| `GET` | HTTP method for read-only operations |
| `/postgres*/_search` | Search API endpoint with wildcard index |
| `"size": 0` | Return 0 documents; fetch aggregations only |
| `"query"` | Filter documents before aggregation |
| `"bool"` | Boolean logic combining conditions |
| `"must"` | All conditions must be true (AND logic) |
| `"term"` | Exact field value match |
| `"match"` | Full-text search with analysis |
| `"aggs"` | Aggregations for metrics, stats, bucketing |
| `"terms"` | Bucket aggregation grouping by field values |
| `"field": "_raw.keyword"` | Use keyword version for exact string bucketing |
| `"size": 10` | Return top 10 buckets |

---

## Index Patterns (Management)

**Location in Dashboards:** Management → OpenSearch Dashboards → Index Patterns

---

## Notification Channels Setup

Before creating monitors, configure notification destinations for alerts.

### Create SMTP Account Configuration

```bash
curl -k -u admin:OpenSearch@2024 -X POST \
  https://localhost:19200/_plugins/_notifications/configs \
  -H 'Content-Type: application/json' \
  -d '{
    "config": {
      "name": "Mailhog SMTP",
      "description": "Local Mailhog SMTP for dev/testing",
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

# Response: {"config_id":"v5I1WJoBHocox8i_-A8R"}
```

### Create Email Group

```bash
curl -k -u admin:OpenSearch@2024 -X POST \
  https://localhost:19200/_plugins/_notifications/configs \
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

# Response: {"config_id":"wpI2WJoBHocox8i_MA92"}
```

---

## PostgreSQL Error Monitoring

Implement production-grade monitoring for critical PostgreSQL errors (FATAL, PANIC) and warning-level errors.

### Step 1: Identify Fields in Your Logs

Use these queries to understand your log structure before creating monitors.

#### Find All Error Levels

```bash
GET /postgres*/_search
{
  "size": 100,
  "query": {
    "bool": {
      "must": [{ "range": { "@timestamp": { "gte": "now-24h" } } }],
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

---

### Monitor 1: FATAL/PANIC Errors (Immediate Alert)

Create a monitor that triggers on **any** FATAL or PANIC error (threshold: 1+).

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
      "period": { "interval": 1, "unit": "MINUTES" }
    },
    "inputs": [{
      "search": {
        "indices": ["postgres*"],
        "query": {
          "size": 0,
          "query": {
            "bool": {
              "must": [{ "range": { "@timestamp": { "gte": "now-1m" } } }],
              "should": [
                { "match": { "_raw": "FATAL:" } },
                { "match": { "_raw": "PANIC:" } }
              ],
              "minimum_should_match": 1
            }
          },
          "aggs": {
            "critical_count": { "value_count": { "field": "_id" } },
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
        "name": "Send Alert",
        "destination_id": "YOUR_CONFIG_ID",
        "subject_template": {
          "source": "🚨 CRITICAL: PostgreSQL FATAL/PANIC Error"
        },
        "message_template": {
          "source": "**Monitor:** {{ctx.monitor.name}}\n**Severity:** CRITICAL\n**Count (1 min):** {{ctx.results[0].aggregations.critical_count.value}}\n\n**Sample Logs:**\n{{#ctx.results[0].aggregations.sample_logs.hits.hits}}\n- [{{_source.@timestamp}}] {{_source._raw}}\n{{/ctx.results[0].aggregations.sample_logs.hits.hits}}\n\n**Time:** {{ctx.trigger.triggered_time}}\n**Action Required:** Investigate immediately. FATAL/PANIC errors indicate critical system failures."
        }
      }]
    }]
  }'
```

---

It seems the replace operation produced a corrupted content due to file size; I'll rewrite the remainder in a follow-up edit.