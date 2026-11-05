#!/usr/bin/env bash
# Chạy bộ test JS-8857 Zalo OTP: reset quota OTP trong ngày (QC DB) rồi chạy JMeter.
# Nhờ reset trước nên không còn vướng giới hạn 5 lượt gửi/ngày/SĐT.
#
#   scripts/run-js8857.sh [phone] [-- <tham số jmeter bổ sung>]
#   scripts/run-js8857.sh 0971344520
#   scripts/run-js8857.sh 0971344520 -- -JrunDailyLimit=false   # bỏ qua Flow 14 cho nhanh
#
# Cần QC_DB_USER/QC_DB_PASS (hoặc D:/_Account_DB/qc_db.env) cho reset-otp-quota.py.
set -euo pipefail
cd "$(dirname "$0")/.."

PHONE="${1:-0971344520}"; shift || true
[ "${1:-}" = "--" ] && shift || true

echo "[1/2] Reset quota OTP hôm nay cho $PHONE (QC DB)"
# Xóa env var QC_DB_* cũ còn sót trong Windows user scope để script đọc đúng creds trong .env (D:/_Account_DB/qc_db.env)
env -u QC_DB_USER -u QC_DB_PASS -u QC_DB_HOST python -I otp-tools/reset-otp-quota.py "$PHONE" --yes

RUN="runs/js8857_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RUN"
# Ghi kèm vrt_results.xml (request thực tế đã gửi: body/header đã resolve biến) để cURL trong View Results Tree chạy lại được
npx tsx scripts/prepare-vrt-capture.mts plans/JS-8857_Zalo_OTP_API_Regression.jmx "$RUN/plan.jmx" "$RUN/vrt_results.xml"
echo "[2/2] Chạy JMeter -> $RUN"
export HEAP="-Xms256m -Xmx512m -XX:MaxMetaspaceSize=256m"
./apache-jmeter-5.6.3/bin/jmeter.bat -n \
  -t "$RUN/plan.jmx" \
  -Jphone="$PHONE" \
  -l "$RUN/results.jtl" -j "$RUN/jmeter.log" \
  -Jjmeter.save.saveservice.output_format=csv \
  -Jjmeter.save.saveservice.assertion_results_failure_message=true \
  "$@"
echo "Done. Kết quả: $RUN/results.jtl (chi tiết request/response: $RUN/vrt_results.xml)"
