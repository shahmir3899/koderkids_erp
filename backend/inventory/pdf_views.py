# inventory/pdf_views.py
# ============================================
# INVENTORY PDF GENERATION VIEWS - With RBAC
# ============================================

import logging
import os
import base64
from io import BytesIO
from datetime import datetime
from collections import defaultdict

from django.http import HttpResponse
from django.conf import settings
from django.db.models import Sum, Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from weasyprint import HTML, CSS
import html

from .models import InventoryItem, InventoryCategory
from students.models import School, CustomUser
from employees.models import TeacherProfile

logger = logging.getLogger(__name__)


# ============================================
# RBAC HELPER FUNCTIONS
# ============================================

def is_admin_user(user):
    """Check if user has admin privileges"""
    return (
        user.is_superuser or 
        user.is_staff or 
        getattr(user, 'role', None) == 'Admin'
    )


def get_user_allowed_schools(user):
    """Get list of school IDs the user can access"""
    if is_admin_user(user):
        return None  # None means all schools
    
    if hasattr(user, 'assigned_schools'):
        return list(user.assigned_schools.values_list('id', flat=True))
    
    return []


def validate_school_access(user, school_id):
    """Check if user can access a specific school"""
    if is_admin_user(user):
        return True
    
    allowed = get_user_allowed_schools(user)
    return school_id in allowed if allowed else False


# ============================================
# PDF HELPER FUNCTIONS
# ============================================

def get_background_css():
    """Load bg.png and return CSS for @page background - fills entire A4 page."""
    bg_path = os.path.join(settings.BASE_DIR, 'static', 'bg.png')
    if os.path.exists(bg_path):
        with open(bg_path, 'rb') as f:
            bg_data = base64.b64encode(f.read()).decode('utf-8')
        return CSS(string=f"""
            @page {{
                size: 210mm 297mm;
                margin: 0;
                background: url('data:image/png;base64,{bg_data}') no-repeat top left / 210mm 297mm;
            }}
            body {{
                margin: 0;
                padding: 0;
            }}
        """)
    logger.warning(f"Background image not found at {bg_path}")
    return CSS(string="""
        @page {
            size: 210mm 297mm;
            margin: 0;
        }
        body {
            margin: 0;
            padding: 52mm 15mm 20mm 15mm;
        }
    """)


def get_location_display(item):
    """Format location from an item for display."""
    if item.location == 'School' and item.school:
        return f"School - {item.school.name}"
    return item.location or "Unknown"


def get_location_display_from_params(location, school=None):
    """Format location for display from parameters"""
    if location == 'School' and school:
        return f"School - {school.name}"
    return location


def format_currency(value):
    """Format value as PKR currency"""
    try:
        return f"PKR {int(value):,}"
    except (ValueError, TypeError):
        return "PKR 0"


def group_items_by_name_category(items):
    """Group identical items (same name + category) with quantity count."""
    grouped = defaultdict(lambda: {
        'items': [],
        'qty': 0,
        'total_value': 0,
        'unique_ids': [],
        'name': '',
        'category_name': '',
        'status': '',
        'assigned_to_name': '',  # Added for PDF display
    })
    
    for item in items:
        key = (item.name, item.category_id)
        grouped[key]['items'].append(item)
        grouped[key]['qty'] += 1
        grouped[key]['total_value'] += float(item.purchase_value or 0)
        grouped[key]['unique_ids'].append(item.unique_id)
        grouped[key]['name'] = item.name
        grouped[key]['category_name'] = item.category.name if item.category else 'Uncategorized'
        grouped[key]['status'] = item.status
        # Capture assigned_to_name
        if item.assigned_to:
            full_name = f"{item.assigned_to.first_name} {item.assigned_to.last_name}".strip()
            grouped[key]['assigned_to_name'] = full_name if full_name else item.assigned_to.username
        else:
            grouped[key]['assigned_to_name'] = 'Unassigned'
    
    return list(grouped.values())


