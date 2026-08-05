/* Merchsmith — seeded identity marks (window.MSID)
   Hand-designed mini logo marks for the seed customers and illustrated avatars
   for the seed clients, as inline SVG. Falls back to a tinted monogram for
   anything unrecognised, so new customers/clients still get a tile. */
(function(){
  // ---------- company logo marks (24px flat tiles) ----------
  const LOGOS={
    'Citrix':{bg:'#1B2A4A',svg:'<path d="M7 12a5 5 0 0 1 8.5-3.6l1.9-1.9A7.6 7.6 0 1 0 17.4 17.5l-1.9-1.9A5 5 0 0 1 7 12z" fill="#fff"/><circle cx="16.6" cy="12" r="1.7" fill="#F4B840"/>'},
    'Bang & Blossom':{bg:'#E8557C',svg:'<g fill="#fff"><ellipse cx="12" cy="7.2" rx="2.1" ry="3.1"/><ellipse cx="12" cy="16.8" rx="2.1" ry="3.1"/><ellipse cx="7.2" cy="12" rx="3.1" ry="2.1"/><ellipse cx="16.8" cy="12" rx="3.1" ry="2.1"/></g><circle cx="12" cy="12" r="2.2" fill="#FFD84D"/>'},
    'Fieldstone Brewery':{bg:'#B4622B',svg:'<path d="M4.5 17.5 9 9l3 5 2-3.4 5.5 6.9z" fill="#fff"/><circle cx="16" cy="7" r="2" fill="#FFE08A"/>'},
    'Nova Health':{bg:'#1E8E7E',svg:'<path d="M4 12.5h4l1.6-4.5 2.8 8 2-5.5 1.2 2h4.4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'},
    'Arlo & Co':{bg:'#2B2B30',svg:'<path d="M12 4.5 19 19.5h-3.4L12 11l-3.6 8.5H5z" fill="#fff"/><rect x="9.4" y="15.2" width="5.2" height="2" rx="1" fill="#E8B84B"/>'},
    'Kestrel Finance':{bg:'#274D3D',svg:'<path d="M4 15c4-1 6-3.5 7-8 1.5 3 4.5 4.5 9 4-2 4-6 6.5-11 6l-3 2z" fill="#fff"/>'}
  };
  // ---------- client avatars (head + shoulders, hand-seeded) ----------
  // skin, hair colour, hair style, shirt, bg
  const PEOPLE={
    'Amira Patel'    :{skin:'#B07B52',hair:'#261914',style:'long', shirt:'#5860A6',bg:'#EDE6F4'},
    'Douglas Reed'   :{skin:'#E8B48C',hair:'#9C9C9C',style:'short',shirt:'#3E5C76',bg:'#E4ECF2'},
    'Holly Chen'     :{skin:'#F0C29A',hair:'#1E1A1C',style:'bob',  shirt:'#C4584F',bg:'#F6E8E4'},
    'Marcus Webb'    :{skin:'#7A4A2E',hair:'#171310',style:'crop', shirt:'#31716A',bg:'#E2EFEA'},
    'Ellie Fieldstone':{skin:'#F2C9A5',hair:'#B4622B',style:'long',shirt:'#54633C',bg:'#EEF0E2'},
    'Priya Nair'     :{skin:'#A06A42',hair:'#1C1410',style:'bun',  shirt:'#7A4E8C',bg:'#F0E6F2'},
    'Tom Arlo'       :{skin:'#EBB68E',hair:'#6B4A2E',style:'short',shirt:'#2B2B30',bg:'#EAE8E4'},
    'Ed Kestrel'     :{skin:'#E6AE85',hair:'#B9B4AC',style:'bald', shirt:'#274D3D',bg:'#E6EDE6'},
    'Rachel Moss'    :{skin:'#D9995F',hair:'#C9973F',style:'bob',  shirt:'#9C4A6E',bg:'#F4E9EC'}
  };
  const HAIR={
    short:(c)=>'<path d="M7.6 10.2c0-3 1.8-4.7 4.4-4.7s4.4 1.7 4.4 4.7c-.6-1.7-2-2.5-4.4-2.5s-3.8.8-4.4 2.5z" fill="'+c+'"/>',
    crop :(c)=>'<path d="M7.7 9.6c.2-2.6 1.9-4.1 4.3-4.1s4.1 1.5 4.3 4.1c-1.2-1.3-2.5-1.9-4.3-1.9s-3.1.6-4.3 1.9z" fill="'+c+'"/>',
    bob  :(c)=>'<path d="M7.3 13.5V10c0-2.9 1.9-4.6 4.7-4.6s4.7 1.7 4.7 4.6v3.5c0 .5-.9.6-1.1.1-.3-1-.5-2.6-.5-3.6-1.6.6-4.6.6-6.2 0 0 1-.2 2.6-.5 3.6-.2.5-1.1.4-1.1-.1z" fill="'+c+'"/>',
    long :(c)=>'<path d="M6.9 16.5c.6-1.6.9-3.7.9-6.3 0-3 1.7-4.8 4.2-4.8s4.2 1.8 4.2 4.8c0 2.6.3 4.7.9 6.3-1 .7-2 .9-2.9.5-.6-1.9-.9-3.9-.9-6-1 .5-1.7.5-2.6 0 0 2.1-.3 4.1-.9 6-.9.4-1.9.2-2.9-.5z" fill="'+c+'"/>',
    bun  :(c)=>'<circle cx="12" cy="4.6" r="1.7" fill="'+c+'"/><path d="M7.6 10.3c0-3 1.8-4.8 4.4-4.8s4.4 1.8 4.4 4.8c-.6-1.8-2-2.6-4.4-2.6s-3.8.8-4.4 2.6z" fill="'+c+'"/>',
    bald :(c)=>'<path d="M7.8 9.8c.3-1 .8-1.8 1.5-2.3M16.2 9.8c-.3-1-.8-1.8-1.5-2.3" stroke="'+c+'" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
  };
  function personSvg(p){
    return '<circle cx="12" cy="12" r="12" fill="'+p.bg+'"/>'
      +'<path d="M4.5 24c.8-4.2 3.7-6.4 7.5-6.4s6.7 2.2 7.5 6.4z" fill="'+p.shirt+'"/>'
      +'<circle cx="12" cy="10.6" r="4.1" fill="'+p.skin+'"/>'
      +HAIR[p.style](p.hair);
  }
  const ini=s=>String(s||'').split(/\s+/).filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const hue=s=>{ let h=0; for(const ch of String(s)) h=(h*31+ch.charCodeAt(0))%360; return h; };
  window.MSSEED={
    logo(name){
      const l=LOGOS[name];
      if(l) return '<svg viewBox="0 0 24 24" style="display:block;width:100%;height:100%;background:'+l.bg+'">'+l.svg+'</svg>';
      const h=hue(name);
      return '<svg viewBox="0 0 24 24" style="display:block;width:100%;height:100%;background:hsl('+h+',42%,88%)"><text x="12" y="16" text-anchor="middle" font-family="Mulish,sans-serif" font-size="9" font-weight="800" fill="hsl('+h+',38%,30%)">'+ini(name)+'</text></svg>';
    },
    avatar(name){
      const p=PEOPLE[name];
      if(p) return '<svg viewBox="0 0 24 24" style="display:block;width:100%;height:100%">'+personSvg(p)+'</svg>';
      const h=hue(name+'~');
      return '<svg viewBox="0 0 24 24" style="display:block;width:100%;height:100%;background:hsl('+h+',40%,86%)"><text x="12" y="16" text-anchor="middle" font-family="Mulish,sans-serif" font-size="9" font-weight="800" fill="hsl('+h+',36%,28%)">'+ini(name)+'</text></svg>';
    }
  };
})();
