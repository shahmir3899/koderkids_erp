import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

# Load environment variables
# Supabase Storage Configuration
SUPABASE_URL = "https://vjulyxmuswlktvlvdhhi.supabase.co"  # Your Supabase Project URL
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdWx5eG11c3dsa3R2bHZkaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDkyMTMyNCwiZXhwIjoyMDU2NDk3MzI0fQ.civdal8JUya2xw1jS6Tc_J_JJex2N5r2hewPAR5NPqc"  # Your Service Role Key
SUPABASE_BUCKET = "student-images"  # Your Supabase bucket name

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
    'koderkids-erp.onrender.com'
]

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
    'students',
    'employees',
    'reports',
    'finance',
    'inventory',
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
    "https://frontend.koderkids.pk",
    "https://koderkids-erp.onrender.com",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
CORS_ALLOW_ALL_ORIGINS = False
CSRF_TRUSTED_ORIGINS = [
    "https://frontend.koderkids.pk",
    "https://koderkids-erp.onrender.com",
]

# Authentication & JWT
AUTH_USER_MODEL = 'students.CustomUser'
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'