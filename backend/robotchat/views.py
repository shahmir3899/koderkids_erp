from rest_framework.decorators import api_view
from rest_framework.response import Response
import logging

from ai.llm_client import get_llm_client

logger = logging.getLogger(__name__)

# System prompt for the student-friendly robot assistant
ROBOT_SYSTEM_PROMPT = """You are a friendly, helpful robot assistant for students at Koder Kids coding school.
Your name is "Kody" and you help students with:
- Answering questions about coding and programming concepts
- Explaining homework or lesson topics in simple terms
- Providing encouragement and motivation
- Helping with general school-related questions

Guidelines:
- Keep responses concise and easy to understand (2-3 sentences max for simple questions)
- Use simple language appropriate for young students (ages 6-15)
- Be encouraging and positive
- If asked about something inappropriate or off-topic, gently redirect to learning
- Never provide complete homework answers - guide students to learn instead
- Use occasional emojis to be friendly but don't overdo it"""


def get_robot_reply(user_input):
    """Get a reply from the LLM using Groq API."""
    try:
        client = get_llm_client()

        result = client.generate_sync(
            prompt=user_input,
            system_prompt=ROBOT_SYSTEM_PROMPT,
            temperature=0.7,  # Slightly creative for friendly responses
            max_tokens=200    # Keep responses concise
        )

        if result['success']:
            response = result['response']
            logger.info(f"Robot reply generated via {result['provider']} in {result['response_time_ms']}ms")
            return response
        else:
            logger.error(f"LLM error: {result['error']}")
            return "I'm having trouble thinking right now. Can you try asking again?"

    except Exception as e:
        logger.error(f"Robot chat error: {e}")
        return "Oops! Something went wrong. Please try again in a moment."


@api_view(['POST'])
def robot_reply(request):
    """Handle user messages and return a chatbot reply."""
    user_input = request.data.get("message", "")

    if not user_input.strip():
        return Response({"reply": "Please say something."}, status=400)

    # Get reply from LLM (Groq API)
    reply = get_robot_reply(user_input)

    return Response({"reply": reply})
