const IN_APP =
  /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|TikTok|Musical_ly|Snapchat|MicroMessenger/i

export function isInAppBrowser(userAgent: string) {
  return IN_APP.test(userAgent)
}

export function currentInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  return isInAppBrowser(navigator.userAgent || '')
}

export function openPaymentInSystemBrowser() {
  const url = window.location.href
  const ua = navigator.userAgent || ''
  if (/Android/i.test(ua)) {
    const stripped = url.replace(/^https?:\/\//, '')
    const fallback = encodeURIComponent(url)
    window.location.href = `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`
    return
  }
  void navigator.clipboard?.writeText(url).catch(() => {})
}
