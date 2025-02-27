import os
import django
import pandas as pd

# Step 1: Set up Django environment
print("Step 1: Setting up Django environment...")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "school_management.settings")
django.setup()
print("✅ Django environment set up successfully!\n")

# Step 2: Load Excel file
file_path = "reg_data.xlsx"
if not os.path.exists(file_path):
    print(f"❌ Error: {file_path} not found! Exiting...")
    exit()

print("Step 2: reg_data.xlsx found. Loading the file...")
df = pd.read_excel(file_path)
print("✅ Excel file loaded successfully!\n")

# Step 3: Print first few rows to inspect data
print("Step 3: Displaying first few rows of the dataset...\n")
print(df.head())

# Step 4: Rename columns to match Django model field names
df.rename(columns={
    "Date of Registration": "date_of_registration",
    "Reg Num": "reg_num",
    "Student Name": "name",
    "Gender": "gender",
    "School": "school",
    "Monthly Fee": "monthly_fee",
    "DOB": "date_of_birth",
    "Class": "student_class",
    "Phone": "phone",
    "Address": "address",
}, inplace=True)
print("✅ Step 4: Columns renamed successfully.\n")

# Step 5: Check for missing values
print("Step 5: Checking for missing values in each column...\n")
missing_values = df.isnull().sum()
print(missing_values)
print("\n")
# Step 6: Fill or Handle Missing Values
print("Step 6: Handling missing values...\n")

# Fill missing date values with "2000-01-01" or None (if allowed)
df["date_of_registration"] = pd.to_datetime(df["date_of_registration"], errors='coerce')
df["date_of_birth"] = pd.to_datetime(df["date_of_birth"], errors='coerce')

df["date_of_registration"] = df["date_of_registration"].apply(lambda x: x.date() if pd.notna(x) else None)
df["date_of_birth"].fillna(pd.to_datetime("1900-01-01"), inplace=True)
df["date_of_birth"] = df["date_of_birth"].apply(lambda x: x.date())

# Fill missing text values with "Unknown"
df.fillna({
    "reg_num": "Unknown",
    "name": "Unknown",
    "gender": "Unknown",
    "school": "Unknown",
    "monthly_fee": 0,
    "student_class": "Unknown",
    "phone": "Unknown",
    "address": "Unknown"
}, inplace=True)

print("✅ Step 6: Missing values handled.\n")
df["status"] = "Active"  # Set default status
print("Staus Added\n")
# Step 7: Print cleaned DataFrame
print("Step 7: Displaying cleaned dataset preview...\n")
print(df.head())

# Step 8: Import Django Model
from students.models import Student
print("✅ Step 8: Django model imported.\n")
#Step Extra
print("\n🟡 Checking for missing date_of_birth values...")
missing_dob = df[df["date_of_birth"].isna()]
print(missing_dob)
print(f"\n⚠️ Total students with missing DOB: {len(missing_dob)}\n")


# Step 9: Insert Data into Database (Avoid Duplicates)
print("Step 9: Inserting data into the database...\n")
added_count = 0
skipped_count = 0

for index, row in df.iterrows():
    if not Student.objects.filter(reg_num=row["reg_num"]).exists():
        Student.objects.create(
            date_of_registration=row["date_of_registration"],
            reg_num=row["reg_num"],
            name=row["name"],
            gender=row["gender"],
            school=row["school"],
            monthly_fee=row["monthly_fee"],
            date_of_birth=row["date_of_birth"],
            student_class=row["student_class"],
            phone=row["phone"],
            address=row["address"],
            status=row["status"]
        )
        added_count += 1
        print(f"✅ Added: {row['name']} ({row['reg_num']})")
    else:
        skipped_count += 1
        print(f"⚠️ Skipped (Duplicate): {row['name']} ({row['reg_num']})")

print(f"\n✅ Import Completed: {added_count} students added, {skipped_count} duplicates skipped.")