def get_user_display_name(user):
    """Get display name for a user"""
    if user:
        full_name = user.get_full_name()
        if full_name:
            return full_name
        return user.username
    return "Unknown"


def get_employee_name(user_id):
    """Get employee name from TeacherProfile by user ID"""
    if not user_id:
        return None
    try:
        profile = TeacherProfile.objects.select_related('user').get(user_id=user_id)
        user = profile.user
        full_name = user.get_full_name()
        return full_name if full_name else user.username
    except TeacherProfile.DoesNotExist:
        return None


# ============================================
# EMPLOYEE LIST ENDPOINT
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_employees_list(request):
    """Get list of employees (TeacherProfile) for Received By dropdown."""
    try:
        profiles = TeacherProfile.objects.select_related('user').all()
        employees = []
        for profile in profiles:
            user = profile.user
            name = user.get_full_name() or user.username
            employees.append({
                'id': profile.id,
                'user_id': profile.user_id,
                'name': name,
                'title': profile.title or '',
                'employee_id': profile.employee_id or '',
            })
        return Response(employees)
    except Exception as e:
        logger.exception("Failed to fetch employees list")
        return Response({"error": str(e)}, status=500)


# ============================================
# BASE PDF STYLES
# ============================================

def get_base_styles():
    """Return base CSS styles for all inventory PDFs - Compact version"""
    return """
    * {
        box-sizing: border-box;
    }
    
    html, body {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 9pt;
        color: #333;
        background: transparent !important;
    }
    
    .page-content {
        min-height: 200mm;
        display: flex;
        flex-direction: column;
        padding: 52mm 15mm 20mm 15mm;  /* Content padding instead of page margin */
    }
    
    .report-header {
        text-align: center;
        margin-bottom: 4mm;
        padding-bottom: 3mm;
        border-bottom: 1.5px solid #009688;
    }
    
    .report-title {
        font-size: 14pt;
        font-weight: 700;
        color: #009688;
        margin-bottom: 1mm;
    }
    
    .report-subtitle {
        font-size: 8pt;
        color: #666;
    }
    
    .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2mm;
        margin-bottom: 4mm;
        padding: 3mm;
        background-color: #f8f9fa;
        border-radius: 2mm;
        border: 1px solid #e0e0e0;
    }
    
    .info-item {
        display: flex;
        flex-direction: column;
    }
    
    .info-label {
        font-size: 6pt;
        color: #666;
        text-transform: uppercase;
        margin-bottom: 0.5mm;
    }
    
    .info-value {
        font-size: 9pt;
        font-weight: 600;
        color: #333;
    }
    
    .data-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin-bottom: 4mm;
        border-radius: 2mm;
        overflow: hidden;
        box-shadow: 0 0.5mm 1mm rgba(0,0,0,0.05);
    }
    
    .data-table th {
        background-color: #009688;
        color: white;
        font-size: 7pt;
        font-weight: 600;
        padding: 2mm;
        text-align: left;
        text-transform: uppercase;
    }
    
    .data-table td {
        padding: 2mm;
        font-size: 8pt;
        border-bottom: 1px solid #e0e0e0;
        vertical-align: middle;
    }
    
    .data-table tr:nth-child(even) {
        background-color: #f8f9fa;
    }
    
    .data-table tr:last-child td:first-child {
        border-bottom-left-radius: 2mm;
    }
    
    .data-table tr:last-child td:last-child {
        border-bottom-right-radius: 2mm;
    }
    
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    
    .summary-section {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 3mm;
        padding: 3mm;
        background-color: #e0f2f1;
        border-radius: 2mm;
        margin-bottom: 4mm;
    }
    
    .summary-item { text-align: center; }
    
    .summary-label {
        font-size: 6pt;
        color: #666;
        text-transform: uppercase;
    }
    
    .summary-value {
        font-size: 11pt;
        font-weight: 700;
        color: #009688;
    }
    
    .signature-section {
        margin-top: auto;
        padding-top: 4mm;
    }
    
    .signature-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6mm;
    }
    
    .signature-box {
        padding: 3mm;
        border: 1px solid #e0e0e0;
        border-radius: 2mm;
        background-color: #fafafa;
        min-height: 18mm;
    }
    
    .signature-title {
        font-size: 8pt;
        font-weight: 600;
        color: #333;
        margin-bottom: 2mm;
    }
    
    .signature-line {
        border-bottom: 1px solid #333;
        height: 8mm;
        margin-bottom: 1mm;
    }
    
    .signature-label {
        font-size: 6pt;
        color: #666;
    }
    
    .date-line {
        display: flex;
        align-items: center;
        gap: 2mm;
        margin-top: 2mm;
    }
    
    .date-line span {
        font-size: 7pt;
        color: #666;
    }
    
    .date-line .line {
        flex: 1;
        border-bottom: 1px solid #333;
        height: 5mm;
    }
    
    .report-footer {
        margin-top: auto;
        padding-top: 3mm;
        border-top: 1px solid #e0e0e0;
        font-size: 7pt;
        color: #666;
        text-align: center;
    }
    
    .unique-id {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 7pt;
        color: #666;
        background-color: #f0f0f0;
        padding: 0.5mm 1.5mm;
        border-radius: 1mm;
    }
    
    .status-badge {
        display: inline-block;
        padding: 0.5mm 2mm;
        border-radius: 1.5mm;
        font-size: 6pt;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .status-available { background-color: #d4edda; color: #155724; }
    .status-assigned { background-color: #cce5ff; color: #004085; }
    .status-damaged { background-color: #fff3cd; color: #856404; }
    .status-lost { background-color: #f8d7da; color: #721c24; }
    .status-disposed { background-color: #e2e3e5; color: #383d41; }
    
    tr { page-break-inside: avoid; }
"""


