import re

# Input and output file paths
input_file = "students_student_updated.sql"  # Replace with your actual SQL file name
output_file = "students_student_updated2.sql"

# Mapping of old school IDs to new ones
school_id_mapping = {"'7'": "'1'", "'8'": "'2'", "'9'": "'3'"}  # Match exact values

# Read the SQL file
with open(input_file, "r", encoding="utf-8") as f:
    sql_data = f.read()

# # ✅ Rename `school` to `school_id`
# sql_data = sql_data.replace("school", "school_id")

# # ✅ Replace school_id values correctly
for old_id, new_id in school_id_mapping.items():
    sql_data = sql_data.replace(old_id, new_id)

# Write the modified SQL to a new file
with open(output_file, "w", encoding="utf-8") as f:
    f.write(sql_data)

print(f"✅ Updated SQL file saved as: {output_file}")
