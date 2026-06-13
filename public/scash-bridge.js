;(function () {
  var EXT_ID = 'depmcfopjjbogpekdnegegifhkihanpl'
  var REQUEST_EVENTS = [
    'wbip:requestProvider',
    'scash:requestProvider',
    'scash#requestProvider',
    'scash#connect',
    'SCASH_WALLET_CONNECT',
    'scash:connect',
    'scashwallet:connect',
  ]

  function dispatchRequests() {
    for (var i = 0; i < REQUEST_EVENTS.length; i++) {
      try {
        window.dispatchEvent(new CustomEvent(REQUEST_EVENTS[i], { detail: { source: 'scash-swap' } }))
      } catch (e) {
        // ignore
      }
    }
  }

  function loadExtensionScripts() {
    var paths = [
      'inpage.js',
      'provider.js',
      'inject.js',
      'scripts/inpage.js',
      'scripts/provider.js',
      'next-assets/inpage.js',
    ]
    for (var i = 0; i < paths.length; i++) {
      var script = document.createElement('script')
      script.src = 'chrome-extension://' + EXT_ID + '/' + paths[i]
      script.async = true
      script.onerror = function () {
        this.remove()
      }
      document.documentElement.appendChild(script)
    }
  }

  dispatchRequests()
  loadExtensionScripts()
  window.addEventListener('load', dispatchRequests)
  window.setInterval(dispatchRequests, 3000)
})()
