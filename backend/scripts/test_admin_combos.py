import urllib.request
import urllib.error
import json

def try_login(email, password):
    data = json.dumps({'email': email, 'password': password}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode())
            return f"SUCCESS (Role: {res.get('role')})"
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}: {e.read().decode()[:120]}"
    except Exception as e:
        return f"ERROR: {e}"

combos = [
    ("admin@oakridge.edu", "AdminPassword123!"),
    ("admin@oakridge.edu", "admin123"),
    ("admin@oakridge.edu", "admin"),
    ("admin@oakridge.edu", "Admin123!"),
    ("admin@oakridge.edu", "admin@123"),
    ("admin@oakridge.edu", "password"),
    ("admin", "AdminPassword123!"),
    ("admin", "admin123"),
    ("admin", "admin"),
    ("admin@admin.com", "AdminPassword123!"),
    ("admin@admin.com", "admin123"),
    ("admin@admin.com", "admin"),
]

for em, pw in combos:
    print(f"'{em}' / '{pw}' -> {try_login(em, pw)}")

