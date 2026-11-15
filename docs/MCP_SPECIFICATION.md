# Model Context Protocol (MCP) Specification for FraudTrace

FraudTrace implements the official Model Context Protocol (MCP) using the Python MCP SDK (`mcp.server.mcpserver`). This enables any compatible AI client (Claude Desktop, Cursor, Gemini Live Agents) to interact directly with the forensic database.

## 🛠️ Registered Tools

### 1. `get_transaction`
- **Description:** Retrieve transaction details, execution channel, user ID, amount, city, timestamp, status, merchant, and existing risk assessment.
- **Parameters:**
  ```json
  {
    "transaction_id": {
      "type": "string",
      "description": "Transaction identifier (e.g., TXN-9FA8123B)"
    }
  }
  ```

### 2. `get_customer_history`
- **Description:** Examine customer profile, typical spend limits, preferred channel, and past transaction statistical distribution (mean, standard deviation, median).
- **Parameters:**
  ```json
  {
    "user_id": {
      "type": "string",
      "description": "Customer identifier (e.g., USR-1025)"
    }
  }
  ```

### 3. `detect_anomalies`
- **Description:** Retrieve Isolation Forest anomaly score, feature deviations, and explainable model splits.
- **Parameters:**
  ```json
  {
    "transaction_id": {
      "type": "string",
      "description": "Transaction identifier"
    }
  }
  ```

### 4. `find_related_transactions`
- **Description:** Identify related unusual transactions, velocity bursts, rapid cross-city hops, and merchant clusters within a given time window.
- **Parameters:**
  ```json
  {
    "transaction_id": {
      "type": "string",
      "description": "Transaction identifier"
    },
    "window_hours": {
      "type": "integer",
      "description": "Observation window in hours (default: 24)"
    }
  }
  ```

### 5. `calculate_risk`
- **Description:** Calculate an explainable multi-factor risk assessment combining ML anomaly score, baseline deviation, and velocity.
- **Parameters:**
  ```json
  {
    "transaction_id": {
      "type": "string",
      "description": "Transaction identifier"
    }
  }
  ```

### 6. `generate_investigation_report`
- **Description:** Synthesize a structured SAR-ready investigation report with observations, evidence, and recommendations.
- **Parameters:**
  ```json
  {
    "transaction_id": {
      "type": "string",
      "description": "Transaction identifier"
    }
  }
  ```

## 🔌 Connecting to Claude Desktop / Cursor
Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fraudtrace": {
      "command": "python",
      "args": ["-m", "backend.app.mcp.server"],
      "cwd": "C:\\FraudTrace",
      "env": {
        "PYTHONPATH": "C:\\FraudTrace"
      }
    }
  }
}
```
