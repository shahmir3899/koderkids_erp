from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

# Load model and tokenizer once
# Switch to DialoGPT-medium for better replies
tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium")
model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-medium")


# Keep track of conversation history (optional)
chat_history_ids = None

@api_view(['POST'])
def robot_reply(request):
    global chat_history_ids
    user_input = request.data.get("message", "")

    if not user_input:
        return Response({"reply": "Please say something."}, status=400)

    # Encode user input and append to history (if any)
    new_input_ids = tokenizer.encode(user_input + tokenizer.eos_token, return_tensors='pt')
    input_ids = torch.cat([chat_history_ids, new_input_ids], dim=-1) if chat_history_ids is not None else new_input_ids

    # Generate response
    chat_history_ids = model.generate(input_ids, max_length=1000, pad_token_id=tokenizer.eos_token_id)
    reply = tokenizer.decode(chat_history_ids[:, input_ids.shape[-1]:][0], skip_special_tokens=True)

    return Response({"reply": reply})
