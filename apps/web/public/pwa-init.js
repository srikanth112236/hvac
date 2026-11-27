// Capture the browser's install event before React mounts, so the home-page
// invitation cannot miss it during hydration.
(function () {
  window.__coolvaneInstallPrompt = null
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault()
    window.__coolvaneInstallPrompt = event
    window.dispatchEvent(new Event('coolvane-install-available'))
  })
  window.addEventListener('appinstalled', function () {
    window.__coolvaneInstallPrompt = null
    window.dispatchEvent(new Event('coolvane-installed'))
  })
})()