# ============================================
# TRANSFER RECEIPT PDF
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_transfer_receipt(request):
    """
    Generate Transfer Receipt PDF
    
    RBAC:
    - Admin: Can transfer anywhere
    - Teacher: Can only transfer to/from assigned schools
    """
    logger.info(f"Transfer receipt request by {request.user.username}: {request.data}")
    
    try:
        user = request.user
        item_ids = request.data.get('item_ids', [])
        to_location = request.data.get('to_location', '')
        to_school_id = request.data.get('to_school_id')
        received_by_user_id = request.data.get('received_by_user_id')
        reason = request.data.get('reason', '')
        is_transfer = request.data.get('is_transfer', False)
        
        if not item_ids:
            return Response({"error": "No items selected"}, status=400)
        
        if not to_location:
            return Response({"error": "Destination location is required"}, status=400)
        
        # Fetch items with related data
        items = list(InventoryItem.objects.filter(id__in=item_ids).select_related('category', 'school'))
        if not items:
            return Response({"error": "No valid items found"}, status=404)
        
        # RBAC: Teachers can only access items at their schools
        if not is_admin_user(user):
            allowed_schools = get_user_allowed_schools(user)
            
            # Check all items are at allowed schools
            for item in items:
                if item.location != 'School' or item.school_id not in allowed_schools:
                    return Response({
                        "error": "You can only transfer items from your assigned schools"
                    }, status=403)
            
            # Check destination is allowed
            if to_location == 'School':
                if to_school_id and int(to_school_id) not in allowed_schools:
                    return Response({
                        "error": "You can only transfer items to your assigned schools"
                    }, status=403)
            else:
                # Teachers cannot transfer to Headquarters or Unassigned
                return Response({
                    "error": "You can only transfer items to school locations"
                }, status=403)
        
        # Validate all items are from same location
        first_item = items[0]
        first_location = get_location_display(first_item)
        
        for item in items[1:]:
            item_location = get_location_display(item)
            if item_location != first_location:
                return Response({
                    "error": "Cannot transfer items from different locations",
                    "details": f"First item: {first_location}, Conflicting: {item.name} at {item_location}"
                }, status=400)
        
        from_location_display = first_location
        
        # Get destination school
        to_school = None
        if to_school_id:
            to_school = School.objects.filter(id=to_school_id).first()
        
        to_location_display = get_location_display_from_params(to_location, to_school)
        
        # Get transferred by from logged-in user
        transferred_by = get_user_display_name(user)
        
        # Get received by from TeacherProfile
        received_by_name = ""
        received_by_user = None
        if received_by_user_id:
            try:
                profile = TeacherProfile.objects.select_related('user').get(user_id=received_by_user_id)
                received_by_user = profile.user
                received_by_name = get_user_display_name(received_by_user)
            except TeacherProfile.DoesNotExist:
                logger.warning(f"TeacherProfile not found for user_id {received_by_user_id}")
        
        # If actual transfer, update items
        if is_transfer:
            transfer_note = f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Transferred from {from_location_display} to {to_location_display} by {transferred_by}."
            if received_by_name:
                transfer_note += f" Received by {received_by_name}."
            if reason:
                transfer_note += f" Reason: {reason}"
            
            for item in items:
                existing_notes = item.notes or ''
                item.notes = f"{existing_notes}\n{transfer_note}".strip()
                item.location = to_location
                item.school = to_school if to_location == 'School' else None
                
                if received_by_user:
                    item.assigned_to = received_by_user
                    item.status = 'Assigned'
                
                item.save()
            
            logger.info(f"Transferred {len(items)} items from {from_location_display} to {to_location_display}")
        
        # Group items
        grouped_items = group_items_by_name_category(items)
        
        # Calculate totals
        total_items = sum(g['qty'] for g in grouped_items)
        total_value = sum(g['total_value'] for g in grouped_items)
        
        # Generate PDF
        pdf_buffer = generate_transfer_receipt_pdf(
            grouped_items=grouped_items,
            from_location=from_location_display,
            to_location=to_location_display,
            transferred_by=transferred_by,
            received_by=received_by_name,
            reason=reason,
            total_items=total_items,
            total_value=total_value,
            is_transfer=is_transfer,
        )
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        timestamp = datetime.now().strftime('%Y-%m-%d')
        doc_type = "Transfer_Receipt" if is_transfer else "Inventory_Report"
        filename = f"{doc_type}_{timestamp}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
        
    except Exception as e:
        logger.exception("Transfer receipt generation failed")
        return Response({"error": str(e)}, status=500)


