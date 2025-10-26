# 🚀 Feature List – Automated Log Monitoring System

## 🧩 Core Features

### 1. **SSH Authentication Log Aggregation**
- Parses `/var/log/auth.log` (including `.gz` files) for SSH events.  
- Detects **“Failed password”** and **“Invalid user”** entries.  
- Extracts fields: `timestamp`, `hostname`, `src_ip`, and `username`.  
- Aggregates counts by `(host, src_ip, time_window)` for efficient analysis.  
- Supports **custom aggregation window** (default: `5 minutes`).

### 2. **Asset Metadata Enrichment (CMDB Integration)**
- Uses **SQLite-based CMDB** (`cmdb.py`) with tables:
  - `assets` → hostname, environment, owner, function, criticality, lifecycle  
  - `asset_ips` → IP mapping (supports primary IP)
- **Upsert logic** ensures idempotent asset updates.  
- Exports assets to CSV (`assets.csv`) for external enrichment.  
- Links event data with CMDB attributes for full context:
  - `env`, `owner`, `function`, `criticality`, and `lifecycle`.

### 3. **Dynamic Thresholding & Alerting**
- Thresholds automatically adapt to **asset criticality**:  
  - `criticality=5` → threshold = 3 failures  
  - `criticality=4` → threshold = 5  
  - `criticality=3` → threshold = 8  
  - Default → 10  
- Each event is tagged with an `"alert": true` flag when threshold exceeded.  
- Enables prioritised alerting for critical infrastructure.

### 4. **API Integration (Node.js / Express)**
- REST API endpoint: **`/v1/ssh-failures`**  
  - Accepts JSON or JSON arrays of aggregated events.  
  - Supports `Idempotency-Key` header to prevent duplicates.  
  - Enforces bearer token auth (`Authorization: Bearer <token>`).  
- Data persisted in **LowDB (db.json)** for simplicity and transparency.  
- API endpoints:
  - `POST /v1/ssh-failures` → store aggregated event(s)
  - `GET /v1/ssh-failures?limit=100` → retrieve recent events
  - `GET /v1/data` → return generic payloads (legacy support)

### 5. **Web Dashboard & Visualisation**
- Browser-based dashboard (`index.html`) with Chart.js visualisations:
  - **Time-series chart:** failed SSH attempts over time.
  - **Top Source IPs bar chart:** most frequent offenders.
  - **Alert Rate by Criticality (stacked bar):** alert proportion per asset group.  
- Displays **alert trends, anomaly rates, and top offenders** visually.  
- Auto-refresh or manual reload options available.

---

## 🔧 Operational & Developer Features

- **Command-Line Support:**  
  - `ssh_auth_agg_api.py` supports flexible CLI options:
    ```bash
    python ssh_auth_agg_api.py --input auth.log --assets assets.csv         --out out.jsonl --window 10 --api-url http://localhost:8080/v1/ssh-failures         --api-token mysecrettoken123 --batch
    ```
- **Resilient API Posting:**  
  - Retries with exponential backoff.  
  - Dead-letter queue file (`ssh_failed_agg.dlq.jsonl`) for failed transmissions.
- **Idempotency:**  
  - Consistent hash generation using SHA-256 on core fields.  
  - Prevents duplicate ingestion during replay or retries.
- **Batch Mode Support:**  
  - Option to send bulk events in one array POST for performance.

---

## 🌱 Planned / Future Developments

### 1. **Enhanced Criticality & Environment Mapping**
- Introduce **per-environment thresholds**:
  - e.g., `prod` stricter (3 failures), `dev` more lenient (10 failures).  
- Implement **time-based sensitivity**:
  - Lower thresholds during **off-hours or weekends**.  
- Add **allow-list CIDRs** (e.g., known admin IPs) to suppress noise.  
- Extend CMDB schema to include:
  - `business_unit`, `support_hours`, `geo_region`, `allowlist_cidrs`.

### 2. **Advanced Analytics & Dashboards**
- Add **“failed login heatmap”** by hour of day and IP range.  
- **Anomaly detection layer** using rolling mean + standard deviation.  
- Implement **trend analysis widgets** (daily/weekly comparisons).  
- Export visualisations to PDF / JSON reports for SOC review.

### 3. **API and Data Persistence Enhancements**
- Extend API with `/v1/stats` endpoint:
  - Metrics: total events, alert rate, top hosts, ingestion latency.  
- Replace LowDB with **SQLite or MongoDB** for scalability.  
- Add WebSocket endpoint for **real-time alert streaming** to dashboard.  
- Introduce **multi-tenant API tokens** with scoped permissions.

### 4. **Automation & Deployment**
- Provide **Docker Compose** stack for local deployment:
  - `python-preprocessor`, `node-api`, `sqlite-db`, and `web-ui`.  
- Add GitHub Actions CI/CD pipeline to test and publish containers.  
- Integrate **Prometheus metrics exporter** for system health.

### 5. **Integration with SIEM / SOAR**
- Send alert events to **Wazuh**, **QRadar**, or **TheHive** via webhook.  
- Support **reverse enforcement webhook**:  
  - Auto-block IPs after repeated brute-force detection.  
- Add enrichment via **threat intelligence feeds** (MISP/STIX).  

### 6. **Synthetic Data & Simulation Enhancements**
- Expand test data generator:
  - Multi-day, multi-host, randomised time shifts.  
  - Simulated log noise (benign and malicious).  
- Parameterise generation for teaching labs:
  - Adjustable number of assets, time range, and event rate.

---

## 📦 Summary of Key Components

| Component | Language | Purpose |
|------------|-----------|----------|
| `cmdb.py` | Python + SQLite | Asset inventory and export to CSV |
| `ssh_auth_agg_api.py` | Python | Log aggregation, enrichment, alerting, API posting |
| `webServerESM.js` | Node.js (ESM) | REST API receiver, authentication, storage |
| `index.html` | JavaScript (Chart.js) | Data visualisation and analytics dashboard |
| `auth.log` | Syslog sample | Realistic multi-day SSH activity log for testing |
