# ============================================
# AUTHENTICATION UTILITIES
# ============================================

import random
import string


def generate_random_password(length=12):
    """
    Generate a random password with:
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - Minimum length of 12 characters (or specified length)
    """
    if length < 8:
        length = 8
    
    # Ensure at least one of each required character type
    password = [
        random.choice(string.ascii_uppercase),  # At least one uppercase
        random.choice(string.ascii_lowercase),  # At least one lowercase
        random.choice(string.digits),           # At least one digit
    ]
    
    # Fill the rest with random characters
    all_characters = string.ascii_letters + string.digits
    password += [random.choice(all_characters) for _ in range(length - 3)]
    
    # Shuffle to avoid predictable patterns
    random.shuffle(password)
    
    return ''.join(password)


def validate_password_strength(password):
    """
    Validate password meets minimum requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one digit
    
    Returns: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not any(char.isupper() for char in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(char.isdigit() for char in password):
        return False, "Password must contain at least one digit"
    
    return True, ""