def generate_transfer_receipt_pdf(grouped_items, from_location, to_location, 
                                   transferred_by, received_by, reason,
                                   total_items, total_value, is_transfer=True):
    """Generate the actual Transfer Receipt PDF content"""
    
    page_css = get_background_css()
    base_styles = get_base_styles()
    
    table_rows = ""
    for idx, item in enumerate(items, 1):
        unique_id_display = item['unique_ids'][0] if item['unique_ids'] else 'N/A'
        if len(item['unique_ids']) > 1:
            unique_id_display += f" <span style='color:#666;font-size:7pt;'>+{len(item['unique_ids'])-1} more</span>"
        
        status_class = f"status-{item['status'].lower()}" if item.get('status') else ''
        assigned_to = item.get('assigned_to_name', 'Unassigned')
        
        table_rows += f"""
        <tr>
            <td class="text-center">{idx}</td>
            <td>{html.escape(item['name'])}</td>
            <td class="text-center">{item['qty']}</td>
            <td><span class="unique-id">{unique_id_display}</span></td>
            <td>{html.escape(item['category_name'])}</td>
            <td class="text-center"><span class="status-badge {status_class}">{item.get('status', 'N/A')}</span></td>
            <td>{html.escape(assigned_to)}</td>
            <td class="text-right">{format_currency(item['total_value'])}</td>
        </tr>
        """
    
    doc_type = "TRANSFER RECEIPT" if is_transfer else "INVENTORY REPORT"
    doc_subtitle = "Official record of inventory transfer" if is_transfer else "Inventory documentation report"
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        {base_styles}
    </style>
