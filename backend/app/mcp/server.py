"""
FraudTrace MCP Server.
Exposes financial investigation tools over the standardized Model Context Protocol.
Can be connected to Claude Desktop, Gemini Agents, Cursor, or any MCP client.
"""

import sys
import asyncio
from mcp.server.mcpserver import MCPServer
from backend.app.mcp.tools import (
    get_transaction,
    get_customer_history,
    detect_anomalies,
    find_related_transactions,
    calculate_risk,
    generate_investigation_report
)

mcp = MCPServer("FraudTrace-Investigation-MCP")


@mcp.tool()
def mcp_get_transaction(transaction_id: str) -> str:
    """Retrieve transaction details, current status, and risk assessment."""
    import json
    return json.dumps(get_transaction(transaction_id), indent=2)


@mcp.tool()
def mcp_get_customer_history(user_id: str) -> str:
    """Examine customer profile, baseline metrics, and transaction history."""
    import json
    return json.dumps(get_customer_history(user_id), indent=2)


@mcp.tool()
def mcp_detect_anomalies(transaction_id: str) -> str:
    """Run/fetch Isolation Forest anomaly score and feature deviations."""
    import json
    return json.dumps(detect_anomalies(transaction_id), indent=2)


@mcp.tool()
def mcp_find_related_transactions(transaction_id: str, window_hours: int = 24) -> str:
    """Identify related transactions, bursts, and location hops within time window."""
    import json
    return json.dumps(find_related_transactions(transaction_id, window_hours), indent=2)


@mcp.tool()
def mcp_calculate_risk(transaction_id: str) -> str:
    """Calculate an explainable multi-factor risk score."""
    import json
    return json.dumps(calculate_risk(transaction_id), indent=2)


@mcp.tool()
def mcp_generate_investigation_report(transaction_id: str) -> str:
    """Synthesize a complete evidence-based investigation report."""
    import json
    return json.dumps(generate_investigation_report(transaction_id), indent=2)


if __name__ == "__main__":
    print("Starting FraudTrace MCP Server...", file=sys.stderr)
    mcp.run()
