---
title: "OpenSearch PostgreSQL Dashboard: Complete Monitoring Setup with NDJSON"
date: "2026-01-15"
category: "OpenSearch & Observability"
tags: ["OpenSearch", "PostgreSQL", "Patroni", "Monitoring", "Dashboard", "Observability", "DevOps"]
excerpt: "A production-ready OpenSearch dashboard for monitoring PostgreSQL/Patroni clusters with real-time log analysis, error tracking, and interactive filters. Includes complete NDJSON for one-click import."
author: "Anish Karki"
featured: true
---

# 🐘 OpenSearch PostgreSQL & Patroni Monitoring Dashboard

This guide provides a complete, production-ready OpenSearch dashboard for monitoring PostgreSQL and Patroni cluster logs. The dashboard includes real-time visualizations, error tracking, and interactive filters for deep log analysis.

## 🎯 What This Dashboard Provides

| Feature | Description |
|---------|-------------|
| **📊 Real-time Metrics** | Total events, error counts, warning counts, active sources |
| **📈 Time-Series Analysis** | Log volume over time, errors/warnings trends |
| **🔍 Interactive Filters** | Filter by hostname, log source, log type |
| **⚖️ Node Comparison** | Compare Patroni1 vs Patroni2 log volumes |
| **📁 Source Breakdown** | Visualize logs by source file |

---

## 🏗️ Dashboard Architecture

The dashboard is designed for a Patroni-based PostgreSQL cluster with the following log sources:

```
/var/log/patroni1/postgresql-*.log   # Patroni Node 1 PostgreSQL logs
/var/log/patroni2/postgresql-*.log   # Patroni Node 2 PostgreSQL logs
/var/log/patroni1/patroni.log        # Patroni Node 1 service logs
/var/log/patroni2/patroni.log        # Patroni Node 2 service logs
/var/log/etcd/etcd.log               # etcd coordination logs
```

---

## 📊 Dashboard Panels

### Row 1: Key Metrics (KPIs)

| Panel | Description |
|-------|-------------|
| 📊 **Total Log Events** | Count of all log entries |
| 🔴 **Error Events** | Count of ERROR/FATAL messages with color coding |
| 🟡 **Warning Events** | Count of WARNING messages |
| 🖥️ **Active Sources** | Unique log sources count |

### Row 2: Time-Series Charts

| Panel | Description |
|-------|-------------|
| 📈 **Log Volume Over Time** | Line chart showing log ingestion rate |
| 📊 **Logs Over Time by Source** | Stacked area chart split by source file |

### Row 3: Comparison & Trends

| Panel | Description |
|-------|-------------|
| ⚖️ **Patroni1 vs Patroni2** | Compare log volumes between nodes + etcd |
| 🔴 **Errors & Warnings Over Time** | Track error/warning trends |

### Row 4: Distribution Charts

| Panel | Description |
|-------|-------------|
| 🏠 **Logs by Source** | Donut chart of log distribution |
| ⚠️ **Log Levels Distribution** | Pie chart: ERRORS, WARNINGS, LOG, STATEMENTS |

### Row 5: Detailed Breakdown

| Panel | Description |
|-------|-------------|
| 📁 **Log Sources Breakdown** | Horizontal bar chart of all sources |

---

## 🔍 Filter Controls

The dashboard includes interactive filter controls at the top:

| Filter | Field | Description |
|--------|-------|-------------|
| **Log Source** | `source.keyword` | Filter by log file path |
| **Host Name** | `host.name.keyword` | Filter by container/host |
| **Hostname Tag** | `hostname` | Filter by hostname tag |
| **Log Type** | `cribl_breaker.keyword` | Filter by log type/breaker |

---

## 🚀 Quick Start: Import the Dashboard

### Prerequisites

1. OpenSearch cluster running (version 2.x+)
2. OpenSearch Dashboards accessible
3. PostgreSQL/Patroni logs indexed in `patronidata*` index pattern

### Import Steps

1. Save the NDJSON content below to a file: `postgres-dashboard.ndjson`
2. Open OpenSearch Dashboards
3. Navigate to: **Stack Management → Saved Objects → Import**
4. Upload the file and click **Import**
5. Access the dashboard from **Dashboards** menu

---

## 📦 Complete Dashboard NDJSON

