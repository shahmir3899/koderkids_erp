import sys
sys.path.insert(0, 'backend')
import django, os
os.environ['DJANGO_SETTINGS_MODULE'] = 'school_management.settings'
django.setup()
from django.conf import settings
db = settings.DATABASES['default']
import psycopg2
conn = psycopg2.connect(host=db['HOST'], port=db['PORT'], user=db['USER'], password=db['PASSWORD'], dbname='postgres', sslmode='require')
conn.autocommit = True
cursor = conn.cursor()
sql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'test_postgres' AND pid <> pg_backend_pid()"
cursor.execute(sql)
rows = cursor.fetchall()
print(f'Terminated: {len(rows)} sessions')
conn.close()
