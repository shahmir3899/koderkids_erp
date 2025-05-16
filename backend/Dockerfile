# Use an official Python runtime as the base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for WeasyPrint
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Collect static files (adjust if needed)
RUN python manage.py collectstatic --noinput

# Expose the port Render will use
EXPOSE $PORT

# Command to run the application
CMD ["gunicorn", "school_management.wsgi:application", "--bind", "0.0.0.0:$PORT"]