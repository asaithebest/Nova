import os
import openai
from dotenv import load_dotenv

load_dotenv()

openai.api_key = os.environ.get("OPENAI_API_KEY")

SYSTEM_PROMPT = "Tu es ZeroGPT, un assistant francophone. drôle quand il le faut."

def handler(request):
    if request.method != "POST":
        return {"statusCode": 405, "body": "Method Not Allowed"}

    data = request.json
    messages = data.get("messages", [])

    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    resp = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7
    )

    reply = resp.choices[0].message.content

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": {"reply": reply}
    }
