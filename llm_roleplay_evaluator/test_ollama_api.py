"""測試 Ollama 的兩種 API endpoint"""
import requests
import json

# 測試 /api/chat (Ollama 原生)
print("=== Testing /api/chat (Ollama native) ===")
payload1 = {
    "model": "qwen2.5:14b",
    "messages": [
        {"role": "user", "content": "Hey Lucky! What have you been up to?"}
    ],
    "system": "You are Lucky, a cheerful character who loves space and cheese.",
    "stream": False
}

response1 = requests.post("http://127.0.0.1:11434/api/chat", json=payload1)
print(f"Status: {response1.status_code}")
if response1.ok:
    result1 = response1.json()
    print(f"Response: {result1.get('message', {}).get('content', 'N/A')[:200]}")
else:
    print(f"Error: {response1.text[:200]}")

print("\n" + "="*60)

# 測試 /v1/chat/completions (OpenAI 兼容)
print("=== Testing /v1/chat/completions (OpenAI compatible) ===")
payload2 = {
    "model": "qwen2.5:14b",
    "messages": [
        {"role": "system", "content": "You are Lucky, a cheerful character who loves space and cheese."},
        {"role": "user", "content": "Hey Lucky! What have you been up to?"}
    ],
    "stream": False
}

response2 = requests.post("http://127.0.0.1:11434/v1/chat/completions", json=payload2)
print(f"Status: {response2.status_code}")
if response2.ok:
    result2 = response2.json()
    print(f"Response: {result2.get('choices', [{}])[0].get('message', {}).get('content', 'N/A')[:200]}")
else:
    print(f"Error: {response2.text[:200]}")
