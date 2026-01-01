# ============================================
# EMAIL DIAGNOSTIC TEST SCRIPT
# Run this to see what Django is reading
# ============================================

# Save this as: backend/test_email_debug.py
# Run with: python test_email_debug.py

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
django.setup()

from django.conf import settings
from django.core.mail import send_mail

print("\n" + "="*60)
print("📧 EMAIL CONFIGURATION DIAGNOSTIC")
print("="*60)

print("\n1️⃣ ENVIRONMENT VARIABLES (.env file):")
print("-"*60)
print(f"EMAIL_HOST from env: {os.getenv('EMAIL_HOST')}")
print(f"EMAIL_PORT from env: {os.getenv('EMAIL_PORT')}")
print(f"EMAIL_HOST_USER from env: {os.getenv('EMAIL_HOST_USER')}")
print(f"EMAIL_HOST_PASSWORD from env: {'***' + os.getenv('EMAIL_HOST_PASSWORD', '')[-4:] if os.getenv('EMAIL_HOST_PASSWORD') else 'NOT SET'}")

print("\n2️⃣ DJANGO SETTINGS (what Django is using):")
print("-"*60)
print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
print(f"EMAIL_USE_SSL: {settings.EMAIL_USE_SSL}")
print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
print(f"EMAIL_HOST_PASSWORD: {'***' + settings.EMAIL_HOST_PASSWORD[-4:] if settings.EMAIL_HOST_PASSWORD else '❌ NOT SET'}")
print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")

print("\n3️⃣ DIAGNOSIS:")
print("-"*60)

issues = []

if not settings.EMAIL_HOST_USER:
    issues.append("❌ EMAIL_HOST_USER is empty")
    
if not settings.EMAIL_HOST_PASSWORD:
    issues.append("❌ EMAIL_HOST_PASSWORD is empty")
    
if settings.EMAIL_PORT != 465:
    issues.append(f"⚠️  EMAIL_PORT is {settings.EMAIL_PORT}, should be 465")
    
if not settings.EMAIL_USE_SSL:
    issues.append("❌ EMAIL_USE_SSL is False, should be True")

if issues:
    print("\n🔴 PROBLEMS FOUND:")
    for issue in issues:
        print(f"   {issue}")
    print("\n💡 FIX:")
    print("   1. Check .env file exists in backend/ folder")
    print("   2. Check .env file is named '.env' (with dot)")
    print("   3. Check EMAIL_HOST_USER and EMAIL_HOST_PASSWORD are set")
    print("   4. Restart Django server after fixing")
else:
    print("✅ Configuration looks good!")
    
    print("\n4️⃣ SENDING TEST EMAIL:")
    print("-"*60)
    
    try:
        send_mail(
            subject='Test Email from KoderKids ERP',
            message='This is a test email. If you receive this, email configuration is working!',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.EMAIL_HOST_USER],
            fail_silently=False,
        )
        print(f"✅ Test email sent to: {settings.EMAIL_HOST_USER}")
        print(f"📬 Check your inbox: {settings.EMAIL_HOST_USER}")
        print("   (It may take 1-2 minutes to arrive)")
        
    except Exception as e:
        print(f"❌ Failed to send email:")
        print(f"   Error: {str(e)}")
        print(f"\n💡 Common Causes:")
        print("   - Wrong email password")
        print("   - Email server blocking connection")
        print("   - Wrong port or SSL settings")

print("\n" + "="*60 + "\n")