Copy and save this entire block to a file named `postgres-dashboard.ndjson`:

```json
{"id":"patronidata-*","type":"index-pattern","attributes":{"title":"patronidata*","timeFieldName":"@timestamp"},"references":[],"migrationVersion":{"index-pattern":"7.6.0"}}
{"id":"filter-controls","type":"visualization","attributes":{"title":"🔍 Dashboard Filters","visState":"{\"title\":\"Dashboard Filters\",\"type\":\"input_control_vis\",\"params\":{\"controls\":[{\"id\":\"1\",\"indexPattern\":\"patronidata-*\",\"fieldName\":\"source.keyword\",\"parent\":\"\",\"label\":\"Log Source\",\"type\":\"list\",\"options\":{\"type\":\"terms\",\"multiselect\":true,\"dynamicOptions\":true,\"size\":20,\"order\":\"desc\"}},{\"id\":\"2\",\"indexPattern\":\"patronidata-*\",\"fieldName\":\"host.name.keyword\",\"parent\":\"\",\"label\":\"Host Name\",\"type\":\"list\",\"options\":{\"type\":\"terms\",\"multiselect\":true,\"dynamicOptions\":true,\"size\":10,\"order\":\"desc\"}},{\"id\":\"3\",\"indexPattern\":\"patronidata-*\",\"fieldName\":\"hostname\",\"parent\":\"\",\"label\":\"Hostname Tag\",\"type\":\"list\",\"options\":{\"type\":\"terms\",\"multiselect\":true,\"dynamicOptions\":true,\"size\":10,\"order\":\"desc\"}},{\"id\":\"4\",\"indexPattern\":\"patronidata-*\",\"fieldName\":\"cribl_breaker.keyword\",\"parent\":\"\",\"label\":\"Log Type\",\"type\":\"list\",\"options\":{\"type\":\"terms\",\"multiselect\":true,\"dynamicOptions\":true,\"size\":10,\"order\":\"desc\"}}],\"updateFiltersOnChange\":true,\"useTimeFilter\":true,\"pinFilters\":false},\"aggs\":[]}","uiStateJSON":"{}","description":"Filter controls for hostname, log source, and log type","kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[]}"}},"references":[],"migrationVersion":{"visualization":"7.10.0"}}
{"id":"total-log-count","type":"visualization","attributes":{"title":"📊 Total Log Events","visState":"{\"title\":\"Total Log Events\",\"type\":\"metric\",\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Total Events\"}}],\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"colorSchema\":\"Green to Red\",\"metricColorMode\":\"None\",\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":false,\"subText\":\"\",\"fontSize\":60}}}}","uiStateJSON":"{}","description":"","kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[],\"indexRefName\":\"kibanaSavedObjectMeta.searchSourceJSON.index\"}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"patronidata-*"}],"migrationVersion":{"visualization":"7.10.0"}}
{"id":"error-count","type":"visualization","attributes":{"title":"🔴 Error Events","visState":"{\"title\":\"Error Events\",\"type\":\"metric\",\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Errors\"}}],\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"colorSchema\":\"Green to Red\",\"metricColorMode\":\"Background\",\"colorsRange\":[{\"from\":0,\"to\":10},{\"from\":10,\"to\":100},{\"from\":100,\"to\":10000}],\"style\":{\"bgFill\":\"#000\",\"bgColor\":true,\"labelColor\":false,\"subText\":\"Errors detected\",\"fontSize\":60}}}}","uiStateJSON":"{}","description":"","kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"_raw:ERROR OR _raw:error OR _raw:FATAL\",\"language\":\"kuery\"},\"filter\":[],\"indexRefName\":\"kibanaSavedObjectMeta.searchSourceJSON.index\"}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"patronidata-*"}],"migrationVersion":{"visualization":"7.10.0"}}
{"id":"warning-count","type":"visualization","attributes":{"title":"🟡 Warning Events","visState":"{\"title\":\"Warning Events\",\"type\":\"metric\",\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Warnings\"}}],\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"colorSchema\":\"Yellow to Red\",\"metricColorMode\":\"Background\",\"colorsRange\":[{\"from\":0,\"to\":50},{\"from\":50,\"to\":500},{\"from\":500,\"to\":50000}],\"style\":{\"bgFill\":\"#000\",\"bgColor\":true,\"labelColor\":false,\"subText\":\"Warnings detected\",\"fontSize\":60}}}}","uiStateJSON":"{}","description":"","kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"_raw:WARNING OR _raw:WARN\",\"language\":\"kuery\"},\"filter\":[],\"indexRefName\":\"kibanaSavedObjectMeta.searchSourceJSON.index\"}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"patronidata-*"}],"migrationVersion":{"visualization":"7.10.0"}}
{"id":"unique-hosts","type":"visualization","attributes":{"title":"🖥️ Active Sources","visState":"{\"title\":\"Active Sources\",\"type\":\"metric\",\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"cardinality\",\"schema\":\"metric\",\"params\":{\"field\":\"source.keyword\",\"customLabel\":\"Active Sources\"}}],\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"colorSchema\":\"Green to Red\",\"metricColorMode\":\"None\",\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":false,\"subText\":\"Log sources\",\"fontSize\":60}}}}","uiStateJSON":"{}","description":"","kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[],\"indexRefName\":\"kibanaSavedObjectMeta.searchSourceJSON.index\"}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"patronidata-*"}],"migrationVersion":{"visualization":"7.10.0"}}
{"id":"logs-over-time","type":"visualization","attributes":{"title":"📈 Log Volume Over Time","visState":"{\"title\":\"Log Volume Over Time\",\"type\":\"line\",\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Log Count\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"useNormalizedOpenSearchInterval\":true,\"scaleMetricValues\":false,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}}],\"params\":{\"type\":\"line\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"filter\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Log Count\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"line\",\"mode\":\"normal\",\"data\":{\"label\":\"Log Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false,\"thresholdLine\":{\"show\":false,\"value\":10,\"width\":1,\"style\":\"full\",\"color\":\"#E7664C\"}}}","uiStateJSON":"{}","description":"","kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[],\"indexRefName\":\"kibanaSavedObjectMeta.searchSourceJSON.index\"}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"patronidata-*"}],"migrationVersion":{"visualization":"7.10.0"}}
{"id":"logs-by-source-split","type":"visualization","attributes":{"title":"📊 Logs Over Time by Source","visState":"{\"title\":\"Logs Over Time by Source\",\"type\":\"area\",\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Events\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"useNormalizedOpenSearchInterval\":true,\"scaleMetricValues\":false,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"source.keyword\",\"orderBy\":\"1\",\"order\":\"desc\",\"size\":10,\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}],\"params\":{\"type\":\"area\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"filter\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Events\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"area\",\"mode\":\"stacked\",\"data\":{\"label\":\"Events\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true,\"interpolate\":\"linear\"}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false}}","uiStateJSON":"{}","description":"","kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[],\"indexRefName\":\"kibanaSavedObjectMeta.searchSourceJSON.index\"}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"patronidata-*"}],"migrationVersion":{"visualization":"7.10.0"}}
{"id":"logs-by-host","type":"visualization","attributes":{"title":"🏠 Logs by Source","visState":"{\"title\":\"Logs by Source\",\"type\":\"pie\",\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"source.keyword\",\"orderBy\":\"1\",\"order\":\"desc\",\"size\":10,\"otherBucket\":true,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}],\"params\":{\"type\":\"pie\",\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"isDonut\":true,\"labels\":{\"show\":true,\"values\":true,\"last_level\":true,\"truncate\":100}}}","uiStateJSON":"{}","description":"","kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[],\"indexRefName\":\"kibanaSavedObjectMeta.searchSourceJSON.index\"}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"patronidata-*"}],"migrationVersion":{"visualization":"7.10.0"}}
{"id":"patroni-node-comparison","type":"visualization","attributes":{"title":"⚖️ Patroni1 vs Patroni2 Logs","visState":"{\"title\":\"Patroni1 vs Patroni2 Logs\",\"type\":\"histogram\",\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Events\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"useNormalizedOpenSearchInterval\":true,\"scaleMetricValues\":false,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"filters\",\"schema\":\"group\",\"params\":{\"filters\":[{\"input\":{\"query\":\"source.keyword:*patroni1*\",\"language\":\"kuery\"},\"label\":\"Patroni1\"},{\"input\":{\"query\":\"source.keyword:*patroni2*\",\"language\":\"kuery\"},\"label\":\"Patroni2\"},{\"input\":{\"query\":\"source.keyword:*etcd*\",\"language\":\"kuery\"},\"label\":\"etcd\"}]}}],\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"filter\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Events\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Events\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false}}","uiStateJSON":"{}","description":"","kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[],\"indexRefName\":\"kibanaSavedObjectMeta.searchSourceJSON.index\"}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"patronidata-*"}],"migrationVersion":{"visualization":"7.10.0"}}
{"id":"error-types-pie","type":"visualization","attributes":{"title":"⚠️ Log Levels Distribution","visState":"{\"title\":\"Log Levels Distribution\",\"type\":\"pie\",\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"filters\",\"schema\":\"segment\",\"params\":{\"filters\":[{\"input\":{\"query\":\"_raw:ERROR OR _raw:FATAL\",\"language\":\"kuery\"},\"label\":\"🔴 ERRORS\"},{\"input\":{\"query\":\"_raw:WARNING OR _raw:WARN\",\"language\":\"kuery\"},\"label\":\"🟡 WARNINGS\"},{\"input\":{\"query\":\"_raw:LOG\",\"language\":\"kuery\"},\"label\":\"📝 LOG\"},{\"input\":{\"query\":\"_raw:statement\",\"language\":\"kuery\"},\"label\":\"💬 STATEMENTS\"}]}}],\"params\":{\"type\":\"pie\",\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"isDonut\":true,\"labels\":{\"show\":true,\"values\":true,\"last_level\":true,\"truncate\":100}}}","uiStateJSON":"{}","description":"","kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[],\"indexRefName\":\"kibanaSavedObjectMeta.searchSourceJSON.index\"}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"patronidata-*"}],"migrationVersion":{"visualization":"7.10.0"}}
{"id":"source-files-breakdown","type":"visualization","attributes":{"title":"📁 Log Sources Breakdown","visState":"{\"title\":\"Log Sources Breakdown\",\"type\":\"horizontal_bar\",\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Event Count\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"source.keyword\",\"orderBy\":\"1\",\"order\":\"desc\",\"size\":15,\"otherBucket\":true,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}],\"params\":{\"type\":\"horizontal_bar\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"filter\":false,\"truncate\":200,\"rotate\":0},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"BottomAxis-1\",\"type\":\"value\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":true,\"truncate\":100},\"title\":{\"text\":\"Event Count\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"histogram\",\"mode\":\"normal\",\"data\":{\"label\":\"Event Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":false,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false}}","uiStateJSON":"{}","description":"","kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[],\"indexRefName\":\"kibanaSavedObjectMeta.searchSourceJSON.index\"}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"patronidata-*"}],"migrationVersion":{"visualization":"7.10.0"}}
{"id":"errors-over-time","type":"visualization","attributes":{"title":"🔴 Errors & Warnings Over Time","visState":"{\"title\":\"Errors & Warnings Over Time\",\"type\":\"line\",\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Events\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"useNormalizedOpenSearchInterval\":true,\"scaleMetricValues\":false,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"filters\",\"schema\":\"group\",\"params\":{\"filters\":[{\"input\":{\"query\":\"_raw:ERROR OR _raw:FATAL\",\"language\":\"kuery\"},\"label\":\"Errors\"},{\"input\":{\"query\":\"_raw:WARNING OR _raw:WARN\",\"language\":\"kuery\"},\"label\":\"Warnings\"}]}}],\"params\":{\"type\":\"line\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"filter\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Events\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"line\",\"mode\":\"normal\",\"data\":{\"label\":\"Events\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false,\"thresholdLine\":{\"show\":false,\"value\":10,\"width\":1,\"style\":\"full\",\"color\":\"#E7664C\"}}}","uiStateJSON":"{}","description":"","kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[],\"indexRefName\":\"kibanaSavedObjectMeta.searchSourceJSON.index\"}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"patronidata-*"}],"migrationVersion":{"visualization":"7.10.0"}}
{"id":"patroni-saved-search","type":"search","attributes":{"title":"Patroni Log Search","description":"Search for Patroni/PostgreSQL logs","columns":["@timestamp","source","_raw"],"sort":[["@timestamp","desc"]],"kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[],\"indexRefName\":\"kibanaSavedObjectMeta.searchSourceJSON.index\",\"highlightAll\":true,\"version\":true}"}},"references":[{"name":"kibanaSavedObjectMeta.searchSourceJSON.index","type":"index-pattern","id":"patronidata-*"}],"migrationVersion":{"search":"7.9.3"}}
{"id":"postgres-monitoring-dashboard","type":"dashboard","attributes":{"title":"🐘 PostgreSQL & Patroni Monitoring Dashboard","description":"Comprehensive monitoring dashboard for PostgreSQL/Patroni cluster logs with filters","panelsJSON":"[{\"version\":\"2.0.0\",\"gridData\":{\"x\":0,\"y\":0,\"w\":48,\"h\":5,\"i\":\"filter\"},\"panelIndex\":\"filter\",\"embeddableConfig\":{\"hidePanelTitles\":false},\"panelRefName\":\"panel_filter\"},{\"version\":\"2.0.0\",\"gridData\":{\"x\":0,\"y\":5,\"w\":12,\"h\":6,\"i\":\"1\"},\"panelIndex\":\"1\",\"embeddableConfig\":{},\"panelRefName\":\"panel_0\"},{\"version\":\"2.0.0\",\"gridData\":{\"x\":12,\"y\":5,\"w\":12,\"h\":6,\"i\":\"2\"},\"panelIndex\":\"2\",\"embeddableConfig\":{},\"panelRefName\":\"panel_1\"},{\"version\":\"2.0.0\",\"gridData\":{\"x\":24,\"y\":5,\"w\":12,\"h\":6,\"i\":\"3\"},\"panelIndex\":\"3\",\"embeddableConfig\":{},\"panelRefName\":\"panel_2\"},{\"version\":\"2.0.0\",\"gridData\":{\"x\":36,\"y\":5,\"w\":12,\"h\":6,\"i\":\"4\"},\"panelIndex\":\"4\",\"embeddableConfig\":{},\"panelRefName\":\"panel_3\"},{\"version\":\"2.0.0\",\"gridData\":{\"x\":0,\"y\":11,\"w\":24,\"h\":12,\"i\":\"5\"},\"panelIndex\":\"5\",\"embeddableConfig\":{},\"panelRefName\":\"panel_4\"},{\"version\":\"2.0.0\",\"gridData\":{\"x\":24,\"y\":11,\"w\":24,\"h\":12,\"i\":\"6\"},\"panelIndex\":\"6\",\"embeddableConfig\":{},\"panelRefName\":\"panel_5\"},{\"version\":\"2.0.0\",\"gridData\":{\"x\":0,\"y\":23,\"w\":24,\"h\":12,\"i\":\"7\"},\"panelIndex\":\"7\",\"embeddableConfig\":{},\"panelRefName\":\"panel_6\"},{\"version\":\"2.0.0\",\"gridData\":{\"x\":24,\"y\":23,\"w\":24,\"h\":12,\"i\":\"8\"},\"panelIndex\":\"8\",\"embeddableConfig\":{},\"panelRefName\":\"panel_7\"},{\"version\":\"2.0.0\",\"gridData\":{\"x\":0,\"y\":35,\"w\":24,\"h\":12,\"i\":\"9\"},\"panelIndex\":\"9\",\"embeddableConfig\":{},\"panelRefName\":\"panel_8\"},{\"version\":\"2.0.0\",\"gridData\":{\"x\":24,\"y\":35,\"w\":24,\"h\":12,\"i\":\"10\"},\"panelIndex\":\"10\",\"embeddableConfig\":{},\"panelRefName\":\"panel_9\"},{\"version\":\"2.0.0\",\"gridData\":{\"x\":0,\"y\":47,\"w\":48,\"h\":15,\"i\":\"11\"},\"panelIndex\":\"11\",\"embeddableConfig\":{},\"panelRefName\":\"panel_10\"}]","optionsJSON":"{\"useMargins\":true,\"hidePanelTitles\":false}","timeRestore":true,"timeTo":"now","timeFrom":"now-7d","refreshInterval":{"pause":false,"value":30000},"kibanaSavedObjectMeta":{"searchSourceJSON":"{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[]}"}},"references":[{"name":"panel_filter","type":"visualization","id":"filter-controls"},{"name":"panel_0","type":"visualization","id":"total-log-count"},{"name":"panel_1","type":"visualization","id":"error-count"},{"name":"panel_2","type":"visualization","id":"warning-count"},{"name":"panel_3","type":"visualization","id":"unique-hosts"},{"name":"panel_4","type":"visualization","id":"logs-over-time"},{"name":"panel_5","type":"visualization","id":"logs-by-source-split"},{"name":"panel_6","type":"visualization","id":"patroni-node-comparison"},{"name":"panel_7","type":"visualization","id":"errors-over-time"},{"name":"panel_8","type":"visualization","id":"logs-by-host"},{"name":"panel_9","type":"visualization","id":"error-types-pie"},{"name":"panel_10","type":"visualization","id":"source-files-breakdown"}],"migrationVersion":{"dashboard":"7.9.3"}}
```

