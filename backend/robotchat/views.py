from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests
import os
from dotenv import load_dotenv

# ✅ Load environment variables from .env
load_dotenv()

# ✅ Get Hugging Face API Key from .env
HF_API_KEY = os.getenv("HF_API_KEY")

# ✅ Hugging Face Model Endpoint
HF_API_URL = "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill"

def get_hf_reply(user_input):
    """Send a message to Hugging Face API and get the reply."""
    if not HF_API_KEY:
        print("⚠️ Hugging Face API Key is missing!")
        return "API key is not set. Please configure it correctly."

    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    payload = {"inputs": user_input}

    try:
        # Make a POST request to Hugging Face API
        response = requests.post(HF_API_URL, headers=headers, json=payload)

        # ✅ Successful response
        if response.status_code == 200:
            result = response.json()
            # Check if result is valid and contains generated text
            if isinstance(result, list) and len(result) > 0 and "generated_text" in result[0]:
                return result[0]["generated_text"]
            else:
                return "Sorry, I couldn't process your request."
        
        # ❌ Handle API error responses
        elif response.status_code == 503:
            return "Model is loading. Please wait a moment."
        elif response.status_code == 401:
            return "Unauthorized request. Please check your API key."
        else:
            return f"Error: {response.status_code} - Unable to process request."

    except requests.RequestException as e:
        print(f"❌ Hugging Face API error: {e}")
        return "Sorry, something went wrong while connecting to Hugging Face."

@api_view(['POST'])
def robot_reply(request):
    """Handle user messages and return a chatbot reply."""
    user_input = request.data.get("message", "")

    if not user_input.strip():
        return Response({"reply": "Please say something."}, status=400)

    # 🎯 Get reply from Hugging Face API
    reply = get_hf_reply(user_input)

    # ✅ Return the generated reply
    return Response({"reply": reply})
