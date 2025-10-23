```markdown
# SSH Authentication Log Aggregator & SIEM API

## 🧩 Overview
This project demonstrates an end-to-end **Security Information and Event Management (SIEM) data pipeline** for SSH login failure aggregation and centralized storage.

It consists of:

| Component | Technology | Description |
|------------|-------------|-------------|
| **Log Aggregator** | Python 3 | Parses `/var/log/auth.log` or `.gz` files, aggregates failed SSH login attempts by host and source IP, enriches with asset metadata, and optionally pushes results to the API |
| **Web API** | Node.js + Express + LowDB | Receives aggregated SSH failure events, authenticates via Bearer token, and stores them in a local JSON database (`db.json`) |
| **Web UI** | Static HTML/JS (`index.html`) | Interactive API documentation and “Try It Now” console for testing both `/v1/data` and `/v1/ssh-failures` endpoints directly from the browser |

This setup can form the foundation of a lightweight **SIEM data collector** or serve as a teaching example for secure API ingestion, low-latency event handling, and enrichment workflows.

---

## 🏗️ Project Structure

```

.
├── ssh_auth_agg.py          # Python log aggregator + optional POST to API
├── assets.csv               # Optional asset inventory metadata
├── db.json                  # LowDB local datastore (auto-created)
├── webserver.js             # Node.js Express API + LowDB backend
├── index.html               # API documentation and test UI
├── package.json             # Node dependencies ("type": "module" enabled)
└── README.md

````

---

## ⚙️ 1. Setup Instructions

### 🐍 Python Aggregator

Install dependencies:
```bash
python3 -m venv venv
source venv/bin/activate
pip install requests
````

Run help:

```bash
python ssh_auth_agg.py -h
```

Example usage:

```bash
# Aggregate from auth.log and push to API
export SSH_API_URL="http://localhost:8080/v1/ssh-failures"
export SSH_API_TOKEN="mysecrettoken123"

python ssh_auth_agg.py \
  --input /var/log/auth.log \
  --assets assets.csv \
  --out ssh_failed_agg.jsonl \
  --window 5
```

To batch-post all events in one request:

```bash
python ssh_auth_agg.py \
  --input /var/log/auth.log \
  --out ssh_failed_agg.jsonl \
  --batch
```

Outputs:

* `ssh_failed_agg.jsonl` → aggregated results
* `ssh_failed_agg.dlq.jsonl` → (optional) dead-letter queue for failed API posts

Each JSON record includes:

```json
{
  "event_type": "ssh_failed_agg",
  "host": "web01",
  "src_ip": "203.0.113.5",
  "fail_count": 4,
  "window_start": "2025-10-23T09:25:00Z",
  "window_end": "2025-10-23T09:30:00Z",
  "threshold": 5,
  "alert": false,
  "asset": {
    "hostname": "web01",
    "ip": "10.0.0.10",
    "env": "prod",
    "owner": "platform",
    "function": "frontend",
    "criticality": 4
  }
}
```

---

### 🟩 Node.js API Server

Install dependencies:

```bash
npm install express lowdb cors
```

Run the API:

```bash
export SSH_API_TOKEN="mysecrettoken123"
node webserver.js
```

Server will start at:

```
http://localhost:8080
```

#### ✅ Endpoints

| Method | Path                        | Description                                  | Auth | Example                                                               |
| ------ | --------------------------- | -------------------------------------------- | ---- | --------------------------------------------------------------------- |
| `GET`  | `/v1/data`                  | Test endpoint showing latest sample payloads | 🔒   | `curl -H "Authorization: Bearer TOKEN" http://localhost:8080/v1/data` |
| `POST` | `/v1/data`                  | Stores arbitrary JSON payloads               | 🔒   | `curl -X POST -d '{"test":1}' -H "Authorization: Bearer TOKEN" ...`   |
| `GET`  | `/v1/ssh-failures?limit=10` | Returns last N aggregated SSH failure events | 🔒   | —                                                                     |
| `POST` | `/v1/ssh-failures`          | Accepts one or multiple aggregated records   | 🔒   | `curl -X POST -d @ssh_failed_agg.jsonl ...`                           |

All endpoints require the header:

```
Authorization: Bearer mysecrettoken123
```

and accept optional:

```
Idempotency-Key: <hash>
```

for duplicate suppression.

---

### 🌐 Web UI (Interactive API Docs)

Simply open `index.html` in a browser:

```
file:///.../index.html
```

or visit:

```
http://localhost:8080/
```

From here you can:

* Enter your Bearer token once
* Test `GET`/`POST` to `/v1/data`
* Test single and batch `POST` to `/v1/ssh-failures`
* View JSON responses directly in the browser

---

## 🧪 Example Workflow

1. **Collect Logs**

   * Copy `/var/log/auth.log` from a Linux host (or use a sample)
2. **Aggregate**

   * Run `ssh_auth_agg.py` to summarise failed logins per host/IP window
3. **Push to API**

   * Aggregator POSTs JSON events to `/v1/ssh-failures`
4. **Visualise / Query**

   * Use `/v1/ssh-failures?limit=20` or open `index.html` to view stored data

---

## 🔐 Security Notes

* **Authentication:** Bearer token required for all API routes
* **Idempotency:** Each record includes an optional idempotency hash to avoid duplicate inserts
* **Local persistence:** Data is stored in `db.json` (LowDB JSON file) — no external DB required
* **CORS:** Enabled for browser testing; disable or restrict origins in production

---

## 🧰 Troubleshooting

| Symptom                              | Cause                                      | Fix                                                                                             |
| ------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `422: timestamp and src_ip required` | Old schema from Python missing `timestamp` | Add `"timestamp": win_start.isoformat()` in event or update Node route to accept `window_start` |
| `403: Invalid token`                 | Wrong Bearer token                         | Use the same `SSH_API_TOKEN` in Python and Node                                                 |
| API unresponsive                     | Node not running                           | Start `node webserver.js`                                                                       |
| `requests` ImportError               | Python missing dependency                  | Run `pip install requests`                                                                      |

---

## 🧾 License

MIT License – free for education and research use.

---

## 👨‍💻 Author

**Warren Earle**
Solent University · Cybersecurity & Network Engineering

This project is part of a research and teaching initiative exploring **log aggregation, SIEM pipelines, and automated threat detection** using Python, Node.js, and LowDB.

```

---

Would you like me to include a **diagram** (e.g. showing the data flow from `auth.log → Python → API → LowDB → Browser`)?  
I can add an ASCII or Mermaid diagram section for visual clarity in the README.
```