---

## 🔧 API Import Method

You can also import using curl:

```bash
curl -X POST "http://localhost:15601/api/saved_objects/_import?overwrite=true" \
  -H "osd-xsrf: true" \
  --form file=@postgres-dashboard.ndjson
```

---

## 📐 Index Pattern Requirements

The dashboard expects data with this structure:

```json
{
  "@timestamp": "2026-01-15T02:31:49.000Z",
  "_raw": "2026-01-15 02:31:49 UTC [84]: [4595-1] user=postgres,db=postgres,app=Patroni restapi,client=127.0.0.1, e=00000 LOG: statement: SELECT...",
  "source": "/var/log/patroni2/postgresql-2026-01-15.log",
  "host": {
    "name": "patroni-node-1"
  },
  "hostname": "host-A",
  "cribl_breaker": "fallback"
}
```

### Field Mapping

| Field | Type | Description |
|-------|------|-------------|
| `@timestamp` | date | Log timestamp |
| `_raw` | text | Full log message |
| `source` | keyword | Log file path |
| `host.name` | keyword | Container/host name |
| `hostname` | keyword | Custom hostname tag |
| `cribl_breaker` | keyword | Log type/breaker |

---

## 🐳 Docker Compose for Full Stack

Here's the docker-compose configuration used to run the OpenSearch + PostgreSQL/Patroni stack:

