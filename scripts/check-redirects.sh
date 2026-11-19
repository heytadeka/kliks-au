#!/usr/bin/env bash
# Checks the SEO redirects and key URLs against a deployment.
#
#   scripts/check-redirects.sh https://kliks.com.au
#   VERCEL_BYPASS_SECRET=... scripts/check-redirects.sh https://<preview>.vercel.app
#   CURL="./my-curl-wrapper" scripts/check-redirects.sh https://<preview>.vercel.app   (any command that takes curl's arguments)
#
# Exit code is the number of failed checks. Read-only: GET requests only.

BASE="${1:-https://kliks.com.au}"; BASE="${BASE%/}"
CURL="${CURL:-curl}"
HDR=()
[ -n "$VERCEL_BYPASS_SECRET" ] && HDR=(-H "x-vercel-protection-bypass: $VERCEL_BYPASS_SECRET")
fail=0; pass=0

# status, path, expected redirect path ("" when not a redirect)
check() {
  local want="$1" path="$2" loc="$3" out code got
  out=$($CURL -s -o /dev/null --max-redirs 0 "${HDR[@]}" -w '%{http_code} %{redirect_url}' "$BASE$path?cb=$RANDOM")
  code="${out%% *}"; got="${out#* }"; got="${got#http*://*/}"; got="/${got%%\?*}"; [ "$got" = "/" ] && [ -z "${out#* }" ] && got=""
  if [ "$code" = "$want" ] && { [ -z "$loc" ] || [ "$got" = "$loc" ]; }; then pass=$((pass+1)); printf 'PASS %s -> %s %s\n' "$path" "$code" "$got"
  else fail=$((fail+1)); printf 'FAIL %s -> got "%s", wanted %s %s\n' "$path" "$out" "$want" "$loc"; fi
}
# following the redirect must end on a 200, never a loop
lands() {
  local final
  final=$($CURL -s -o /dev/null -L --max-redirs 5 "${HDR[@]}" -w '%{http_code}' "$BASE$1?cb=$RANDOM")
  if [ "$final" = "200" ]; then pass=$((pass+1)); printf 'PASS %s follows to 200\n' "$1"; else fail=$((fail+1)); printf 'FAIL %s follows to %s (loop or dead end)\n' "$1" "$final"; fi
}

echo "== 301 redirects"
for pair in "/index.html:/" "/book.html:/book" "/ad-junkies.html:/ad-junkies" "/privacy.html:/privacy" \
            "/case-studies.html:/case-studies" "/brands.html:/brands" "/blog/index.html:/blog" \
            "/blog/meta-ads-roas-shopify.html:/blog/meta-ads-roas-shopify" \
            "/pages/contact:/book" "/pages/free-strategy-call:/book" "/pages/about-us:/" "/pages/faq:/" \
            "/pages/join-the-ad-junkies:/ad-junkies" "/shopify:/"; do
  check 301 "${pair%%:*}" "${pair#*:}"; lands "${pair%%:*}"
done
echo "== clean URLs stay 200 (no redirect loop)"
for p in / /book /ad-junkies /privacy /brands /case-studies /blog /blog/meta-ads-roas-shopify /blog/chatgpt-business-mention-count /patisserie /audit /thanks /thanks-booking /sitemap.xml /robots.txt; do check 200 "$p" ""; done
echo "== prospect proposal pages: served at .html on purpose (not redirected), clean URLs go home"
for p in /lukewood.html /oh-my-days.html; do check 200 "$p" ""; done
for p in /lukewood /oh-my-days; do check 302 "$p" "/"; lands "$p"; done
echo "== left as 404 on purpose"
check 404 "/products/some-coffee-pods" ""
echo; echo "passed: $pass   failed: $fail"; exit $fail
