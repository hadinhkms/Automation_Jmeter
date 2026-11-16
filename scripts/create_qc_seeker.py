"""Tạo tài khoản seeker QC ngẫu nhiên (đăng ký bằng email) + accept personal-data consent.

    python -I scripts/create_qc_seeker.py              # in JSON {seeker_id, email, token, file}
    python -I scripts/create_qc_seeker.py --token-only # chỉ in token (dùng cho -Jtoken=...)

Tài khoản lưu ở runs/accounts/<seeker_id>.json (runs/ đã gitignore). Không in password.
Chỉ chạy với host QC.

Guest JWT (user=null) cho API register lấy từ env QC_GUEST_TOKEN, hoặc file qc-guest-token.local
ở gốc repo (gitignore *.local). Lấy token từ request /seeker/fe/register trên web QC (DevTools).
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
REPO_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
GUEST_TOKEN_FILE = os.path.join(REPO_ROOT, "qc-guest-token.local")
OUT_DIR = os.path.join(REPO_ROOT, "runs", "accounts")


def guest_token():
    token = os.environ.get("QC_GUEST_TOKEN", "").strip()
    if not token and os.path.isfile(GUEST_TOKEN_FILE):
        with open(GUEST_TOKEN_FILE, encoding="utf-8") as f:
            token = f.read().strip()
    if not token:
        sys.exit("Thiếu guest token: đặt env QC_GUEST_TOKEN hoặc tạo file qc-guest-token.local ở gốc repo")
    return token


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
    # BE yêu cầu >= 8 ký tự, có ít nhất 1 chữ và 1 số
    password = "Qa@" + secrets.choice(string.digits) + "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
    body = {
        "name": f"QA Auto {suffix[-6:]}",
        "password": password,
        "mobile": "09" + "".join(random.choice(string.digits) for _ in range(8)),
        "is_check_policy": True,
        "email": email,
    }
    reg = call("/seeker/fe/register", guest_token(), body)
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
