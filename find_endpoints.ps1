# find_endpoints.ps1
# Script to search for backend API endpoint calls in the frontend React codebase

# Navigate to frontend source directory
Set-Location -Path "frontend/src"

Write-Host "=== SEARCHING FOR API ENDPOINTS ===" -ForegroundColor Green

# List of backend endpoint names to search for
$endpoints = @(
    "get_logged_in_user", "get_students", "add_student", "update_student", "delete_student",
    "get_schools", "schools_list", "get_schools_with_classes", "get_classes", "get_school_details",
    "get_fees", "update_fees", "create_new_month_fees", "create_single_fee", "delete_fees",
    "fee_received_per_month", "students_per_school", "new_registrations",
    "create_lesson_plan", "bulk_create_lesson_plans", "get_lesson_plan", "get_lesson_plan_range",
    "update_planned_topic", "update_achieved_topic", "delete_lesson_plan", "get_lessons_achieved",
    "mark_attendance", "submit_attendance", "get_attendance", "update_attendance", "get_attendance_count",
    "upload_student_image", "get_student_images", "get_class_image_count",
    "students_progress", "get_student_details", "get_student_progress_images",
    "get_teacher_dashboard_lessons", "teacher-lesson-status", "teacher-lessons-by-month",
    "teacher-upcoming-lessons", "teacher-lessons-by-school", "teacher-student-engagement",
    "get_student_attendance_counts", "get_student_achieved_topics_count", "get_student_image_uploads_count",
    "my_student_data", "my-data", "register_user", "debug_cors"
)

$results = @{}

foreach ($endpoint in $endpoints) {
    $found = Get-ChildItem -Recurse -Include *.js,*.jsx | Select-String -Pattern $endpoint -List
    $results[$endpoint] = @($found).Count
}

Write-Host "`n=== RESULTS ===" -ForegroundColor Yellow

Write-Host "`nENDPOINTS FOUND (USED):" -ForegroundColor Green
$results.GetEnumerator() | Where-Object { $_.Value -gt 0 } | Sort-Object Name | ForEach-Object {
    Write-Host "  ✅ $($_.Key) - Found $($_.Value) times" -ForegroundColor Green
}

Write-Host "`nENDPOINTS NOT FOUND (POTENTIALLY UNUSED):" -ForegroundColor Red
$results.GetEnumerator() | Where-Object { $_.Value -eq 0 } | Sort-Object Name | ForEach-Object {
    Write-Host "  → $($_.Key) - NOT FOUND" -ForegroundColor Red
}

# Export results to CSV in the project root
$results.GetEnumerator() | Sort-Object Name | Export-Csv -Path "../../endpoint_usage.csv" -NoTypeInformation

Write-Host "`n✅ Results exported to endpoint_usage.csv" -ForegroundColor Cyan

# Return to original directory (optional, but good practice)
Set-Location -Path "../../"