</head>
<body>
    <div class="page-content">
        <div class="report-header">
            <div class="report-title">{doc_type}</div>
            <div class="report-subtitle">{doc_subtitle}</div>
        </div>
        
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Document Date</span>
                <span class="info-value">{datetime.now().strftime('%B %d, %Y')}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Document Time</span>
                <span class="info-value">{datetime.now().strftime('%I:%M %p')}</span>
            </div>
            <div class="info-item">
                <span class="info-label">From Location</span>
                <span class="info-value">{html.escape(from_location)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">To Location</span>
                <span class="info-value">{html.escape(to_location)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Transfer Initiated/Approved By</span>
                <span class="info-value">{html.escape(transferred_by)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Received By / Assigned To</span>
                <span class="info-value">{html.escape(received_by) if received_by else '—'}</span>
            </div>
            {f'''
            <div class="info-item" style="grid-column: span 2;">
                <span class="info-label">Reason for Transfer</span>
                <span class="info-value">{html.escape(reason)}</span>
            </div>
            ''' if reason else ''}
        </div>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 8%;" class="text-center">#</th>
                    <th style="width: 25%;">Item Name</th>
                    <th style="width: 8%;" class="text-center">Qty</th>
                    <th style="width: 22%;">Unique ID</th>
                    <th style="width: 17%;">Category</th>
                     <th style="width: 14%;">Assigned To</th>

                    <th style="width: 20%;" class="text-right">Value</th>
                </tr>
            </thead>
            <tbody>
                {table_rows}
            </tbody>
        </table>
        
        <div class="summary-section">
            <div class="summary-item">
                <div class="summary-label">Total Items</div>
                <div class="summary-value">{total_items}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Line Items</div>
                <div class="summary-value">{len(grouped_items)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Value</div>
                <div class="summary-value">{format_currency(total_value)}</div>
            </div>
        </div>
        
        <div class="signature-section">
            <div class="signature-grid">
                <div class="signature-box">
                    <div class="signature-title">Sent By</div>
                    <div class="signature-line"></div>
                    <div class="signature-label">Signature</div>
                    <div class="date-line">
                        <span>Date:</span>
                        <div class="line"></div>
                    </div>
                </div>
                <div class="signature-box">
                    <div class="signature-title">Received By</div>
                    <div class="signature-line"></div>
                    <div class="signature-label">Signature</div>
                    <div class="date-line">
                        <span>Date:</span>
                        <div class="line"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="report-footer">
            Generated on {datetime.now().strftime('%B %d, %Y')} at {datetime.now().strftime('%I:%M %p')} | Powered by KoderKids ERP
        </div>
    </div>
</body>
</html>
"""
    
    buffer = BytesIO()
    HTML(string=html_content).write_pdf(buffer, stylesheets=[page_css])
    buffer.seek(0)
    
    return buffer


# ============================================
# INVENTORY LIST PDF
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_inventory_list_report(request):
    """
    Generate Inventory List PDF with optional filters
    
    RBAC:
    - Admin: Can generate report for all items
    - Teacher: Report filtered to their assigned schools only
    """
    logger.info(f"Inventory list report request: {request.data}")
    
    try:
        user = request.user
        filters = request.data.get('filters', {})
        group_items = request.data.get('group_items', True)
        
        # Build queryset
        queryset = InventoryItem.objects.select_related('category', 'school', 'assigned_to')
        
        # RBAC filter first
        if not is_admin_user(user):
            allowed_schools = get_user_allowed_schools(user)
            queryset = queryset.filter(
                location='School',
                school_id__in=allowed_schools
            )
        
        # Apply additional filters
        if filters.get('location'):
            queryset = queryset.filter(location=filters['location'])
        if filters.get('school_id'):
            # Validate teacher can access this school
            if not is_admin_user(user):
                allowed = get_user_allowed_schools(user)
                if int(filters['school_id']) not in allowed:
                    return Response({"error": "Access denied to this school"}, status=403)
            queryset = queryset.filter(school_id=filters['school_id'])
        if filters.get('category_id'):
            queryset = queryset.filter(category_id=filters['category_id'])
        if filters.get('status'):
            queryset = queryset.filter(status=filters['status'])
        if filters.get('assigned_to_id'):
            queryset = queryset.filter(assigned_to_id=filters['assigned_to_id'])
        
        items = list(queryset.order_by('name'))
        
        if not items:
            return Response({"error": "No items found matching filters"}, status=404)
        
        # Group items if requested
        if group_items:
            display_items = group_items_by_name_category(items)
        else:
            display_items = [{
            'name': item.name,
            'qty': 1,
            'unique_ids': [item.unique_id],
            'category_name': item.category.name if item.category else 'Uncategorized',
            'status': item.status,
            'assigned_to_name': get_user_display_name(item.assigned_to) if item.assigned_to else 'Unassigned',
            'total_value': float(item.purchase_value or 0),
        } for item in items]
        
        total_items = len(items)
        total_value = sum(float(item.purchase_value or 0) for item in items)
        
        # Build filter description
        filter_desc = []
        if filters.get('location'):
            filter_desc.append(f"Location: {filters['location']}")
        if filters.get('school_id'):
            school = School.objects.filter(id=filters['school_id']).first()
            if school:
                filter_desc.append(f"School: {school.name}")
        if filters.get('category_id'):
            cat = InventoryCategory.objects.filter(id=filters['category_id']).first()
            if cat:
                filter_desc.append(f"Category: {cat.name}")
        if filters.get('status'):
            filter_desc.append(f"Status: {filters['status']}")
        
        pdf_buffer = generate_inventory_list_pdf(
            items=display_items,
            total_items=total_items,
            total_value=total_value,
            filter_description=', '.join(filter_desc) if filter_desc else 'All Items',
            generated_by=get_user_display_name(user),
        )
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        timestamp = datetime.now().strftime('%Y-%m-%d')
        response['Content-Disposition'] = f'attachment; filename="Inventory_Report_{timestamp}.pdf"'
        
        return response
        
    except Exception as e:
        logger.exception("Inventory list report generation failed")
        return Response({"error": str(e)}, status=500)


def generate_inventory_list_pdf(items, total_items, total_value, filter_description, generated_by):
    """Generate Inventory List PDF"""
    
    page_css = get_background_css()
    base_styles = get_base_styles()
    
    table_rows = ""
    for idx, item in enumerate(items, 1):
        unique_id_display = item['unique_ids'][0] if item['unique_ids'] else 'N/A'
        if len(item['unique_ids']) > 1:
            unique_id_display += f" <span style='color:#666;font-size:7pt;'>+{len(item['unique_ids'])-1} more</span>"
        
        status_class = f"status-{item['status'].lower()}" if item.get('status') else ''
        
        table_rows += f"""
        <tr>
            <td class="text-center">{idx}</td>
            <td>{html.escape(item['name'])}</td>
            <td class="text-center">{item['qty']}</td>
            <td><span class="unique-id">{unique_id_display}</span></td>
            <td>{html.escape(item['category_name'])}</td>
            <td class="text-center"><span class="status-badge {status_class}">{item.get('status', 'N/A')}</span></td>
            <td>{html.escape(item.get('assigned_to_name', 'Unassigned'))}</td>           <td class="text-right">{format_currency(item['total_value'])}</td>
        </tr>
        """
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        {base_styles}
    </style>
</head>
<body>
    <div class="page-content">
        <div class="report-header">
            <div class="report-title">INVENTORY LIST REPORT</div>
            <div class="report-subtitle">Comprehensive inventory listing</div>
        </div>
        
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Generated Date</span>
                <span class="info-value">{datetime.now().strftime('%B %d, %Y')}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Generated By</span>
                <span class="info-value">{html.escape(generated_by)}</span>
            </div>
            <div class="info-item" style="grid-column: span 2;">
                <span class="info-label">Filters Applied</span>
                <span class="info-value">{html.escape(filter_description)}</span>
            </div>
        </div>
        
        <table class="data-table">
            <thead>
               <thead>
                <tr>
                    <th style="width: 5%;" class="text-center">#</th>
                    <th style="width: 20%;">Item Name</th>
                    <th style="width: 5%;" class="text-center">Qty</th>
                    <th style="width: 18%;">Unique ID</th>
                    <th style="width: 12%;">Category</th>
                    <th style="width: 10%;" class="text-center">Status</th>
                    <th style="width: 15%;">Assigned To</th>
                    <th style="width: 15%;" class="text-right">Value</th>
                </tr>

            </thead>
            <tbody>
                {table_rows}
            </tbody>
        </table>
        
        <div class="summary-section">
            <div class="summary-item">
                <div class="summary-label">Total Items</div>
                <div class="summary-value">{total_items}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Line Items</div>
                <div class="summary-value">{len(items)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Value</div>
                <div class="summary-value">{format_currency(total_value)}</div>
            </div>
        </div>
        
        <div class="report-footer">
            Generated on {datetime.now().strftime('%B %d, %Y')} at {datetime.now().strftime('%I:%M %p')} | Powered by KoderKids ERP
        </div>
    </div>
</body>
</html>
"""
    
    buffer = BytesIO()
    HTML(string=html_content).write_pdf(buffer, stylesheets=[page_css])
    buffer.seek(0)
    
    return buffer


# ============================================
# ITEM DETAIL PDF (Certificate)
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_item_detail_report(request, item_id):
    """
    Generate single item detail certificate PDF
    
    RBAC:
    - Admin: Can generate for any item
    - Teacher: Only for items at assigned schools
    """
    logger.info(f"Item detail report request for item {item_id}")
    
    try:
        user = request.user
        item = InventoryItem.objects.select_related('category', 'school', 'assigned_to').get(id=item_id)
        
        # RBAC check
        if not is_admin_user(user):
            allowed_schools = get_user_allowed_schools(user)
            if item.location != 'School' or item.school_id not in allowed_schools:
                return Response({"error": "Access denied to this item"}, status=403)
        
        pdf_buffer = generate_item_detail_pdf(item, get_user_display_name(user))
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Item_Certificate_{item.unique_id}.pdf"'
        
        return response
        
    except InventoryItem.DoesNotExist:
        return Response({"error": "Item not found"}, status=404)
    except Exception as e:
        logger.exception("Item detail report generation failed")
        return Response({"error": str(e)}, status=500)


def generate_item_detail_pdf(item, generated_by):
    """Generate Item Detail Certificate PDF"""
    
    page_css = get_background_css()
    base_styles = get_base_styles()
    
    location_display = get_location_display(item)
    
    assigned_to_display = "Unassigned"
    if item.assigned_to:
        assigned_to_display = get_user_display_name(item.assigned_to)
    
    transfer_history = ""
    if item.notes:
        notes_lines = item.notes.strip().split('\n')
        for note in notes_lines:
            if note.strip().startswith('['):
                transfer_history += f"<li>{html.escape(note.strip())}</li>"
    
    status_class = f"status-{item.status.lower()}"
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        {base_styles}
        
        .detail-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4mm;
            margin-bottom: 6mm;
        }}
        
        .detail-item {{
            padding: 3mm;
            background-color: #f8f9fa;
            border-radius: 2mm;
            border-left: 3px solid #009688;
        }}
        
        .detail-label {{
            font-size: 8pt;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 1mm;
        }}
        
        .detail-value {{
            font-size: 11pt;
            font-weight: 500;
            color: #333;
        }}
        
        .history-section {{
            margin-top: 6mm;
            padding: 4mm;
            background-color: #fff3e0;
            border-radius: 3mm;
        }}
        
        .history-title {{
            font-size: 10pt;
            font-weight: 600;
            color: #e65100;
            margin-bottom: 3mm;
        }}
        
        .history-list {{
            margin: 0;
            padding-left: 5mm;
            font-size: 8pt;
            color: #666;
        }}
        
        .history-list li {{
            margin-bottom: 2mm;
        }}
    </style>
</head>
<body>
    <div class="page-content">
        <div class="report-header">
            <div class="report-title">ITEM CERTIFICATE</div>
            <div class="report-subtitle">Inventory item verification document</div>
        </div>
        
        <div style="text-align: center; padding: 4mm; background-color: #e0f2f1; border-radius: 3mm; margin-bottom: 6mm;">
            <div style="font-size: 9pt; color: #666; text-transform: uppercase;">Unique Identifier</div>
            <div style="font-size: 16pt; font-weight: 700; color: #009688; font-family: 'Consolas', monospace;">{html.escape(item.unique_id or 'N/A')}</div>
        </div>
        
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">Item Name</div>
                <div class="detail-value">{html.escape(item.name)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Category</div>
                <div class="detail-value">{html.escape(item.category.name if item.category else 'Uncategorized')}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value"><span class="status-badge {status_class}">{item.status}</span></div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Location</div>
                <div class="detail-value">{html.escape(location_display)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Purchase Value</div>
                <div class="detail-value">{format_currency(item.purchase_value)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Purchase Date</div>
                <div class="detail-value">{item.purchase_date.strftime('%B %d, %Y') if item.purchase_date else 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Assigned To</div>
                <div class="detail-value">{html.escape(assigned_to_display)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Serial Number</div>
                <div class="detail-value">{html.escape(item.serial_number or 'N/A')}</div>
            </div>
        </div>
        
        {f'''
        <div style="padding: 4mm; background-color: #f5f5f5; border-radius: 3mm; margin-bottom: 6mm;">
            <div style="font-size: 9pt; font-weight: 600; color: #333; margin-bottom: 2mm;">Description</div>
            <div style="font-size: 9pt; color: #666;">{html.escape(item.description)}</div>
        </div>
        ''' if item.description else ''}
        
        {f'''
        <div class="history-section">
            <div class="history-title">📋 Transfer History</div>
            <ul class="history-list">
                {transfer_history}
            </ul>
        </div>
        ''' if transfer_history else ''}
        
        <div class="signature-section">
            <div class="signature-grid">
                <div class="signature-box">
                    <div class="signature-title">Verified By</div>
                    <div class="signature-line"></div>
                    <div class="signature-label">Signature</div>
                    <div class="date-line">
                        <span>Date:</span>
                        <div class="line"></div>
                    </div>
                </div>
                <div class="signature-box">
                    <div class="signature-title">Approved By</div>
                    <div class="signature-line"></div>
                    <div class="signature-label">Signature</div>
                    <div class="date-line">
                        <span>Date:</span>
                        <div class="line"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="report-footer">
            Generated on {datetime.now().strftime('%B %d, %Y')} at {datetime.now().strftime('%I:%M %p')} by {html.escape(generated_by)} | Powered by KoderKids ERP
        </div>
    </div>
</body>
</html>
"""
    
    buffer = BytesIO()
    HTML(string=html_content).write_pdf(buffer, stylesheets=[page_css])
    buffer.seek(0)
    
    return buffer