```yaml
services:
  opensearch:
    image: opensearchproject/opensearch:latest
    container_name: opensearch
    environment:
      - discovery.type=single-node
      - OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m
      - OPENSEARCH_INITIAL_ADMIN_PASSWORD=OpenSearch@2024
      - DISABLE_SECURITY_PLUGIN=true
    ports:
      - "19200:9200"
    volumes:
      - ./opensearch-data:/usr/share/opensearch/data

  opensearch-dashboards:
    image: opensearchproject/opensearch-dashboards:latest
    container_name: opensearch-dashboards
    ports:
      - "15601:5601"
    environment:
      - DISABLE_SECURITY_DASHBOARDS_PLUGIN=true
      - OPENSEARCH_HOSTS=["http://opensearch:9200"]
    depends_on:
      - opensearch
```

---

## 🎯 Best Practices

### 1. Set Appropriate Time Ranges
- Use `now-7d` for weekly trends
- Use `now-24h` for daily operations
- Use `now-1h` for real-time troubleshooting

### 2. Create Alerts
Configure OpenSearch alerting for:
- Error count spike > threshold
- No logs received in X minutes
- Specific error patterns (e.g., "FATAL", "connection refused")

### 3. Regular Index Maintenance
```bash
# Check index size
curl -s "http://localhost:19200/_cat/indices/patronidata*?v"

# Set up ILM policies for log rotation
```

---

## 📚 Related Resources

- [OpenSearch Documentation](https://opensearch.org/docs/latest/)
- [Patroni Documentation](https://patroni.readthedocs.io/)
- [PostgreSQL Logging](https://www.postgresql.org/docs/current/runtime-config-logging.html)

---

*This dashboard was created as part of my PostgreSQL/Patroni cluster monitoring setup. It provides essential visibility into cluster health and helps with rapid troubleshooting.*

*Questions or improvements? Connect with me on [LinkedIn](https://www.linkedin.com/in/anish-karki-dba/) or [email](mailto:anish.karki1.618@outlook.com).*
