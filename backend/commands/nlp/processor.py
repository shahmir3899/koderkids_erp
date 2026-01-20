"""
NLP Processor for Staff Commands

Uses regex-based pattern matching to:
1. Classify intent (what the user wants to do)
2. Extract entities (parameters for the action)

This approach is simple, fast, and requires no external APIs.

IMPORTANT: Commands are designed around actual API structures:
- Inventory: Items have name, category, status, location, school, assigned_to
- Categories: Electronics, Furniture, Gadgets, etc.
- Status: Available, Assigned, Damaged, Lost, Disposed
- Location: School, Headquarters, Unassigned
"""

import re
from typing import Tuple, Dict, Optional
from datetime import date, timedelta


class NLPProcessor:
    """
    Rule-based NLP processor for staff commands.

    Usage:
        processor = NLPProcessor()
        agent, intent, entities = processor.process("Show available items in Electronics category")
    """

    def __init__(self):
        self.intent_patterns = self._load_intent_patterns()

    def process(self, text: str) -> Tuple[Optional[str], Optional[str], Dict]:
        """
        Process natural language input.

        Args:
            text: User's natural language command

        Returns:
            Tuple of (agent_name, intent, entities)
            - agent_name: 'inventory', 'broadcast', 'finance', 'hr', or None
            - intent: specific intent string or None
            - entities: dict of extracted parameters
        """
        text = text.strip()
        text_lower = text.lower()

        # Detect agent and intent
        agent, intent = self._classify_intent(text_lower)

        # Extract entities based on the detected intent
        entities = self._extract_entities(text, text_lower, intent)

        return agent, intent, entities

    def _classify_intent(self, text: str) -> Tuple[Optional[str], Optional[str]]:
        """Match text against intent patterns to classify the intent"""

        for agent, intents in self.intent_patterns.items():
            for intent, patterns in intents.items():
                for pattern in patterns:
                    if re.search(pattern, text, re.IGNORECASE):
                        return agent, intent

        return None, None

    def _load_intent_patterns(self) -> Dict:
        """
        Define regex patterns for intent classification.

        Patterns are organized by agent → intent → list of patterns.
        First matching pattern wins.

        Inventory structure:
        - Items have: name, category, status, location, school, assigned_to
        - Categories: Electronics, Furniture, Books, Stationery, Sports, Gadgets, etc.
        - Status: Available, Assigned, Damaged, Lost, Disposed
        - Location: School, Headquarters, Unassigned
        """
        return {
            # ==================== INVENTORY AGENT ====================
            "inventory": {
                # Query items by various filters
                "inventory.query.items": [
                    r"(show|list|get|view)\s+(all\s+)?(inventory|items)",
                    r"(show|list|get)\s+.+\s+(items|inventory)",
                    r"what\s+(items|inventory)\s+(do\s+we\s+have|is\s+available)",
                    r"(available|damaged|lost|assigned)\s+items",
                    r"items\s+(at|in)\s+.+",  # items at school X
                ],
                # Query by category
                "inventory.query.category": [
                    r"(show|list|get)\s+.+\s+(category|categories)",
                    r"(electronics|furniture|books|stationery|sports|gadgets)\s+(items|inventory)",
                    r"items\s+in\s+.+\s+category",
                    r"what.+in\s+(electronics|furniture|books|stationery|sports|gadgets)",
                ],
                # Query summary/statistics
                "inventory.query.summary": [
                    r"inventory\s+(summary|stats|statistics|overview|count)",
                    r"how\s+many\s+(items|inventory)",
                    r"(total|count)\s+(items|inventory)",
                    r"inventory\s+by\s+(status|category|location|school)",
                ],
                # Find specific item by ID or name
                "inventory.query.find": [
                    r"(find|locate|search|where)\s+(item|inventory)",
                    r"where\s+is\s+.+",
                    r"(find|search)\s+\d{2}-[A-Z]+-",  # Find by unique_id pattern
                    r"item\s+(id|ID|code)\s*:?\s*\d",
                ],
                # Update item status
                "inventory.update.status": [
                    r"mark\s+.+\s+(as\s+)?(damaged|lost|disposed|available)",
                    r"(change|update)\s+(item\s+)?status",
                    r"(report|flag)\s+.+\s+(as\s+)?(damaged|lost|broken)",
                    r".+\s+is\s+(damaged|lost|broken)",
                ],
                # Assign item to user
                "inventory.assign": [
                    r"assign\s+.+\s+to\s+.+",
                    r"give\s+(item\s+)?.+\s+to\s+.+",
                    r"allocate\s+.+\s+to\s+.+",
                ],
                # Transfer item between locations/schools
                "inventory.transfer": [
                    r"transfer\s+.+\s+(to|from)\s+.+",
                    r"move\s+.+\s+to\s+.+",
                    r"relocate\s+.+\s+to\s+.+",
                ],
                # Request procurement
                "inventory.request": [
                    r"(order|request|need|procure)\s+\d+\s+.+",
                    r"(running\s+)?low\s+on\s+.+",
                    r"(need|want)\s+(to\s+)?(order|buy|purchase)",
                    r"request\s+(new\s+)?items?",
                ],
            },

            # ==================== BROADCAST AGENT ====================
            "broadcast": {
                "broadcast.parents.class": [
                    r"(tell|notify|inform|message|alert)\s+(class\s+)?\d+[a-zA-Z]?\s+parents",
                    r"(tell|notify|inform|alert)\s+parents\s+(of|in)\s+class\s+\d+",
                    r"send\s+(to|message\s+to)\s+class\s+\d+[a-zA-Z]?\s+parents",
                    r"(message|notify)\s+parents\s+.+\s+class\s+\d+",
                    r"class\s+\d+[a-zA-Z]?\s+parents.+(tell|notify|inform|message)",
                ],
                "broadcast.parents.school": [
                    r"(notify|tell|inform|alert)\s+all\s+parents",
                    r"(notify|tell|inform|alert)\s+parents\s+(at|of|in)\s+.+school",
                    r"(send|broadcast)\s+(to\s+)?all\s+parents",
                    r"message\s+all\s+parents",
                ],
                "broadcast.teachers.all": [
                    r"(send|tell|notify|inform|alert)\s+(to\s+)?all\s+teachers",
                    r"(message|broadcast)\s+(to\s+)?all\s+teachers",
                    r"notify\s+all\s+staff",
                    r"(tell|inform)\s+teachers\s+that",
                ],
                "broadcast.teachers.school": [
                    r"(notify|tell|inform|alert)\s+teachers\s+(at|of|in)\s+.+",
                    r"(message|send)\s+teachers\s+(at|of|in)\s+.+school",
                ],
                "broadcast.student": [
                    r"(send|notify|message)\s+(to\s+)?student\s+.+",
                    r"(tell|inform)\s+student\s+.+",
                ],
            },

            # ==================== FINANCE AGENT ====================
            "finance": {
                "finance.invoice.generate": [
                    r"generate\s+invoice",
                    r"create\s+invoice",
                    r"make\s+invoice",
                    r"prepare\s+invoice",
                    r"invoice\s+for\s+.+",
                ],
                "finance.invoice.send": [
                    r"send\s+invoice",
                    r"email\s+invoice",
                    r"mail\s+invoice",
                ],
                "finance.fee.summary": [
                    r"(fee|fees)\s+(collection|summary|report|overview)",
                    r"(show|get|display)\s+(fee|fees)\s+(for|in|summary)",
                    r"(how\s+much|total)\s+(fee|fees)\s+(collected|received)",
                    r"fee\s+status",
                ],
                "finance.fee.pending": [
                    r"(pending|unpaid|due|overdue)\s+(fees|fee|payments)",
                    r"(list|show|get)\s+(pending|unpaid|overdue)\s+(fees|fee)",
                    r"who\s+(hasn't|has\s+not|didn't)\s+paid?",
                    r"(outstanding|remaining)\s+(fees|fee|dues)",
                    r"defaulters",
                ],
                "finance.expense.summary": [
                    r"(expense|expenses|spending)\s+(summary|report|overview)",
                    r"(what|how\s+much).+(spent|expenses)",
                    r"(show|get)\s+expenses",
                ],
            },

            # ==================== HR AGENT ====================
            "hr": {
                "hr.attendance.mark": [
                    r"mark\s+(me|myself|.+)\s+(as\s+)?(absent|present|late|half\s*day|on\s+leave)",
                    r"i\s+(am|'m|will\s+be)\s+(absent|not\s+coming|on\s+leave|late)",
                    r"i\s+(won't|wont|will\s+not)\s+(be\s+)?(coming|there|present)",
                    r".+\s+is\s+(absent|on\s+leave|not\s+coming)",
                    r"(taking|on)\s+(leave|off)\s+(today|tomorrow)",
                    r"(record|log)\s+.+\s+(absent|present|late)",
                ],
                "hr.attendance.query": [
                    r"who\s+is\s+(absent|present|on\s+leave|late)",
                    r"(show|list|get)\s+(absent|present)\s+(staff|teachers|employees)",
                    r"attendance\s+(today|for|report|list|status)",
                    r"(today's|todays)\s+attendance",
                    r"who\s+(all\s+)?(came|came\s+in|is\s+here)",
                    r"(absent|present)\s+(list|report)",
                ],
                "hr.attendance.report": [
                    r"attendance\s+report\s+(for|of)",
                    r"(monthly|weekly|daily)\s+attendance",
                    r"attendance\s+(summary|overview)",
                ],
                "hr.substitute.assign": [
                    r"assign\s+substitute",
                    r"(set|make|appoint)\s+.+\s+(as\s+)?substitute",
                    r"substitute\s+.+\s+(for|with)\s+.+",
                    r"replace\s+.+\s+with\s+.+",
                ],
                "hr.substitute.suggest": [
                    r"suggest\s+substitute",
                    r"(who\s+can|find|get)\s+substitute",
                    r"(available|free)\s+(teachers|staff)\s+(for|to)",
                    r"who\s+(can|is\s+available\s+to)\s+(take|cover|substitute)",
                    r"replacement\s+for\s+.+",
                ],
                "hr.staff.list": [
                    r"(list|show|get)\s+(all\s+)?(teachers|staff|employees)",
                    r"(who|which)\s+(teachers|staff).+(work|assigned)",
                ],
            },
        }

    def _extract_entities(self, original_text: str, text_lower: str, intent: Optional[str]) -> Dict:
        """
        Extract entities (parameters) from the text based on the intent context.

        Args:
            original_text: Original text (preserves case)
            text_lower: Lowercase text for pattern matching
            intent: Detected intent for context-specific extraction

        Returns:
            Dictionary of extracted entities
        """
        entities = {}

        # ========== Common entity patterns ==========

        # Quantity (number)
        quantity_match = re.search(r'(\d+)\s*(?:items?|pieces?|boxes?|units?|nos?\.?)?', text_lower)
        if quantity_match:
            entities['quantity'] = int(quantity_match.group(1))

        # Class (e.g., "Class 10", "10A", "class 5")
        class_match = re.search(r'class\s*(\d+[a-zA-Z]?)', text_lower)
        if class_match:
            entities['class'] = class_match.group(1).upper()
        else:
            # Try standalone class like "10A" or "5th"
            standalone_class = re.search(r'\b(\d+[a-zA-Z]?)\s*(grade|standard|std|th|st|nd|rd)?\b', text_lower)
            if standalone_class and intent and ('class' in intent or 'parents' in intent):
                entities['class'] = standalone_class.group(1).upper()

        # School name (try to extract school names)
        school_patterns = [
            r'(?:at|in|of|for)\s+([A-Za-z\s]+(?:school|academy|institute|branch|campus))',
            r'([A-Za-z\s]+(?:school|academy|institute))\s+(?:branch|campus)?',
            r'(?:at|in)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:school|branch)',
        ]
        for pattern in school_patterns:
            school_match = re.search(pattern, text_lower)
            if school_match:
                entities['school'] = school_match.group(1).strip().title()
                break

        # Date (today, tomorrow, specific date)
        date_value = self._extract_date(text_lower)
        if date_value:
            entities['date'] = date_value

        # Month (for reports)
        month_match = re.search(
            r'\b(january|february|march|april|may|june|july|august|september|october|november|december)\b',
            text_lower
        )
        if month_match:
            entities['month'] = month_match.group(1).title()

        # Email
        email_match = re.search(r'[\w.-]+@[\w.-]+\.\w+', text_lower)
        if email_match:
            entities['email'] = email_match.group(0)

        # ========== Intent-specific extraction ==========

        if intent:
            # Extract message content (for broadcast)
            if 'broadcast' in intent:
                entities.update(self._extract_broadcast_entities(original_text, text_lower))

            # Extract inventory-specific entities (category, status, location, item_id)
            if 'inventory' in intent:
                entities.update(self._extract_inventory_entities(original_text, text_lower, intent))

            # Extract staff name (for HR)
            if 'hr' in intent:
                entities.update(self._extract_hr_entities(original_text, text_lower))

            # Extract finance-specific entities
            if 'finance' in intent:
                entities.update(self._extract_finance_entities(original_text, text_lower))

        return entities

    def _extract_date(self, text: str) -> Optional[str]:
        """Extract date from text"""
        today = date.today()

        if 'today' in text:
            return str(today)
        elif 'tomorrow' in text:
            return str(today + timedelta(days=1))
        elif 'yesterday' in text:
            return str(today - timedelta(days=1))

        # Try specific date formats
        date_patterns = [
            r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})',  # DD/MM/YYYY or DD-MM-YYYY
            r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})',     # YYYY-MM-DD
        ]

        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    groups = match.groups()
                    if len(groups[0]) == 4:  # YYYY-MM-DD
                        return f"{groups[0]}-{groups[1].zfill(2)}-{groups[2].zfill(2)}"
                    else:  # DD/MM/YYYY
                        year = groups[2] if len(groups[2]) == 4 else f"20{groups[2]}"
                        return f"{year}-{groups[1].zfill(2)}-{groups[0].zfill(2)}"
                except (ValueError, IndexError):
                    pass

        return None

    def _extract_broadcast_entities(self, original_text: str, text_lower: str) -> Dict:
        """Extract entities specific to broadcast commands"""
        entities = {}

        # Extract message content (everything after "that", ":", or common phrases)
        message_patterns = [
            r'(?:that|saying|message:?)\s*["\']?(.+?)["\']?$',
            r':\s*["\']?(.+?)["\']?$',
            r'parents\s+(?:about|regarding)\s+(.+)$',
            r'teachers\s+(?:about|regarding|that)\s+(.+)$',
        ]

        for pattern in message_patterns:
            msg_match = re.search(pattern, text_lower, re.IGNORECASE)
            if msg_match:
                # Use original text to preserve case
                start = msg_match.start(1)
                entities['message'] = original_text[start:].strip().strip('"\'')
                break

        return entities

    def _extract_inventory_entities(self, original_text: str, text_lower: str, intent: str) -> Dict:
        """
        Extract entities specific to inventory commands.

        Actual inventory structure:
        - Categories: Electronics, Furniture, Books, Stationery, Sports, Gadgets, etc.
        - Status: Available, Assigned, Damaged, Lost, Disposed
        - Location: School, Headquarters, Unassigned
        - Items have: name, unique_id (e.g., 26-SCH-KK-DES-001), category, status, location, school
        """
        entities = {}

        # ========== Extract category ==========
        category_patterns = [
            r'\b(electronics?|furniture|books?|stationery|sports?|gadgets?|equipment)\b',
            r'in\s+(\w+)\s+category',
            r'(\w+)\s+category',
        ]
        for pattern in category_patterns:
            cat_match = re.search(pattern, text_lower)
            if cat_match:
                cat_name = cat_match.group(1).strip()
                # Normalize category names
                cat_mapping = {
                    'electronic': 'Electronics',
                    'electronics': 'Electronics',
                    'furniture': 'Furniture',
                    'book': 'Books',
                    'books': 'Books',
                    'stationery': 'Stationery',
                    'sport': 'Sports',
                    'sports': 'Sports',
                    'gadget': 'Gadgets',
                    'gadgets': 'Gadgets',
                    'equipment': 'Equipment',
                }
                entities['category'] = cat_mapping.get(cat_name.lower(), cat_name.title())
                break

        # ========== Extract status ==========
        status_match = re.search(
            r'\b(available|assigned|damaged|lost|disposed)\b',
            text_lower
        )
        if status_match:
            status_mapping = {
                'available': 'Available',
                'assigned': 'Assigned',
                'damaged': 'Damaged',
                'lost': 'Lost',
                'disposed': 'Disposed',
            }
            entities['status'] = status_mapping.get(status_match.group(1).lower(), status_match.group(1).title())

        # ========== Extract location ==========
        location_match = re.search(
            r'\b(headquarters?|hq|head\s*quarters?|unassigned)\b',
            text_lower
        )
        if location_match:
            loc = location_match.group(1).lower()
            if 'head' in loc or 'hq' in loc:
                entities['location'] = 'Headquarters'
            elif 'unassigned' in loc:
                entities['location'] = 'Unassigned'
        elif re.search(r'\b(at|in)\s+(school|campus)', text_lower):
            entities['location'] = 'School'

        # ========== Extract unique_id ==========
        # Pattern: YY-LOC-SCHOOL-ITEM-NNN (e.g., 26-SCH-KK-DES-001)
        unique_id_match = re.search(r'\b(\d{2}-[A-Z]{3}-[A-Z]{2,5}-[A-Z]{3}-\d{3})\b', original_text.upper())
        if unique_id_match:
            entities['unique_id'] = unique_id_match.group(1)
        else:
            # Try partial match
            partial_id = re.search(r'\b(\d{2}-[A-Z]{3}-)', original_text.upper())
            if partial_id:
                entities['unique_id_partial'] = partial_id.group(1)

        # ========== Extract item name (for search) ==========
        # Be more careful - only extract if it looks like an actual search term
        if 'query' in intent or 'find' in intent:
            search_patterns = [
                r'(?:find|search|locate|look\s+for)\s+(.+?)(?:\s+item|\s+in|\s+at|$)',
                r'(?:where\s+is)\s+(.+?)(?:\?|$)',
            ]
            for pattern in search_patterns:
                search_match = re.search(pattern, text_lower)
                if search_match:
                    search_term = search_match.group(1).strip()
                    # Clean up common words
                    search_term = re.sub(r'\b(the|a|an|item|items|inventory)\b', '', search_term).strip()
                    if search_term and len(search_term) > 1:
                        entities['search'] = search_term.title()
                        break

        # ========== Extract item name for requests ==========
        if 'request' in intent:
            request_patterns = [
                r'(?:order|request|need|procure)\s+\d+\s+(.+?)(?:\s+for|\s+at|$)',
                r'(?:running\s+)?low\s+on\s+(.+?)(?:\s+at|\s+in|$)',
            ]
            for pattern in request_patterns:
                req_match = re.search(pattern, text_lower)
                if req_match:
                    item_name = req_match.group(1).strip()
                    item_name = re.sub(r'\b(the|a|an|some|more|new)\b', '', item_name).strip()
                    if item_name and len(item_name) > 1:
                        entities['item_name'] = item_name.title()
                        break

        return entities

    def _extract_hr_entities(self, original_text: str, text_lower: str) -> Dict:
        """Extract entities specific to HR commands"""
        entities = {}

        # Extract staff name
        staff_patterns = [
            r'mark\s+(\w+(?:\s+\w+)?)\s+(?:as\s+)?(?:absent|present|late)',
            r'(\w+(?:\s+\w+)?)\s+is\s+(?:absent|on\s+leave|not\s+coming)',
            r'substitute\s+(?:for\s+)?(\w+(?:\s+\w+)?)',
            r'replace\s+(\w+(?:\s+\w+)?)\s+with',
        ]

        for pattern in staff_patterns:
            staff_match = re.search(pattern, text_lower)
            if staff_match:
                name = staff_match.group(1).strip()
                # Check for self-reference
                if name.lower() in ['me', 'myself', 'i']:
                    entities['staff_name'] = 'me'
                else:
                    entities['staff_name'] = name.title()
                break

        # Handle self-reference in simpler patterns
        if 'staff_name' not in entities:
            if re.search(r"\bi\s+(am|'m|will\s+be|won't)", text_lower):
                entities['staff_name'] = 'me'
            elif 'mark me' in text_lower:
                entities['staff_name'] = 'me'

        # Set default date to today for attendance
        if 'date' not in entities and ('attendance' in str(entities) or 'absent' in text_lower or 'present' in text_lower):
            entities['date'] = str(date.today())

        return entities

    def _extract_finance_entities(self, original_text: str, text_lower: str) -> Dict:
        """Extract entities specific to finance commands"""
        entities = {}

        # Extract invoice number
        invoice_match = re.search(r'invoice\s*#?\s*(\d+)', text_lower)
        if invoice_match:
            entities['invoice_id'] = invoice_match.group(1)

        # Extract amount
        amount_match = re.search(r'(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', text_lower)
        if amount_match:
            entities['amount'] = amount_match.group(1).replace(',', '')

        return entities

    def get_suggestions(self, partial_text: str) -> list:
        """
        Get command suggestions based on partial input.

        Args:
            partial_text: Partial command text

        Returns:
            List of suggested command templates

        Suggestions are based on actual API capabilities:
        - Inventory: filter by category, status, location, school
        - Finance: fee summary, pending fees by class/school
        - Broadcast: notify parents by class, send to all teachers
        - HR: mark attendance, find substitutes
        """
        suggestions = []
        text_lower = partial_text.lower()

        if any(word in text_lower for word in ['inventory', 'item', 'items']):
            suggestions.extend([
                "Show all inventory items",
                "Show available items in Electronics category",
                "Show damaged items at Headquarters",
                "Inventory summary",
            ])
        elif any(word in text_lower for word in ['electronics', 'furniture', 'gadgets', 'books', 'category']):
            suggestions.extend([
                "Show Electronics items",
                "Show Furniture items",
                "List items in Gadgets category",
                "Inventory by category",
            ])
        elif any(word in text_lower for word in ['available', 'damaged', 'lost', 'assigned']):
            suggestions.extend([
                "Show available items",
                "Show damaged items",
                "Show assigned items",
                "Show lost items",
            ])
        elif any(word in text_lower for word in ['absent', 'present', 'attendance', 'leave']):
            suggestions.extend([
                "Mark me absent today",
                "Who is absent today?",
                "Mark [name] as absent",
                "Find substitute for today",
            ])
        elif any(word in text_lower for word in ['tell', 'notify', 'message', 'send', 'parents']):
            suggestions.extend([
                "Tell Class 10 parents that [message]",
                "Send to all teachers: [message]",
                "Notify all parents about [topic]",
            ])
        elif any(word in text_lower for word in ['fee', 'fees', 'pending', 'payment']):
            suggestions.extend([
                "Show pending fees",
                "Show pending fees for Class 10",
                "Fee summary for January",
            ])
        elif any(word in text_lower for word in ['substitute', 'replace', 'cover']):
            suggestions.extend([
                "Find substitute for today",
                "Who is available to substitute?",
            ])
        else:
            # Generic suggestions based on actual capabilities
            suggestions.extend([
                "Show inventory summary",
                "Show available Electronics items",
                "Mark me absent today",
                "Tell Class 10 parents that [message]",
            ])

        return suggestions[:4]  # Return max 4 suggestions
