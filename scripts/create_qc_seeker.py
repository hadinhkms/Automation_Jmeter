"""Tạo tài khoản seeker QC ngẫu nhiên (đăng ký bằng email) + accept personal-data consent.

    python -I scripts/create_qc_seeker.py              # in JSON {seeker_id, email, token, file}
    python -I scripts/create_qc_seeker.py --token-only # chỉ in token (dùng cho -Jtoken=...)

Tài khoản lưu ở runs/accounts/<seeker_id>.json (runs/ đã gitignore). Không in password.
Chỉ chạy với host QC.
"""
import base64
import json
import os
import random
import secrets
import string
import sys
import time
import urllib.error
import urllib.request
import uuid

API = os.environ.get("QC_API", "https://api.vl24hv2.qc.sieuviet-team.com")
BRANCH = os.environ.get("QC_BRANCH", "vl24h.north")
# Guest JWT (user=null) lấy từ request đăng ký thật trên web QC
GUEST_TOKEN = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjaGFubmVsX2NvZGUiOiJ2bDI0aCIsInVzZXIiOm51bGx9"
               ".b_GBXepcnCjRzAc9I5OdamF0Mx2K1rEg9sZVYpNx_rU")
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "runs", "accounts")


def call(path, token, body):
    headers = {
        "accept": "application/json", "content-type": "application/json", "authorization": f"Bearer {token}",
        "x-branch": BRANCH, "x-lang": "vi", "origin": "https://seeker.vl24hv2.qc.sieuviet-team.com",
        "referer": "https://seeker.vl24hv2.qc.sieuviet-team.com/", "x-request-id": str(uuid.uuid4()),
        "x-correlation-id": str(uuid.uuid4()),
    }
    req = urllib.request.Request(API + path, data=json.dumps(body).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
    except urllib.error.HTTPError as e:
        raw = e.read()
    try:
        return json.loads(raw)
    except ValueError:
        sys.exit(f"{path}: response không phải JSON: {raw[:200]!r}")


def find_token(obj):
    """Tìm chuỗi JWT có user trong response (vị trí field có thể khác nhau)."""
    if isinstance(obj, str) and obj.count(".") == 2 and obj.startswith("eyJ"):
        return obj
    if isinstance(obj, dict):
        obj = list(obj.values())
    if isinstance(obj, list):
        for v in obj:
            t = find_token(v)
            if t:
                return t
    return None


def jwt_user(token):
    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload)).get("user") or {}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    if ".qc." not in API:
        sys.exit(f"Từ chối host không phải QC: {API}")
    suffix = f"{int(time.time())}{random.randint(100, 999)}"
    email = f"hadtv.nlsv.test+auto_{suffix}@gmail.com"
    password = "Qa@" + "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
    body = {
        "name": f"QA Auto {suffix[-6:]}",
        "password": password,
        "mobile": "09" + "".join(random.choice(string.digits) for _ in range(8)),
        "is_check_policy": True,
        "email": email,
    }
    reg = call("/seeker/fe/register", GUEST_TOKEN, body)
    token = find_token(reg.get("data"))
    if str(reg.get("code")) != "200" or not token:
        sys.exit(f"Đăng ký lỗi: code={reg.get('code')} msg={reg.get('msg')} data={str(reg.get('data'))[:300]}")
    consent = call("/seeker/fe/me/personal-data-consent/accept", token,
                   {"platform": "web", "source": "login", "login_method": "email"})
    if str(consent.get("code")) != "200":
        sys.exit(f"Accept consent lỗi: code={consent.get('code')} msg={consent.get('msg')}")

    seeker_id = jwt_user(token).get("id")
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.normpath(os.path.join(OUT_DIR, f"{seeker_id}.json"))
    account = {"seeker_id": seeker_id, "email": email, "password": password, "mobile": body["mobile"],
               "name": body["name"], "branch": BRANCH, "token": token,
               "created_at": time.strftime("%Y-%m-%d %H:%M:%S")}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(account, f, ensure_ascii=False, indent=2)

    if "--token-only" in sys.argv:
        print(token)
    else:
        print(json.dumps({"seeker_id": seeker_id, "email": email, "token": token, "file": path}, ensure_ascii=False))


if __name__ == "__main__":
    main()
