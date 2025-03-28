import requests

def get_hf_reply(message):
    url = "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill"
    headers = {"Authorization": "Bearer YOUR_HF_API_KEY"}
    payload = {"inputs": message}

    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        return response.json()[0]["generated_text"]
    else:
        return "I'm sorry, I couldn't process that."
