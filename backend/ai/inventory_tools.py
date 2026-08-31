"""
Tool/function-calling schemas for the Inventory Agent's Groq tool-calling
path (see LLMClient.generate_with_tools).

Schemas are generated from the existing INVENTORY_ACTIONS registry
(actions.py) plus a small per-param type map below, so adding a new
inventory action to actions.py automatically gets a matching tool schema
without hand-authoring one - and ActionRegistrySanityTests-style coverage
(see ai/tests.py) can assert the two never drift apart.
"""
import copy
from typing import Any, Dict, List

from .actions import INVENTORY_ACTIONS

# JSON-schema type/description for every param name used across
# INVENTORY_ACTIONS. A param missing here falls back to a generic string
# schema (see _param_schema) rather than raising, so a newly added action
# param doesn't break tool generation - but it should still get a real
# entry added here for the model to use it well.
PARAM_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "item_id": {
        "type": "integer",
        "description": "Numeric database ID of the inventory item. If you only know the item by name, call lookup_inventory_item first to get this."
    },
    "item_ids": {
        "type": "array",
        "items": {"type": "integer"},
        "description": "List of numeric inventory item IDs."
    },
    "target_school_id": {
        "type": "integer",
        "description": "Numeric database ID of the destination school for a transfer."
    },
    "school_id": {
        "type": "integer",
        "description": "Numeric database ID of a school."
    },
    "category_id": {
        "type": "integer",
        "description": "Numeric database ID of an inventory category."
    },
    "assigned_to_id": {
        "type": "integer",
        "description": "Numeric database ID of the user an item is assigned to."
    },
    "user_id": {
        "type": "integer",
        "description": "Numeric database ID of the user to assign the item to. Omit or pass null to unassign."
    },
    "category": {
        "type": "string",
        "description": "Category name to filter by (fuzzy-matched server-side)."
    },
    "status": {
        "type": "string",
        "enum": ["Available", "Assigned", "Damaged", "Lost", "Disposed"],
        "description": "Inventory item status."
    },
    "search": {
        "type": "string",
        "description": "Free-text search across item name/description."
    },
    "location": {
        "type": "string",
        "enum": ["School", "Headquarters", "Unassigned"],
        "description": "Item location type."
    },
    "assigned_to": {
        "type": "integer",
        "description": (
            "Numeric database ID (NOT name) of the user to filter GET_ITEMS by - "
            "match against the Users/Teachers list given in context yourself, "
            "the same way you resolve school_id/category_id. This is not "
            "server-side fuzzy-matched, unlike item lookups."
        )
    },
    "name": {
        "type": "string",
        "description": "Name for the item or category being created/edited."
    },
    "purchase_value": {
        "type": "number",
        "description": "Purchase price of the item."
    },
    "description": {
        "type": "string",
        "description": "Free-text description."
    },
    "serial_number": {
        "type": "string",
        "description": "Item serial number."
    },
    "purchase_date": {
        "type": "string",
        "description": "Purchase date in YYYY-MM-DD format."
    },
    "warranty_expiry": {
        "type": "string",
        "description": "Warranty expiry date in YYYY-MM-DD format."
    },
    "notes": {
        "type": "string",
        "description": "Free-text note to attach to the item."
    },
}

_FALLBACK_PARAM_SCHEMA: Dict[str, Any] = {
    "type": "string",
    "description": "See the action's description for expected format."
}


def _param_schema(param_name: str) -> Dict[str, Any]:
    return PARAM_SCHEMAS.get(param_name, _FALLBACK_PARAM_SCHEMA)


def _nullable_param_schema(param_name: str) -> Dict[str, Any]:
    """
    A copy of the param's schema with null explicitly allowed. Groq's tool
    schema validation is strict: if an optional param's schema only allows
    e.g. "integer" and the model passes null for it (which happens in
    practice, despite being told to omit unset optional params - see the
    system prompt instruction), the ENTIRE tool call is rejected with a
    validation error, not just that field. Every optional param therefore
    needs its schema to tolerate null as a belt-and-suspenders fix, since
    prompting alone isn't reliable enough (confirmed live against Groq).
    """
    schema = copy.deepcopy(_param_schema(param_name))
    base_type = schema.get('type')
    if isinstance(base_type, list):
        if 'null' not in base_type:
            schema['type'] = base_type + ['null']
    elif base_type:
        schema['type'] = [base_type, 'null']
    if 'enum' in schema and None not in schema['enum']:
        schema['enum'] = schema['enum'] + [None]
    return schema


LOOKUP_INVENTORY_ITEM_TOOL: Dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "lookup_inventory_item",
        "description": (
            "Search for inventory items matching a name, optionally narrowed "
            "by school or category. Call this BEFORE any action that needs an "
            "item_id if you only know the item by name or description - it "
            "returns real candidate items with their IDs so you don't have to "
            "guess one. If it returns more than one candidate, ask the user "
            "which one they mean instead of picking one yourself."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "item_name": {
                    "type": "string",
                    "description": "Name or partial name of the item to search for."
                },
                "school_name": {
                    "type": "string",
                    "description": "Optional school name to narrow the search."
                },
                "category_name": {
                    "type": "string",
                    "description": "Optional category name to narrow the search."
                },
            },
            "required": ["item_name"],
        }
    }
}


def build_inventory_tools() -> List[Dict[str, Any]]:
    """
    Build OpenAI-style tool schemas for every action in INVENTORY_ACTIONS,
    plus the lookup_inventory_item helper tool the model can call to resolve
    a fuzzy item name into real candidate IDs before committing to a
    write/delete action that needs one.
    """
    tools = []

    for action_name, action_def in INVENTORY_ACTIONS.items():
        required_set = set(action_def.required_params)
        properties = {
            param: (copy.deepcopy(_param_schema(param)) if param in required_set else _nullable_param_schema(param))
            for param in list(action_def.required_params) + list(action_def.optional_params)
        }

        tools.append({
            "type": "function",
            "function": {
                "name": action_name,
                "description": action_def.description,
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": list(action_def.required_params),
                }
            }
        })

    tools.append(LOOKUP_INVENTORY_ITEM_TOOL)

    return tools
