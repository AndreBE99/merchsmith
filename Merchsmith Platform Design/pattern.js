/* Merchsmith brand guide — swatches + icon-loop patterns */
(function(){
  const ICON_D = "M194.66 336.80 C191.83 336.80 189.16 335.66 187.15 333.59 C185.15 331.54 184.04 328.79 184.03 325.87 L184.03 308.30 L190.95 308.30 L190.95 325.86 C190.95 326.88 191.34 327.84 192.04 328.56 C193.45 330.00 195.88 329.99 197.28 328.56 L217.53 307.71 C218.98 306.22 218.98 303.80 217.53 302.31 C216.83 301.59 215.90 301.19 214.91 301.19 L160.07 301.19 C157.23 301.18 154.56 300.04 152.56 297.98 C150.55 295.91 149.44 293.17 149.44 290.24 C149.44 287.33 150.55 284.58 152.56 282.51 L172.81 261.66 C176.95 257.39 183.69 257.40 187.83 261.66 C189.84 263.73 190.94 266.47 190.95 269.38 L190.95 286.95 L184.03 286.95 L184.03 269.39 C184.03 268.38 183.64 267.42 182.94 266.69 C181.54 265.26 179.10 265.25 177.70 266.70 L157.45 287.55 C156.75 288.27 156.36 289.23 156.36 290.24 C156.36 291.26 156.75 292.22 157.45 292.94 C158.15 293.66 159.09 294.07 160.08 294.07 L214.92 294.07 C217.76 294.07 220.42 295.22 222.43 297.28 C226.57 301.54 226.57 308.48 222.42 312.74 L202.17 333.59 C200.17 335.66 197.50 336.80 194.66 336.80";
  const CX = 187.95, CYY = 297.1;

  /* ---------- Colour swatches ---------- */
  const palette = {
    spearmint:'#36C0A0', flare:'#FF2E17', sky:'#0097D8', blossom:'#FFA2A5', zest:'#FFEB3D', sprout:'#9FD792'
  };
  const secondaries = [
    {nm:'Spearmint', role:'Secondary', hex:'#36C0A0', rgb:'54 · 192 · 160'},
    {nm:'Flare',     role:'Secondary', hex:'#FF2E17', rgb:'255 · 46 · 23'},
    {nm:'Sky',       role:'Secondary', hex:'#0097D8', rgb:'0 · 151 · 216'},
    {nm:'Blossom',   role:'Secondary', hex:'#FFA2A5', rgb:'255 · 162 · 165'},
    {nm:'Zest',      role:'Secondary', hex:'#FFEB3D', rgb:'255 · 235 · 61'},
    {nm:'Sprout',    role:'Tertiary',  hex:'#9FD792', rgb:'159 · 215 · 146'}
  ];
  const neutrals = [
    {nm:'Ink',        role:'Copy',       hex:'#222222', rgb:'34 · 34 · 34',    dark:true},
    {nm:'Black',      role:'Max contrast',hex:'#0E0E12', rgb:'14 · 14 · 18',   dark:true},
    {nm:'Paper',      role:'Background',  hex:'#F4F5F8', rgb:'244 · 245 · 248', border:true},
    {nm:'Pure White', role:'Alt surface', hex:'#FFFFFF', rgb:'255 · 255 · 255', border:true}
  ];
  function swatchHTML(c){
    return `<div class="swatch">
      <div class="chip" style="background:${c.hex};${c.border?'box-shadow:inset 0 0 0 1px rgba(34,34,34,.1)':''}"></div>
      <div class="meta">
        <div class="role">${c.role}</div>
        <div class="nm">${c.nm}</div>
        <div class="hex">HEX ${c.hex}</div>
        <div class="rgb">RGB ${c.rgb}</div>
      </div></div>`;
  }
  const secEl = document.getElementById('secondaries');
  const neuEl = document.getElementById('neutrals');
  if(secEl) secEl.innerHTML = secondaries.map(swatchHTML).join('');
  if(neuEl) neuEl.innerHTML = neutrals.map(swatchHTML).join('');

  /* ---------- Patterns: extreme close-ups of the outline wordmark (page 6) ---------- */
  const ART = (window.__resources && window.__resources.outlineArt) || 'assets/merchsmith-outline-art.svg';
  // Each pattern element gets a heavily-zoomed crop of the artwork.
  // size = background-size (auto Z% → Z% of container height); pos = background-position.
  const crops = {
    cover:     {bg:'#7B85C5', size:'auto 150%', pos:'88% 42%', mask:true},
    hero:      {bg:'#7B85C5', size:'auto 210%', pos:'40% 52%'},
    'cw-warm': {bg:'#7B85C5', size:'auto 300%', pos:'8% 46%'},   // "me"
    'cw-cool': {bg:'#7B85C5', size:'auto 300%', pos:'50% 56%'},  // "hsm"
    'cw-mono': {bg:'#7B85C5', size:'auto 300%', pos:'90% 48%'}   // "ith"
  };
  document.querySelectorAll('[data-pattern]').forEach(el=>{
    const c = crops[el.getAttribute('data-pattern')];
    if(!c) return;
    el.innerHTML = '';
    el.style.backgroundColor = c.bg;
    el.style.backgroundImage = `url("${ART}")`;
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundSize = c.size;
    el.style.backgroundPosition = c.pos;
    if(c.mask){
      // fade the close-up out toward the left so the cover headline stays clean
      const grad = 'linear-gradient(90deg, transparent 0%, transparent 34%, rgba(0,0,0,.5) 56%, #000 78%)';
      el.style.webkitMaskImage = grad;
      el.style.maskImage = grad;
    }
  });
})();
