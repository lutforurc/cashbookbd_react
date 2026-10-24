(function () {
  function inject() {
    if (!document.body || document.getElementById('cb-cap')) return;

    var css = [
      '#cb-cap{position:fixed;left:0;right:0;bottom:0;height:128px;background:rgba(5,10,25,.96);',
      'display:flex;align-items:center;gap:33px;padding:0 54px;z-index:2147483647;',
      'box-shadow:0 -12px 44px rgba(0,0,0,.5);',
      'font-family:"Hind Siliguri","Noto Sans Bengali","Nirmala UI",sans-serif;',
      'transition:opacity .35s ease}',
      '#cb-cap.off{opacity:0;pointer-events:none}',
      '#cb-cap .n{flex:none;width:81px;height:81px;border-radius:50%;background:#38bdf8;color:#06283d;',
      'font-weight:700;font-size:45px;display:grid;place-items:center;line-height:1}',
      '#cb-cap .t{font-size:46px;font-weight:600;line-height:1.22;color:#fff}',
      '#cb-cap .t small{display:block;font-size:31px;font-weight:400;color:#94a3b8;margin-top:3px;line-height:1.25}',
      '#cb-cap.swap .t,#cb-cap.swap .n{animation:cbswap .5s}',
      '@keyframes cbswap{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}'
    ].join('');

    var st = document.createElement('style');
    st.id = 'cb-cap-style';
    st.textContent = css;
    document.head.appendChild(st);

    var d = document.createElement('div');
    d.id = 'cb-cap';
    d.className = 'off';
    d.innerHTML = '<div class="n"></div><div class="t"></div>';
    document.body.appendChild(d);

    window.__cap = function (n, t, s) {
      var c = document.getElementById('cb-cap');
      if (!c) return;
      if (!n) { c.classList.add('off'); return; }
      c.classList.remove('off');
      c.classList.remove('swap');
      void c.offsetWidth;
      c.classList.add('swap');
      c.querySelector('.n').textContent = Number(n).toLocaleString('bn-BD');
      c.querySelector('.t').innerHTML = t + (s ? '<small>' + s + '</small>' : '');
    };

    window.__capHide = function () {
      var c = document.getElementById('cb-cap');
      if (c) c.classList.add('off');
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
