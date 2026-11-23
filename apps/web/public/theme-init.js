/* Runs before first paint: applies the saved or forced theme without a flash. */
;(function () {
  try {
    var params = new URLSearchParams(location.search)
    var forced = params.get('theme')
    var stored = localStorage.getItem('hvac-theme')
    var theme = forced || stored || document.documentElement.getAttribute('data-theme') || 'foundry'
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('theme-atelier', theme === 'atelier')
    document.documentElement.classList.toggle('theme-foundry', theme !== 'atelier')
  } catch {
    document.documentElement.setAttribute('data-theme', 'foundry')
  }
})()
