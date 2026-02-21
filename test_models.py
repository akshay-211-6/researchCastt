from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("ERROR: No GOOGLE_API_KEY found in .env file!")
    exit()

client = genai.Client(api_key=api_key)

# Test these models one by one
models_to_test = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-latest",
]

print("Testing models with your API key...\n")

for model_name in models_to_test:
    try:
        response = client.models.generate_content(
            model    = model_name,
            contents = "Say hello in one word.",
        )
        print(f"✅ WORKS: {model_name} → {response.text.strip()}")
    except Exception as e:
        err = str(e)
        if "429" in err:
            print(f"⚠️  RATE LIMITED: {model_name} (works but quota hit)")
        elif "404" in err:
            print(f"❌ NOT FOUND: {model_name}")
        elif "403" in err:
            print(f"🔒 PERMISSION DENIED: {model_name}")
        else:
            print(f"❌ ERROR: {model_name} → {err[:80]}")