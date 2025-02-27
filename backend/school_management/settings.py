from datetime import timedelta
import os
from pathlib import Path
from dotenv import load_dotenv # type: ignore

load_dotenv()  # Load .env variables

NGROK_URL = os.getenv("NGROK_URL", "").strip()  # Read from .env file
if not NGROK_URL.startswith("http"):
    NGROK_URL = "https://default.ngrok-url.com"  # Fallback to prevent Django errors
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'your-secret-key'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

DEBUG = True

AUTH_USER_MODEL = 'students.CustomUser'  # ✅ Use CustomUser instead of default User

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, "templates")],  # Ensure this is set correctly
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


ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'frontend.koderkids.pk', 'testserver', 'django-server-production-7046.up.railway.app']


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
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # For logout functionality
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    
]

ROOT_URLCONF = 'school_management.urls'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / "db.sqlite3",
        'OPTIONS': {
            'timeout': 30,  # ✅ Increase timeout to prevent locking (default is 5)
        }
    }
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://frontend.koderkids.pk",  # ✅ Allow frontend domain
    "https://django-server-production-7046.up.railway.app"  # ✅ Allow backend itself
]


#

# Additional settings for wider compatibility
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "Authorization",
    "Content-Type",
    "Accept",
    "X-CSRFToken",
]

CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]

CSRF_TRUSTED_ORIGINS = [
    
    "https://frontend.koderkids.pk",
    "https://django-server-production-7046.up.railway.app"
]




ALLOWED_HOSTS = [
    '127.0.0.1',
    'localhost', 
    'frontend.koderkids.pk',
    'frontend.koderkids.pk/login'
    'django-server-production-7046.up.railway.app'
]
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),  # Token expires in 1 day
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7), # Refresh token valid for 7 days
    'AUTH_HEADER_TYPES': ('Bearer',),
}


CORS_ALLOW_ALL_ORIGINS = True



STATIC_URL = '/static/'



MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")  # Store all media files here
