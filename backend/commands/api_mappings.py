"""
API Mappings for Staff Commands

Maps parsed intents to existing API endpoints.
The command executor uses this to call existing APIs internally.

IMPORTANT: These mappings reflect the actual API structure:
- Inventory: /api/inventory/items/ with filters (category, status, location, school, search)
- Inventory Summary: /api/inventory/summary/
- Notifications: /employees/notifications/send-to-all/
- Fees: /api/fees/ and /api/fee-summary/
- Teachers: /employees/teachers/
"""

API_MAPPINGS = {
    # ==================== INVENTORY ====================

    # Query inventory items with filters
    "inventory.query.items": {
        "endpoint": "/api/inventory/items/",
        "method": "GET",
        "param_mapping": {
            "category": "category",         # category ID
            "category_name": "category",    # Will need validation to get ID
            "status": "status",             # Available, Assigned, Damaged, Lost, Disposed
            "location": "location",         # School, Headquarters, Unassigned
            "school_id": "school",          # school ID
            "search": "search",             # search in name, unique_id, description
        },
        "success_template": "Found {count} inventory item(s).",
        "empty_template": "No items found matching your criteria.",
        "response_key": "results",
    },

    # Query by category (same endpoint, just expects category filter)
    "inventory.query.category": {
        "endpoint": "/api/inventory/items/",
        "method": "GET",
        "param_mapping": {
            "category": "category",
            "status": "status",
            "location": "location",
            "school_id": "school",
        },
        "success_template": "Found {count} item(s) in {category_name} category.",
        "empty_template": "No items found in this category.",
        "response_key": "results",
    },

    # Get inventory summary/statistics
    "inventory.query.summary": {
        "endpoint": "/api/inventory/summary/",
        "method": "GET",
        "param_mapping": {
            "school_id": "school",
            "location": "location",
        },
        "success_template": "Inventory Summary: {total} total items (Value: ₹{total_value:,.0f})",
        "response_formatter": "inventory_summary",
    },

    # Find specific item by unique_id or search
    "inventory.query.find": {
        "endpoint": "/api/inventory/items/",
        "method": "GET",
        "param_mapping": {
            "unique_id": "search",
            "search": "search",
        },
        "success_template": "Found {count} matching item(s).",
        "empty_template": "Item not found.",
        "response_key": "results",
    },

    # Update item status (requires item ID)
    "inventory.update.status": {
        "endpoint": "/api/inventory/items/{item_id}/",
        "method": "PATCH",
        "param_mapping": {
            "status": "status",
        },
        "required_entities": ["item_id", "status"],
        "success_template": "Item status updated to '{status}'.",
        "requires_confirmation": True,
    },

    # Assign item to user
    "inventory.assign": {
        "handler": "assign_inventory_item",
        "required_entities": ["item_id", "user_id"],
        "success_template": "Item assigned to {user_name}.",
    },

    # Transfer item between locations
    "inventory.transfer": {
        "handler": "transfer_inventory_item",
        "required_entities": ["item_id", "location"],
        "success_template": "Item transferred to {location}.",
    },

    # Request procurement (creates notification to admins)
    "inventory.request": {
        "handler": "procurement_request",
        "required_entities": ["item_name", "quantity"],
        "success_template": "Procurement request sent for {quantity} {item_name}.",
    },

    # ==================== BROADCAST ====================

    "broadcast.parents.class": {
        "handler": "broadcast_to_class_parents",
        "required_entities": ["class", "message"],
        "success_template": "Notification sent to {count} parents of Class {class}.",
    },

    "broadcast.parents.school": {
        "handler": "broadcast_to_school_parents",
        "required_entities": ["message"],
        "success_template": "Notification sent to {count} parents.",
    },

    "broadcast.teachers.all": {
        "endpoint": "/employees/notifications/send-to-all/",
        "method": "POST",
        "param_mapping": {
            "message": "message",
        },
        "default_params": {
            "title": "Announcement",
            "notification_type": "info",
        },
        "success_template": "Message sent to all teachers.",
    },

    "broadcast.teachers.school": {
        "handler": "broadcast_to_school_teachers",
        "required_entities": ["message"],
        "success_template": "Message sent to {count} teachers at {school_name}.",
    },

    "broadcast.student": {
        "handler": "broadcast_to_student",
        "required_entities": ["message"],
        "success_template": "Message sent to student.",
    },

    # ==================== FINANCE ====================

    "finance.invoice.generate": {
        "handler": "generate_invoice",
        "required_entities": ["school_id"],
        "success_template": "Invoice generated for {school_name} - {month}.",
    },

    "finance.invoice.send": {
        "handler": "send_invoice",
        "required_entities": ["email"],
        "success_template": "Invoice sent to {email}.",
    },

    "finance.fee.summary": {
        "endpoint": "/api/fee-summary/",
        "method": "GET",
        "param_mapping": {
            "month": "month",
            "school_id": "school",
        },
        "success_template": "Fee Summary - Collected: ₹{total_received:,.2f}, Pending: ₹{total_pending:,.2f}",
    },

    "finance.fee.pending": {
        "endpoint": "/api/fees/",
        "method": "GET",
        "param_mapping": {
            "class": "student__student_class__icontains",
            "school_id": "student__school",
        },
        "default_params": {
            "status__in": "Pending,Overdue",
        },
        "success_template": "Found {count} pending fee(s) totaling ₹{total:,.2f}.",
        "empty_template": "No pending fees found.",
        "response_key": "results",
        "aggregate": {
            "total": "balance_due",  # Sum this field
        },
    },

    "finance.expense.summary": {
        "endpoint": "/api/finance-summary/",
        "method": "GET",
        "param_mapping": {
            "month": "month",
        },
        "success_template": "Expense Summary - Total Expenses: ₹{total_expense:,.2f}",
    },

    # ==================== HR ====================

    "hr.attendance.mark": {
        "handler": "mark_staff_attendance",
        "required_entities": ["staff_id", "status"],
        "success_template": "{staff_name} marked as {status} for {date}.",
    },

    "hr.attendance.query": {
        "handler": "query_staff_attendance",
        "success_template": "{count} staff member(s) {status_filter} on {date}.",
    },

    "hr.attendance.report": {
        "handler": "staff_attendance_report",
        "success_template": "Attendance report generated for {period}.",
    },

    "hr.substitute.assign": {
        "handler": "assign_substitute",
        "required_entities": ["staff_id", "substitute_id"],
        "success_template": "{substitute_name} assigned as substitute for {staff_name}.",
    },

    "hr.substitute.suggest": {
        "handler": "suggest_substitutes",
        "success_template": "Found {count} available teacher(s) for substitution.",
    },

    "hr.staff.list": {
        "endpoint": "/employees/teachers/",
        "method": "GET",
        "param_mapping": {
            "school_id": "assigned_schools",
        },
        "success_template": "Found {count} staff member(s).",
        "response_key": "results",
    },
}


def get_mapping(intent: str) -> dict:
    """
    Get API mapping for an intent.

    Args:
        intent: Intent string (e.g., "inventory.query.items")

    Returns:
        Mapping dict or empty dict if not found
    """
    return API_MAPPINGS.get(intent, {})


def get_required_entities(intent: str) -> list:
    """
    Get list of required entities for an intent.

    Args:
        intent: Intent string

    Returns:
        List of required entity names
    """
    mapping = get_mapping(intent)
    return mapping.get('required_entities', [])


def needs_handler(intent: str) -> bool:
    """
    Check if intent requires a custom handler (not direct API call).

    Args:
        intent: Intent string

    Returns:
        True if custom handler needed
    """
    mapping = get_mapping(intent)
    return 'handler' in mapping


def get_handler_name(intent: str) -> str:
    """
    Get custom handler name for an intent.

    Args:
        intent: Intent string

    Returns:
        Handler name or empty string
    """
    mapping = get_mapping(intent)
    return mapping.get('handler', '')
