/* logos.js — fake SVG brand marks for the mock organisations.
   Use:  MSLOGOS.svg('mojo', 28)  → returns an <svg> string sized to height h.
   Each mark is a simple, distinct lettermark/wordmark so lockups look real. */
(function(){
  // palette helpers
  const L = {};

  // ---- DISTRIBUTOR ----
  L.mojo = (h)=>wm(h, `<circle cx="13" cy="20" r="9" fill="#7B85C5"/><circle cx="27" cy="20" r="9" fill="#E8893A"/><circle cx="20" cy="20" r="9" fill="#2F8F5B" fill-opacity=".92"/>`, 'mojo', '#23231f', 44);

  // ---- CUSTOMERS ----
  L['Citrix'] = (h)=>mark(h,'#1f6f5c', `<path d="M6 24c4 0 4-5 8-5s4 5 8 5 4-5 8-5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M20 6l3 5h-6z" fill="#fff"/>`, 'Citrix');
  L['Northwind Ltd'] = (h)=>mark(h,'#2a3550', `<path d="M10 26V12l10 9V10" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="12" r="2.4" fill="#7fd4d1"/>`, 'Northwind');
  L['Volt Studios'] = (h)=>mark(h,'#1a1a1e', `<path d="M20 6l-7 12h6l-2 10 10-14h-6z" fill="#EBCB5B"/>`, 'Volt');
  L['Fernlea Foods'] = (h)=>mark(h,'#3a7d44', `<path d="M20 28c0-8 5-12 11-13-1 8-5 13-11 13zM20 28c0-6-4-9-9-10 1 6 4 10 9 10z" fill="#fff"/>`, 'Fernlea');
  L['Meridian Bank'] = (h)=>mark(h,'#26303b', `<path d="M8 24l6-12 6 9 4-6 4 9" stroke="#d8b365" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, 'Meridian');
  L['BrightPath Charity'] = (h)=>mark(h,'#e8893a', `<circle cx="20" cy="20" r="6" fill="#fff"/><path d="M20 5v5M20 30v5M5 20h5M30 20h5M9 9l4 4M27 27l4 4M31 9l-4 4M13 27l-4 4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`, 'BrightPath');

  // ---- SUPPLIERS ----
  L['BagWorks UK'] = (h)=>mark(h,'#5a3b22', `<path d="M11 14h18l-2 15H13z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><path d="M15 14a5 5 0 0 1 10 0" stroke="#fff" stroke-width="2.2" fill="none"/>`, 'BagWorks');
  L['PrintHouse Studio'] = (h)=>mark(h,'#4a4ac2', `<rect x="10" y="9" width="20" height="14" rx="2" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M14 23v8h12v-8M14 16h12" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`, 'PrintHouse');
  L['GreenStock'] = (h)=>mark(h,'#2f8f5b', `<path d="M20 7c7 3 8 11 0 21-8-10-7-18 0-21z" fill="#fff"/>`, 'GreenStock');
  L['Lumen Supplies'] = (h)=>mark(h,'#0f3a6b', `<circle cx="20" cy="17" r="7" fill="#ffcd00"/><path d="M16 27h8M17 30h6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`, 'Lumen');
  L['Inkwell Print'] = (h)=>mark(h,'#1a1a2e', `<path d="M20 7c5 7 8 11 8 15a8 8 0 0 1-16 0c0-4 3-8 8-15z" fill="#7fd4d1"/>`, 'Inkwell');
  L['XD Connects'] = (h)=>mark(h,'#d50032', `<path d="M11 11l18 18M29 11 11 29" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>`, 'XD');
  L['PF Concept'] = (h)=>mark(h,'#003a70', `<path d="M12 30V11h7a5 5 0 0 1 0 10h-7" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, 'PF');
  L['Mid Ocean Brands'] = (h)=>mark(h,'#005b8f', `<path d="M7 22c3 0 3-3 6.5-3s3.5 3 6.5 3 3-3 6.5-3 3.5 3 6.5 3" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M7 27c3 0 3-3 6.5-3s3.5 3 6.5 3 3-3 6.5-3 3.5 3 6.5 3" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".6"/>`, 'Mid Ocean');
  L['Senator'] = (h)=>mark(h,'#b11226', `<path d="M20 7l3.5 7 7.5 1-5.5 5.5L26 28l-6-3.5L14 28l1-7.5L9.5 15l7.5-1z" fill="#fff"/>`, 'Senator');

  // ---- PLATFORM (official Merchsmith mark from the brand guidelines — do not fake) ----
  L.Merchsmith = (h)=>{
    const mark = `<svg viewBox="143.4 251.4 89.1 91.4" height="${h}" width="${h}" aria-hidden="true" style="display:block"><path fill="var(--periwinkle-deep,#4a4ac2)" d="M194.66 336.80 C191.83 336.80 189.16 335.66 187.15 333.59 C185.15 331.54 184.04 328.79 184.03 325.87 L184.03 308.30 L190.95 308.30 L190.95 325.86 C190.95 326.88 191.34 327.84 192.04 328.56 C193.45 330.00 195.88 329.99 197.28 328.56 L217.53 307.71 C218.98 306.22 218.98 303.80 217.53 302.31 C216.83 301.59 215.90 301.19 214.91 301.19 L160.07 301.19 C157.23 301.18 154.56 300.04 152.56 297.98 C150.55 295.91 149.44 293.17 149.44 290.24 C149.44 287.33 150.55 284.58 152.56 282.51 L172.81 261.66 C176.95 257.39 183.69 257.40 187.83 261.66 C189.84 263.73 190.94 266.47 190.95 269.38 L190.95 286.95 L184.03 286.95 L184.03 269.39 C184.03 268.38 183.64 267.42 182.94 266.69 C181.54 265.26 179.10 265.25 177.70 266.70 L157.45 287.55 C156.75 288.27 156.36 289.23 156.36 290.24 C156.36 291.26 156.75 292.22 157.45 292.94 C158.15 293.66 159.09 294.07 160.08 294.07 L214.92 294.07 C217.76 294.07 220.42 295.22 222.43 297.28 C226.57 301.54 226.57 308.48 222.42 312.74 L202.17 333.59 C200.17 335.66 197.50 336.80 194.66 336.80"/></svg>`;
    return `<span style="display:inline-flex;align-items:center;gap:${h*0.32}px;line-height:1">${mark}<img src="assets/merchsmith-wordmark.svg" alt="merchsmith" style="height:${h*0.5}px;display:block"></span>`;
  };
  L['Merchsmith mark'] = (h)=>`<svg viewBox="143.4 251.4 89.1 91.4" height="${h}" width="${h}" role="img" aria-label="Merchsmith" style="display:block"><path fill="var(--periwinkle-deep,#4a4ac2)" d="M194.66 336.80 C191.83 336.80 189.16 335.66 187.15 333.59 C185.15 331.54 184.04 328.79 184.03 325.87 L184.03 308.30 L190.95 308.30 L190.95 325.86 C190.95 326.88 191.34 327.84 192.04 328.56 C193.45 330.00 195.88 329.99 197.28 328.56 L217.53 307.71 C218.98 306.22 218.98 303.80 217.53 302.31 C216.83 301.59 215.90 301.19 214.91 301.19 L160.07 301.19 C157.23 301.18 154.56 300.04 152.56 297.98 C150.55 295.91 149.44 293.17 149.44 290.24 C149.44 287.33 150.55 284.58 152.56 282.51 L172.81 261.66 C176.95 257.39 183.69 257.40 187.83 261.66 C189.84 263.73 190.94 266.47 190.95 269.38 L190.95 286.95 L184.03 286.95 L184.03 269.39 C184.03 268.38 183.64 267.42 182.94 266.69 C181.54 265.26 179.10 265.25 177.70 266.70 L157.45 287.55 C156.75 288.27 156.36 289.23 156.36 290.24 C156.36 291.26 156.75 292.22 157.45 292.94 C158.15 293.66 159.09 294.07 160.08 294.07 L214.92 294.07 C217.76 294.07 220.42 295.22 222.43 297.28 C226.57 301.54 226.57 308.48 222.42 312.74 L202.17 333.59 C200.17 335.66 197.50 336.80 194.66 336.80"/></svg>`;

  // ---- builders ----
  // mark(): coloured rounded-square glyph tile + name omitted (icon only)
  function mark(h, bg, inner, alt){
    const s = h/40;
    return `<svg viewBox="0 0 40 40" height="${h}" width="${h}" role="img" aria-label="${alt}" style="border-radius:${9*s}px;background:${bg};display:block">${inner}</svg>`;
  }
  // wm(): glyph + wordmark text
  function wm(h, glyph, text, color, glyphW, serif){
    const fs = h*0.62;
    return `<span style="display:inline-flex;align-items:center;gap:${h*0.28}px;line-height:1">
      <svg viewBox="0 0 40 40" height="${h}" width="${h}" aria-hidden="true">${glyph}</svg>
      <span style="font-family:${serif?'var(--serif),Georgia,serif':"'Fredoka',var(--sans),sans-serif"};font-weight:600;font-size:${fs}px;color:${color};letter-spacing:-.01em">${text}</span>
    </span>`;
  }

  window.MSLOGOS = {
    svg(name, h){ h=h||28; const fn=L[name]; return fn?fn(h):mark(h,'#8a8a93',`<text x="20" y="26" text-anchor="middle" font-size="16" fill="#fff" font-family="sans-serif" font-weight="700">${(name||'?')[0]}</text>`, name); },
    has(name){ return !!L[name]; },
    names(){ return Object.keys(L); }
  };
})();
