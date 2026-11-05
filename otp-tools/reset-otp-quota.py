"""Reset OTP daily quota on QC by deleting today's seeker.request_otp_history rows of one phone.

Usage:
  python -I otp-tools/reset-otp-quota.py 0971344520          # preview only
  python -I otp-tools/reset-otp-quota.py 0971344520 --yes    # delete today's rows

Credentials come from env QC_DB_USER / QC_DB_PASS (process or Windows user scope),
or from D:/_Account_DB/qc_db.env (override path with QC_DB_ENV_FILE).
Refuses any host that is not a QC host.
"""
import os
import re
import subprocess
import sys

import pymysql

DEFAULT_HOST = "vl24h-v2-qc-main.cgnrstcndgfr.ap-east-1.rds.amazonaws.com"
ACCOUNT_FILE = r"D:\_Account_DB\qc_db.env"
WHERE = "mobile = %s AND created_at >= CURDATE() AND created_at < CURDATE() + INTERVAL 1 DAY"


def load_account_file():
    path = os.environ.get("QC_DB_ENV_FILE", ACCOUNT_FILE)
    if not os.path.isfile(path):
        return {}
    values = {}
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip("'\"")
    return values


def env(name):
    value = os.environ.get(name) or ACCOUNT.get(name)
    if value or os.name != "nt":
        return value
    cmd = f"[Environment]::GetEnvironmentVariable('{name}','User')"
    out = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True)
    return out.stdout.strip() or None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    confirm = "--yes" in sys.argv
    if len(args) != 1 or not re.fullmatch(r"0\d{9}", args[0]):
        sys.exit("Usage: reset-otp-quota.py <phone 10 digits> [--yes]")
    phone = args[0]

    host = env("QC_DB_HOST") or DEFAULT_HOST
    if "-qc-" not in host:
        sys.exit(f"Refusing non-QC host: {host}")
    user, password = env("QC_DB_USER"), env("QC_DB_PASS")
    if not user or not password:
        sys.exit("Missing QC_DB_USER / QC_DB_PASS")

    conn = pymysql.connect(host=host, port=3306, user=user, password=password,
                           database="seeker", connect_timeout=10, autocommit=False)
    try:
        with conn.cursor() as cur:
            cur.execute(f"SELECT * FROM request_otp_history WHERE {WHERE} ORDER BY created_at", (phone,))
            rows = cur.fetchall()
            print(f"Host: {host}\nPhone: {phone}\nRows today: {len(rows)}")
            for row in rows:
                print("  ", row)
            if not confirm or not rows:
                print("Preview only, nothing deleted." if not confirm else "Nothing to delete.")
                return
            deleted = cur.execute(f"DELETE FROM request_otp_history WHERE {WHERE}", (phone,))
            if deleted != len(rows):
                conn.rollback()
                sys.exit(f"Row count changed ({len(rows)} -> {deleted}), rolled back.")
            conn.commit()
            print(f"Deleted {deleted} rows.")
    finally:
        conn.close()


ACCOUNT = load_account_file()

if __name__ == "__main__":
    main()
