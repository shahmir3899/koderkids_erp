import pandas as pd
import requests

# Load Excel
df = pd.read_excel("school_2.xlsx")
print(df.head())
# Convert to list of dicts
students = df.to_dict(orient="records")

# ✅ Clean timestamps
for student in students:
    if isinstance(student.get("date_of_registration"), pd.Timestamp):
        student["date_of_registration"] = student["date_of_registration"].strftime("%Y-%m-%d")

headers = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQzMDcxNTExLCJpYXQiOjE3NDI5ODUxMTEsImp0aSI6IjU2OWVjYjRiYjZkODQxN2M4NTU2NTljZjE2N2E4ZmNhIiwidXNlcl9pZCI6Mn0._m84ViH-e3nqeOZYmgookxPKCqF3-KgoxLjqufMzA9o"
}
url = "https://koderkids-erp.onrender.com/api/students/"


for student in students:
    response = requests.post(url, json=student, headers=headers)
    print(response.status_code, response.text)