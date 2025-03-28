from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests
import os

# ✅ Add Your Hugging Face API Key
HF_API_KEY = os.getenv("HF_API_KEY")


# ✅ Use Hugging Face Inference API (BlenderBot Model)
HF_API_URL = "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill"

def get_hf_reply(user_input):
    """Send message to Hugging Face API and get the reply."""
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    payload = {"inputs": user_input}

    try:
        response = requests.post(HF_API_URL, headers=headers, json=payload)

        if response.status_code == 200:
            # Get reply from the API response
            result = response.json()
            if isinstance(result, list) and len(result) > 0 and "generated_text" in result[0]:
                return result[0]["generated_text"]
            else:
                return "I'm sorry, I couldn't process that."
        else:
            return "Error: Unable to get a response from Hugging Face API."
    except Exception as e:
        print(f"❌ Hugging Face API error: {e}")
        return "Sorry, something went wrong."

@api_view(['POST'])
def robot_reply(request):
    """Handle user messages and return robot reply."""
    user_input = request.data.get("message", "")

    if not user_input.strip():
        return Response({"reply": "Please say something."}, status=400)

    # 🎯 Get AI response from Hugging Face API
    reply = get_hf_reply(user_input)

    # Return the generated response
    return Response({"reply": reply})
