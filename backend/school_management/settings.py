import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

# Load environment variables
# Supabase Storage Configuration
SUPABASE_URL = "https://vjulyxmuswlktvlvdhhi.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdWx5eG11c3dsa3R2bHZkaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDkyMTMyNCwiZXhwIjoyMDU2NDk3MzI0fQ.civdal8JUya2xw1jS6Tc_J_JJex2N5r2hewPAR5NPqc"
SUPABASE_BUCKET = "profile-photos"

# Get the BASE_DIR (Project Root)
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from the backend folder
load_dotenv()

# Secret key & Debug mode from environment
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "fallback-secret-key")
DEBUG = True
DJANGO_DEBUG = True

# Database Configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'postgres',
        'USER': 'postgres.vjulyxmuswlktvlvdhhi',
        'PASSWORD': 'No@Sorry&703##',
        'HOST': 'aws-0-ap-southeast-1.pooler.supabase.com',
        'PORT': '6543',
        'OPTIONS': {
            'sslmode': 'require',
        },
        # Connection pooling settings for Supabase
        'CONN_MAX_AGE': 60,  # Keep connections alive for 60 seconds
        'CONN_HEALTH_CHECKS': True,  # Check connection health before use
    }
}

# Caching Configuration (Django's built-in database cache)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'cache_table',
    }
}

# Static Files (CSS, JavaScript, etc.)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# Static Files Directories (Only in Development)
if os.getenv("DEBUG", "True") == "True":
    STATICFILES_DIRS = [os.path.join(BASE_DIR, "static")]
else:
    STATICFILES_DIRS = []

# Media Files (User Uploads)
MEDIA_URL = '/media/'

# Allowed Hosts
ALLOWED_HOSTS = [
    '127.0.0.1',
    'localhost',
    'frontend.koderkids.pk',
    'portal.koderkids.pk',
    'koderkids-erp.onrender.com'
]
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# CORS Headers
CORS_ALLOW_HEADERS = [
    'content-type',
    'authorization',
    'x-requested-with',
]

# Installed Apps
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'django_filters',
    'students',
    'employees',
    'books',
    'reports',
    'finance',
    'inventory',
    'authentication',
    'lessons',
    'attendance',
    'dashboards',
    'crm',
    'tasks',
    'commands',
    'ai',
    'courses',
    'aigala',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
]

# Middleware
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Timezone Configuration (Pakistan Standard Time)
TIME_ZONE = 'Asia/Karachi'
USE_TZ = True
USE_I18N = True
USE_L10N = True

# URL Configuration
ROOT_URLCONF = 'school_management.urls'

# Templates
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, "templates")],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# CORS & CSRF Settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://frontend.koderkids.pk",
    "https://portal.koderkids.pk",
    "https://koderkids-erp.onrender.com",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
CORS_ALLOW_ALL_ORIGINS = True  # TODO: Set back to False in production
CSRF_TRUSTED_ORIGINS = [
    "https://frontend.koderkids.pk",
    "https://portal.koderkids.pk",
    "https://koderkids-erp.onrender.com",
]
# Cache CORS preflight requests for 24 hours
CORS_PREFLIGHT_MAX_AGE = 86400

# Authentication & JWT
AUTH_USER_MODEL = 'students.CustomUser'
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ]
}
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================
# EMAIL CONFIGURATION (Hostnext cPanel - SSL)
# ============================================
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'mail.koderkids.pk')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '465'))  # SSL port as string to avoid int() error
EMAIL_USE_TLS = False  # Don't use TLS
EMAIL_USE_SSL = True   # Use SSL on port 465
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', 'admin@koderkids.pk')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'KoderKids ERP <admin@koderkids.pk>')
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Email timeout (in seconds)
EMAIL_TIMEOUT = 10

# Debug: Print email settings on startup (REMOVE IN PRODUCTION)
print("\n" + "="*50)
print("EMAIL CONFIGURATION LOADED:")
print("="*50)
print(f"HOST: {EMAIL_HOST}")
print(f"PORT: {EMAIL_PORT}")
print(f"USER: {EMAIL_HOST_USER}")
print(f"SSL: {EMAIL_USE_SSL}")
print(f"PASSWORD SET: {'Yes' if EMAIL_HOST_PASSWORD else 'No (MISSING!)'}")
print(f"FROM EMAIL: {DEFAULT_FROM_EMAIL}")
print("="*50 + "\n")

# ============================================
# AI/LLM CONFIGURATION
# ============================================
# Provider preference: comma-separated list (first available will be used)
# Options: "ollama" (local), "groq" (cloud, free tier)
# For production on Render: use "groq" or "groq,ollama"
# For local development: use "ollama,groq" or just "ollama"
LLM_PROVIDER = os.getenv('LLM_PROVIDER', 'ollama,groq')

# Ollama (local LLM - for development)
OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'deepseek-coder:6.7b')
OLLAMA_TIMEOUT = int(os.getenv('OLLAMA_TIMEOUT', '180'))  # 3 minutes

# Groq (cloud LLM - for production, free tier available)
# Get your free API key at: https://console.groq.com/keys
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
GROQ_MODEL = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')  # Groq's latest model

# AI Agent Settings
AI_CONFIRMATION_EXPIRY = 300  # 5 minutes for delete confirmations
AI_ENABLE_AUDIT_LOG = True
AI_FALLBACK_TO_TEMPLATE = True  # Use template mode if LLM unavailable

# ============================================
# LOGGING CONFIGURATION
# ============================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'ai': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'ai.ollama_client': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'ai.service': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}