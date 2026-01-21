"""
AI Agent Actions
================
Defines available actions for each agent and their execution logic.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


class ActionType(Enum):
    """Types of actions that require different handling."""
    READ = "read"           # GET operations - no confirmation needed
    WRITE = "write"         # POST/PUT operations - no confirmation needed
    DELETE = "delete"       # DELETE operations - confirmation required


@dataclass
class ActionDefinition:
    """Definition of an AI agent action."""
    name: str
    action_type: ActionType
    required_params: List[str]
    optional_params: List[str]
    endpoint: Optional[str] = None
    handler: Optional[str] = None
    requires_confirmation: bool = False
    description: str = ""


# ============================================
# FEE AGENT ACTIONS
# ============================================
FEE_ACTIONS: Dict[str, ActionDefinition] = {
    "CREATE_MONTHLY_FEES": ActionDefinition(
        name="CREATE_MONTHLY_FEES",
        action_type=ActionType.WRITE,
        required_params=["month"],  # school_id OR school_name required
        optional_params=["school_id", "school_name", "force_overwrite"],
        endpoint="/api/fees/create/",
        requires_confirmation=False,
        description="Create fee records for all students in a school - can use school_id OR school_name"
    ),
    "CREATE_FEES_ALL_SCHOOLS": ActionDefinition(
        name="CREATE_FEES_ALL_SCHOOLS",
        action_type=ActionType.WRITE,
        required_params=["month"],
        optional_params=["force_overwrite"],
        handler="create_fees_all_schools",
        requires_confirmation=False,
        description="Create fee records for all students across ALL schools"
    ),
    "CREATE_SINGLE_FEE": ActionDefinition(
        name="CREATE_SINGLE_FEE",
        action_type=ActionType.WRITE,
        required_params=["student_id", "month"],
        optional_params=["paid_amount", "total_fee"],
        endpoint="/api/fees/create-single/",
        requires_confirmation=False,
        description="Create fee record for one student"
    ),
    "UPDATE_FEE": ActionDefinition(
        name="UPDATE_FEE",
        action_type=ActionType.WRITE,
        required_params=[],  # paid_amount OR date_received OR total_fee required
        optional_params=["fee_id", "student_name", "student_id", "class", "school_id", "school_name", "month", "paid_amount", "total_fee", "date_received"],
        endpoint="/api/fees/update/",
        requires_confirmation=False,
        description="Update fee payment, date received, or total amount - can use fee_id OR student_name+class/school to find fee"
    ),
    "DELETE_FEES": ActionDefinition(
        name="DELETE_FEES",
        action_type=ActionType.DELETE,
        required_params=["fee_ids"],
        optional_params=[],
        endpoint="/api/fees/delete/",
        requires_confirmation=True,  # Requires confirmation modal
        description="Delete fee records"
    ),
    "GET_FEES": ActionDefinition(
        name="GET_FEES",
        action_type=ActionType.READ,
        required_params=["month"],
        optional_params=["school_id", "school_name", "status", "class"],
        endpoint="/api/fees/",
        requires_confirmation=False,
        description="Query fee records for a specific month"
    ),
    "GET_FEE_SUMMARY": ActionDefinition(
        name="GET_FEE_SUMMARY",
        action_type=ActionType.READ,
        required_params=["month"],
        optional_params=["school_id", "school_name"],
        endpoint="/api/fee-summary/",
        requires_confirmation=False,
        description="Get fee collection summary for a specific month (optionally filtered by school)"
    ),
    "GET_SCHOOLS_WITHOUT_FEES": ActionDefinition(
        name="GET_SCHOOLS_WITHOUT_FEES",
        action_type=ActionType.READ,
        required_params=["month"],
        optional_params=[],
        handler="get_schools_without_fees",
        requires_confirmation=False,
        description="Get list of schools that don't have fee records for a specific month"
    ),
    "CREATE_MISSING_FEES": ActionDefinition(
        name="CREATE_MISSING_FEES",
        action_type=ActionType.WRITE,
        required_params=["month"],
        optional_params=["school_id", "school_name"],
        handler="create_missing_fees",
        requires_confirmation=False,
        description="Create fees for schools without fee records AND for students added after monthly fees were created"
    ),
    "CREATE_FEES_MULTIPLE_SCHOOLS": ActionDefinition(
        name="CREATE_FEES_MULTIPLE_SCHOOLS",
        action_type=ActionType.WRITE,
        required_params=["month", "school_names"],
        optional_params=[],
        handler="create_fees_multiple_schools",
        requires_confirmation=False,
        description="Create fees for multiple specific schools by name"
    ),
    "GET_RECOVERY_REPORT": ActionDefinition(
        name="GET_RECOVERY_REPORT",
        action_type=ActionType.READ,
        required_params=["month"],
        optional_params=[],
        handler="get_recovery_report",
        requires_confirmation=False,
        description="Get fee recovery rate report for all schools for a specific month"
    ),
    "BULK_UPDATE_FEES": ActionDefinition(
        name="BULK_UPDATE_FEES",
        action_type=ActionType.WRITE,
        required_params=[],  # Either fee_ids OR filter criteria required
        optional_params=["fee_ids", "school_id", "school_name", "class", "month", "status", "paid_amount"],
        handler="bulk_update_fees",
        requires_confirmation=False,
        description="Update multiple fee records at once"
    ),
}

# ============================================
# INVENTORY AGENT ACTIONS
# ============================================
INVENTORY_ACTIONS: Dict[str, ActionDefinition] = {
    "GET_ITEMS": ActionDefinition(
        name="GET_ITEMS",
        action_type=ActionType.READ,
        required_params=[],
        optional_params=["category", "status", "school_id", "search", "location"],
        endpoint="/api/inventory/items/",
        requires_confirmation=False,
        description="Query inventory items"
    ),
    "GET_SUMMARY": ActionDefinition(
        name="GET_SUMMARY",
        action_type=ActionType.READ,
        required_params=[],
        optional_params=["school_id"],
        endpoint="/api/inventory/summary/",
        requires_confirmation=False,
        description="Get inventory summary"
    ),
    "UPDATE_ITEM_STATUS": ActionDefinition(
        name="UPDATE_ITEM_STATUS",
        action_type=ActionType.WRITE,
        required_params=["item_id", "status"],
        optional_params=[],
        endpoint="/api/inventory/items/{item_id}/",
        requires_confirmation=False,
        description="Update item status"
    ),
    "DELETE_ITEM": ActionDefinition(
        name="DELETE_ITEM",
        action_type=ActionType.DELETE,
        required_params=["item_id"],
        optional_params=[],
        endpoint="/api/inventory/items/{item_id}/",
        requires_confirmation=True,
        description="Delete inventory item"
    ),
    "BULK_DELETE_ITEMS": ActionDefinition(
        name="BULK_DELETE_ITEMS",
        action_type=ActionType.DELETE,
        required_params=["item_ids"],
        optional_params=[],
        endpoint="/api/inventory/items/bulk-delete/",
        requires_confirmation=True,
        description="Delete multiple inventory items"
    ),
}

# ============================================
# HR AGENT ACTIONS
# ============================================
HR_ACTIONS: Dict[str, ActionDefinition] = {
    "MARK_ATTENDANCE": ActionDefinition(
        name="MARK_ATTENDANCE",
        action_type=ActionType.WRITE,
        required_params=["staff_id", "status"],
        optional_params=["date", "notes"],
        endpoint="/api/commands/staff-attendance/",
        requires_confirmation=False,
        description="Mark staff attendance"
    ),
    "GET_ATTENDANCE": ActionDefinition(
        name="GET_ATTENDANCE",
        action_type=ActionType.READ,
        required_params=[],
        optional_params=["date", "status", "school_id", "staff_id"],
        endpoint="/api/commands/staff-attendance/",
        requires_confirmation=False,
        description="Query attendance records"
    ),
    "GET_ABSENT_TODAY": ActionDefinition(
        name="GET_ABSENT_TODAY",
        action_type=ActionType.READ,
        required_params=[],
        optional_params=[],
        endpoint="/api/commands/staff-attendance/today/",
        requires_confirmation=False,
        description="Get today's absent staff"
    ),
    "DELETE_ATTENDANCE": ActionDefinition(
        name="DELETE_ATTENDANCE",
        action_type=ActionType.DELETE,
        required_params=["attendance_id"],
        optional_params=[],
        endpoint="/api/commands/staff-attendance/{attendance_id}/",
        requires_confirmation=True,
        description="Delete attendance record"
    ),
}

# ============================================
# BROADCAST AGENT ACTIONS
# ============================================
BROADCAST_ACTIONS: Dict[str, ActionDefinition] = {
    "SEND_TO_CLASS_PARENTS": ActionDefinition(
        name="SEND_TO_CLASS_PARENTS",
        action_type=ActionType.WRITE,
        required_params=["class", "message"],
        optional_params=["school_id"],
        handler="broadcast_to_class_parents",
        requires_confirmation=False,
        description="Send notification to class parents"
    ),
    "SEND_TO_ALL_PARENTS": ActionDefinition(
        name="SEND_TO_ALL_PARENTS",
        action_type=ActionType.WRITE,
        required_params=["message"],
        optional_params=["school_id"],
        handler="broadcast_to_school_parents",
        requires_confirmation=False,
        description="Send notification to all parents"
    ),
    "SEND_TO_TEACHERS": ActionDefinition(
        name="SEND_TO_TEACHERS",
        action_type=ActionType.WRITE,
        required_params=["message"],
        optional_params=["school_id"],
        handler="broadcast_to_school_teachers",
        requires_confirmation=False,
        description="Send notification to teachers"
    ),
}

# ============================================
# SPECIAL ACTIONS (All Agents)
# ============================================
SPECIAL_ACTIONS: Dict[str, ActionDefinition] = {
    "CLARIFY": ActionDefinition(
        name="CLARIFY",
        action_type=ActionType.READ,
        required_params=["message"],
        optional_params=[],
        requires_confirmation=False,
        description="Request clarification from user"
    ),
    "UNSUPPORTED": ActionDefinition(
        name="UNSUPPORTED",
        action_type=ActionType.READ,
        required_params=["message"],
        optional_params=[],
        requires_confirmation=False,
        description="Indicate unsupported request"
    ),
}

# ============================================
# AGENT ACTION REGISTRY
# ============================================
AGENT_ACTIONS = {
    "fee": {**FEE_ACTIONS, **SPECIAL_ACTIONS},
    "inventory": {**INVENTORY_ACTIONS, **SPECIAL_ACTIONS},
    "hr": {**HR_ACTIONS, **SPECIAL_ACTIONS},
    "broadcast": {**BROADCAST_ACTIONS, **SPECIAL_ACTIONS},
}


def get_action_definition(agent: str, action_name: str) -> Optional[ActionDefinition]:
    """
    Get action definition for an agent.

    Args:
        agent: Agent name ("fee", "inventory", "hr", "broadcast")
        action_name: Action name (e.g., "CREATE_MONTHLY_FEES")

    Returns:
        ActionDefinition or None if not found
    """
    agent_actions = AGENT_ACTIONS.get(agent.lower(), {})
    return agent_actions.get(action_name)


def validate_action_params(action_def: ActionDefinition, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate that required parameters are present.

    Args:
        action_def: Action definition
        params: Parameters from LLM output

    Returns:
        {
            "valid": bool,
            "missing_params": list,
            "unknown_params": list
        }
    """
    missing = []
    for req_param in action_def.required_params:
        if req_param not in params or params[req_param] is None:
            missing.append(req_param)

    all_known = set(action_def.required_params + action_def.optional_params + ['action'])
    unknown = [k for k in params.keys() if k not in all_known]

    return {
        "valid": len(missing) == 0,
        "missing_params": missing,
        "unknown_params": unknown
    }


def is_delete_action(action_def: ActionDefinition) -> bool:
    """Check if action requires confirmation (delete operations)."""
    return action_def.action_type == ActionType.DELETE or action_def.requires_confirmation
