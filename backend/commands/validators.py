"""
Entity Validators for Staff Commands

Validates extracted entities against the database and returns
clarification options when entities are ambiguous.
"""

from typing import Dict, List, Optional, Tuple
from difflib import SequenceMatcher
from django.db import models

from students.models import School, CustomUser, Student


class EntityValidator:
    """
    Validates extracted entities against database.
    Returns clarification options if entities are ambiguous.

    Usage:
        validator = EntityValidator()
        result = validator.validate(entities, intent, user)

        if not result['valid']:
            # Return clarification options to user
            return result['clarifications'][0]
    """

    SIMILARITY_THRESHOLD = 0.6  # 60% match triggers suggestions
    HIGH_CONFIDENCE_THRESHOLD = 0.85  # 85% match auto-selects

    def validate(self, entities: dict, intent: str, user) -> dict:
        """
        Validate all entities and return result.

        Args:
            entities: Extracted entities from NLP processor
            intent: Detected intent string
            user: Current user making the request

        Returns:
            {
                "valid": True/False,
                "entities": {resolved entities with IDs},
                "clarifications": [
                    {
                        "field": "school",
                        "message": "Which school did you mean?",
                        "options": [{"id": 1, "label": "Main School"}, ...]
                    }
                ]
            }
        """
        result = {
            "valid": True,
            "entities": entities.copy(),
            "clarifications": []
        }

        # Validate school if present
        if 'school' in entities and entities['school']:
            school_result = self._validate_school(entities['school'], user)
            if school_result['needs_clarification']:
                result['valid'] = False
                result['clarifications'].append(school_result['clarification'])
            elif school_result.get('school_id'):
                result['entities']['school_id'] = school_result['school_id']
                result['entities']['school_name'] = school_result['school_name']

        # Validate staff name if present
        if 'staff_name' in entities and entities['staff_name']:
            staff_result = self._validate_staff(entities['staff_name'], user)
            if staff_result['needs_clarification']:
                result['valid'] = False
                result['clarifications'].append(staff_result['clarification'])
            elif staff_result.get('staff_id'):
                result['entities']['staff_id'] = staff_result['staff_id']
                result['entities']['staff_name'] = staff_result['staff_name']

        # Validate class if present
        if 'class' in entities and entities['class']:
            class_result = self._validate_class(entities['class'], user)
            if class_result['needs_clarification']:
                result['valid'] = False
                result['clarifications'].append(class_result['clarification'])
            elif class_result.get('class'):
                result['entities']['class'] = class_result['class']

        # Validate inventory category if present
        if 'category' in entities and intent and 'inventory' in intent:
            cat_result = self._validate_category(entities['category'], user)
            if cat_result['needs_clarification']:
                result['valid'] = False
                result['clarifications'].append(cat_result['clarification'])
            elif cat_result.get('category_id'):
                result['entities']['category'] = cat_result['category_id']
                result['entities']['category_name'] = cat_result['category_name']

        # Validate inventory item if present and intent is inventory-related
        if intent and 'inventory' in intent:
            # For update operations, we need exact item
            if any(op in intent for op in ['update', 'assign', 'transfer']):
                item_result = self._validate_item_for_update(
                    entities.get('item_name') or entities.get('search'),
                    entities.get('unique_id') or entities.get('item_id'),
                    user
                )
                if item_result['needs_clarification']:
                    result['valid'] = False
                    result['clarifications'].append(item_result['clarification'])
                elif item_result.get('item_id'):
                    result['entities']['item_id'] = item_result['item_id']
                    result['entities']['item_name'] = item_result['item_name']
                    result['entities']['item_unique_id'] = item_result.get('item_unique_id')

        return result

    def _validate_category(self, category_input: str, user) -> dict:
        """
        Validate inventory category against database.

        Args:
            category_input: User's input for category name
            user: Current user

        Returns:
            {
                'needs_clarification': bool,
                'category_id': int (if found),
                'category_name': str (if found),
                'clarification': dict (if needs clarification)
            }
        """
        try:
            from inventory.models import InventoryCategory
        except ImportError:
            return {
                'needs_clarification': False,
                'category_id': None,
                'category_name': category_input
            }

        categories = InventoryCategory.objects.all()

        if not categories.exists():
            return {
                'needs_clarification': False,
                'category_id': None,
                'category_name': category_input
            }

        # Exact match (case-insensitive)
        exact = categories.filter(name__iexact=category_input).first()
        if exact:
            return {
                'needs_clarification': False,
                'category_id': exact.id,
                'category_name': exact.name
            }

        # Partial/contains match
        partial = categories.filter(name__icontains=category_input)
        if partial.count() == 1:
            cat = partial.first()
            return {
                'needs_clarification': False,
                'category_id': cat.id,
                'category_name': cat.name
            }

        # Fuzzy match
        similar = []
        input_lower = category_input.lower()

        for cat in categories:
            cat_lower = cat.name.lower()
            ratio = SequenceMatcher(None, input_lower, cat_lower).ratio()

            if input_lower in cat_lower:
                ratio = max(ratio, 0.75)
            elif cat_lower in input_lower:
                ratio = max(ratio, 0.7)

            if ratio >= self.SIMILARITY_THRESHOLD:
                similar.append({
                    'id': cat.id,
                    'label': cat.name,
                    'score': ratio
                })

        similar.sort(key=lambda x: x['score'], reverse=True)

        if len(similar) == 1 and similar[0]['score'] >= self.HIGH_CONFIDENCE_THRESHOLD:
            return {
                'needs_clarification': False,
                'category_id': similar[0]['id'],
                'category_name': similar[0]['label']
            }

        if similar:
            return {
                'needs_clarification': True,
                'clarification': {
                    'field': 'category',
                    'message': f'Which category did you mean by "{category_input}"?',
                    'options': [{'id': s['id'], 'label': s['label']} for s in similar[:5]]
                }
            }

        # No match - show all categories
        return {
            'needs_clarification': True,
            'clarification': {
                'field': 'category',
                'message': f'Category "{category_input}" not found. Available categories:',
                'options': [{'id': c.id, 'label': c.name} for c in categories[:8]]
            }
        }

    def _validate_school(self, school_input: str, user) -> dict:
        """
        Validate school name against database.

        Args:
            school_input: User's input for school name
            user: Current user (for filtering accessible schools)

        Returns:
            {
                'needs_clarification': bool,
                'school_id': int (if found),
                'school_name': str (if found),
                'clarification': dict (if needs clarification)
            }
        """
        # Get schools user has access to
        if user.role == 'Admin' or getattr(user, 'is_superuser', False):
            schools = School.objects.filter(is_active=True) if hasattr(School, 'is_active') else School.objects.all()
        else:
            schools = user.assigned_schools.all()

        if not schools.exists():
            return {
                'needs_clarification': True,
                'clarification': {
                    'field': 'school',
                    'message': 'No schools available. Please contact administrator.',
                    'options': []
                }
            }

        # Exact match (case-insensitive)
        exact = schools.filter(name__iexact=school_input).first()
        if exact:
            return {
                'needs_clarification': False,
                'school_id': exact.id,
                'school_name': exact.name
            }

        # Partial/contains match
        partial = schools.filter(name__icontains=school_input)
        if partial.count() == 1:
            school = partial.first()
            return {
                'needs_clarification': False,
                'school_id': school.id,
                'school_name': school.name
            }

        # Fuzzy match - find similar names
        similar = []
        school_input_lower = school_input.lower()

        for school in schools:
            school_name_lower = school.name.lower()

            # Calculate similarity ratio
            ratio = SequenceMatcher(None, school_input_lower, school_name_lower).ratio()

            # Also check if input is contained in school name or vice versa
            if school_input_lower in school_name_lower:
                ratio = max(ratio, 0.75)
            elif school_name_lower in school_input_lower:
                ratio = max(ratio, 0.7)

            if ratio >= self.SIMILARITY_THRESHOLD:
                similar.append({
                    'id': school.id,
                    'label': school.name,
                    'score': ratio
                })

        # Sort by similarity score
        similar.sort(key=lambda x: x['score'], reverse=True)

        # High confidence single match
        if len(similar) == 1 and similar[0]['score'] >= self.HIGH_CONFIDENCE_THRESHOLD:
            return {
                'needs_clarification': False,
                'school_id': similar[0]['id'],
                'school_name': similar[0]['label']
            }

        # Multiple similar matches - ask for clarification
        if similar:
            return {
                'needs_clarification': True,
                'clarification': {
                    'field': 'school',
                    'message': f'Which school did you mean by "{school_input}"?',
                    'options': [{'id': s['id'], 'label': s['label']} for s in similar[:5]]
                }
            }

        # No match at all - show all available schools
        return {
            'needs_clarification': True,
            'clarification': {
                'field': 'school',
                'message': f'School "{school_input}" not found. Please select:',
                'options': [{'id': s.id, 'label': s.name} for s in schools[:6]]
            }
        }

    def _validate_staff(self, staff_input: str, user) -> dict:
        """
        Validate staff name against database.

        Args:
            staff_input: User's input for staff name (or "me")
            user: Current user

        Returns:
            Similar structure to _validate_school
        """
        # Handle self-reference
        if staff_input.lower() in ['me', 'myself', 'i']:
            return {
                'needs_clarification': False,
                'staff_id': user.id,
                'staff_name': user.get_full_name() or user.username
            }

        # Search for staff by name
        staff_qs = CustomUser.objects.filter(
            role__in=['Teacher', 'Admin'],
            is_active=True
        )

        # Try exact first name match
        exact_first = staff_qs.filter(first_name__iexact=staff_input).first()
        if exact_first:
            # Check if there are multiple with same first name
            same_first_name = staff_qs.filter(first_name__iexact=staff_input)
            if same_first_name.count() == 1:
                return {
                    'needs_clarification': False,
                    'staff_id': exact_first.id,
                    'staff_name': exact_first.get_full_name()
                }
            else:
                # Multiple people with same first name
                return {
                    'needs_clarification': True,
                    'clarification': {
                        'field': 'staff',
                        'message': f'Multiple staff members named "{staff_input}". Who did you mean?',
                        'options': [
                            {
                                'id': s.id,
                                'label': f"{s.get_full_name()} ({s.role})"
                            }
                            for s in same_first_name[:5]
                        ]
                    }
                }

        # Try full name match
        name_parts = staff_input.split()
        if len(name_parts) >= 2:
            full_name_match = staff_qs.filter(
                first_name__iexact=name_parts[0],
                last_name__iexact=' '.join(name_parts[1:])
            ).first()
            if full_name_match:
                return {
                    'needs_clarification': False,
                    'staff_id': full_name_match.id,
                    'staff_name': full_name_match.get_full_name()
                }

        # Try contains match
        partial = staff_qs.filter(
            models.Q(first_name__icontains=staff_input) |
            models.Q(last_name__icontains=staff_input) |
            models.Q(username__icontains=staff_input)
        )

        if partial.count() == 1:
            staff = partial.first()
            return {
                'needs_clarification': False,
                'staff_id': staff.id,
                'staff_name': staff.get_full_name()
            }

        if partial.count() > 1:
            return {
                'needs_clarification': True,
                'clarification': {
                    'field': 'staff',
                    'message': f'Multiple staff members match "{staff_input}". Who did you mean?',
                    'options': [
                        {
                            'id': s.id,
                            'label': f"{s.get_full_name()} ({s.role})"
                        }
                        for s in partial[:5]
                    ]
                }
            }

        # No match - show available staff
        available_staff = staff_qs[:6]
        return {
            'needs_clarification': True,
            'clarification': {
                'field': 'staff',
                'message': f'Staff member "{staff_input}" not found. Did you mean:',
                'options': [
                    {
                        'id': s.id,
                        'label': f"{s.get_full_name()} ({s.role})"
                    }
                    for s in available_staff
                ]
            }
        }

    def _validate_class(self, class_input: str, user) -> dict:
        """
        Validate class name against existing classes in the system.

        Args:
            class_input: User's input for class (e.g., "10", "10A", "Class 5")
            user: Current user

        Returns:
            Similar structure to _validate_school
        """
        # Get distinct classes from active students
        classes_qs = Student.objects.filter(status='Active')

        # Filter by user's schools if not admin
        if user.role != 'Admin' and not getattr(user, 'is_superuser', False):
            school_ids = user.assigned_schools.values_list('id', flat=True)
            classes_qs = classes_qs.filter(school_id__in=school_ids)

        classes = list(
            classes_qs.exclude(student_class__isnull=True)
            .exclude(student_class='')
            .values_list('student_class', flat=True)
            .distinct()
        )

        if not classes:
            return {
                'needs_clarification': False,
                'class': class_input  # Just pass through if no classes exist
            }

        # Normalize input
        normalized = class_input.strip().upper()
        normalized_without_class = normalized.replace('CLASS', '').strip()

        # Exact match
        for cls in classes:
            cls_upper = cls.upper()
            if (cls_upper == normalized or
                cls_upper == normalized_without_class or
                cls_upper == f"CLASS {normalized_without_class}" or
                cls_upper.replace('CLASS', '').strip() == normalized_without_class):
                return {
                    'needs_clarification': False,
                    'class': cls
                }

        # Partial match
        matches = []
        for cls in classes:
            cls_upper = cls.upper()
            cls_normalized = cls_upper.replace('CLASS', '').strip()

            if (normalized_without_class in cls_upper or
                cls_normalized.startswith(normalized_without_class)):
                matches.append(cls)

        if len(matches) == 1:
            return {
                'needs_clarification': False,
                'class': matches[0]
            }

        if len(matches) > 1:
            return {
                'needs_clarification': True,
                'clarification': {
                    'field': 'class',
                    'message': f'Multiple classes match "{class_input}". Which one?',
                    'options': [{'id': c, 'label': c} for c in sorted(matches)]
                }
            }

        # No match - show available classes
        return {
            'needs_clarification': True,
            'clarification': {
                'field': 'class',
                'message': f'Class "{class_input}" not found. Available classes:',
                'options': [{'id': c, 'label': c} for c in sorted(classes)[:8]]
            }
        }

    def _validate_item_for_update(self, item_name: Optional[str], item_id: Optional[str], user) -> dict:
        """
        Validate inventory item for update operations (requires exact match).

        Args:
            item_name: Item name from user input
            item_id: Item ID/SKU if provided
            user: Current user

        Returns:
            Similar structure to _validate_school
        """
        try:
            from inventory.models import InventoryItem
        except ImportError:
            return {
                'needs_clarification': False,
                'item_id': None,
                'item_name': item_name
            }

        # Build base queryset
        items_qs = InventoryItem.objects.all()

        # Filter by user's schools if not admin
        if user.role != 'Admin' and not getattr(user, 'is_superuser', False):
            school_ids = list(user.assigned_schools.values_list('id', flat=True))
            items_qs = items_qs.filter(
                models.Q(school_id__in=school_ids) |
                models.Q(school__isnull=True)
            )

        # If item_id provided, try exact match
        if item_id:
            exact_by_id = items_qs.filter(
                models.Q(unique_id__iexact=item_id) |
                models.Q(id=item_id if item_id.isdigit() else None)
            ).first()

            if exact_by_id:
                return {
                    'needs_clarification': False,
                    'item_id': exact_by_id.id,
                    'item_name': exact_by_id.name,
                    'item_unique_id': exact_by_id.unique_id
                }

        # Search by name
        if item_name:
            # Try exact name match
            exact_by_name = items_qs.filter(name__iexact=item_name).first()
            if exact_by_name:
                return {
                    'needs_clarification': False,
                    'item_id': exact_by_name.id,
                    'item_name': exact_by_name.name,
                    'item_unique_id': exact_by_name.unique_id
                }

            # Try contains match
            partial = items_qs.filter(name__icontains=item_name)

            if partial.count() == 1:
                item = partial.first()
                return {
                    'needs_clarification': False,
                    'item_id': item.id,
                    'item_name': item.name,
                    'item_unique_id': item.unique_id
                }

            if partial.count() > 1 and partial.count() <= 10:
                return {
                    'needs_clarification': True,
                    'clarification': {
                        'field': 'item',
                        'message': f'Multiple items match "{item_name}". Which one?',
                        'options': [
                            {
                                'id': i.id,
                                'label': f"{i.name} ({i.unique_id})"
                            }
                            for i in partial[:6]
                        ]
                    }
                }

            if partial.count() > 10:
                return {
                    'needs_clarification': True,
                    'clarification': {
                        'field': 'item',
                        'message': f'Too many items match "{item_name}". Please be more specific or provide the item ID.',
                        'options': [
                            {
                                'id': i.id,
                                'label': f"{i.name} ({i.unique_id})"
                            }
                            for i in partial[:6]
                        ]
                    }
                }

        # No match found
        sample_items = items_qs[:6]
        return {
            'needs_clarification': True,
            'clarification': {
                'field': 'item',
                'message': f'Item "{item_name or item_id}" not found. Select from available items:',
                'options': [
                    {
                        'id': i.id,
                        'label': f"{i.name} ({i.unique_id})"
                    }
                    for i in sample_items
                ]
            }
        }


def resolve_clarification(entities: dict, field: str, selection: dict) -> dict:
    """
    Update entities with user's clarification selection.

    Args:
        entities: Current entities dict
        field: Field being clarified ('school', 'staff', 'class', 'item', 'category')
        selection: User's selection {'id': ..., 'label': ...}

    Returns:
        Updated entities dict
    """
    updated = entities.copy()

    if field == 'school':
        updated['school_id'] = selection.get('id')
        updated['school_name'] = selection.get('label')
        updated.pop('school', None)  # Remove original ambiguous value

    elif field == 'staff':
        updated['staff_id'] = selection.get('id')
        updated['staff_name'] = selection.get('label')

    elif field == 'class':
        updated['class'] = selection.get('label') or selection.get('id')

    elif field == 'item':
        updated['item_id'] = selection.get('id')
        # Extract just the name from label if it contains ID
        label = selection.get('label', '')
        if '(' in label:
            updated['item_name'] = label.split('(')[0].strip()
        else:
            updated['item_name'] = label

    elif field == 'category':
        updated['category'] = selection.get('id')  # Use ID for API
        updated['category_name'] = selection.get('label')

    return updated
