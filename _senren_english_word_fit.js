(function () {
  // Anki reuses the webview, so release the previous card's resize observer.
  window.senrenEnglishWordResize?.disconnect();
  window.senrenEnglishWordStyle?.disconnect();
  var pending = false;

  function fitWords() {
    pending = false;
    var context = document.createElement('canvas').getContext('2d');
    document.querySelectorAll('#word').forEach(function (word) {
      if (!word.getClientRects().length || word.querySelector('img')) return;
      var text = word.querySelector('.ruby-base-word') || word;
      word.style.fontSize = '';
      var style = getComputedStyle(text);
      context.font = style.font;
      var spacing = parseFloat(style.letterSpacing) || 0;
      var longest = Math.max.apply(null, text.textContent.trim().split(/\s+/).map(function (token) {
        return context.measureText(token).width + Math.max(0, token.length - 1) * spacing;
      }));
      var available = word.clientWidth - 2;
      if (available > 0 && longest > available) {
        word.style.fontSize = (parseFloat(getComputedStyle(word).fontSize) * available / longest) + 'px';
      }
    });
  }

  function scheduleFit() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(fitWords);
  }

  window.senrenEnglishFitWords = scheduleFit;
  var widths = new WeakMap();
  window.senrenEnglishWordResize = new ResizeObserver(function (entries) {
    entries.forEach(function (entry) {
      var width = entry.target.clientWidth;
      if (widths.get(entry.target) !== width) {
        widths.set(entry.target, width);
        scheduleFit();
      }
    });
  });
  document.querySelectorAll('#word').forEach(function (word) {
    // Watch the width-bearing parent; font fitting changes the word's height.
    window.senrenEnglishWordResize.observe(word.parentElement);
  });
  window.senrenEnglishWordStyle = new MutationObserver(scheduleFit);
  window.senrenEnglishWordStyle.observe(document.documentElement, {attributes: true, attributeFilter: ['style', 'class']});
  document.fonts.ready.then(scheduleFit);
  scheduleFit();
})();
