import { useId } from 'react';

// Ilustraciones de ejemplo (SVG propio) que caracterizan cada estilo visual. No son salidas de un modelo.
const P = {
  cinematic3d: { sky: ['#1b3b5a', '#e8935a'], hill: '#14202e', skin: '#e8b48f', cloth: '#2f6f8f', hair: '#2b1d14' },
  anim2d: { sky: ['#9fd8ff', '#e8f6ff'], hill: '#7ccf8c', skin: '#ffd2a8', cloth: '#ef6a5b', hair: '#5b3a22' },
  caricature: { sky: ['#ffe29a', '#ffb199'], hill: '#9ad17a', skin: '#ffb98a', cloth: '#6b5bd6', hair: '#3a2a1a' },
  pixarlike: { sky: ['#ffd5a0', '#ff9db5'], hill: '#7bbf8a', skin: '#ffd0b0', cloth: '#4aa3df', hair: '#8a4b2a' },
  anime: { sky: ['#8fd3ff', '#ffd6ec'], hill: '#5fb59a', skin: '#fff0e6', cloth: '#2a3a8f', hair: '#2a2250' },
  cinematic: { sky: ['#5a6f80', '#c9b79c'], hill: '#2b3238', skin: '#c99a7c', cloth: '#3a3f46', hair: '#1c1a18' },
  hyperreal: { sky: ['#87a9c9', '#e9dcc8'], hill: '#4a5a40', skin: '#c68e6e', cloth: '#35404d', hair: '#4a3224' },
  stopmotion: { sky: ['#f2c98b', '#e49a6a'], hill: '#9a7a4e', skin: '#e0a47c', cloth: '#b84f4f', hair: '#6a4a2a' },
  lowpoly: { sky: ['#6a5ae0', '#ff8ab5'], hill: '#2f9d8a', skin: '#f0b890', cloth: '#ffc53a', hair: '#4a2f6a' },
  videogame: { sky: ['#1a0f3a', '#6a2aa8'], hill: '#0b2a3a', skin: '#e8c0a0', cloth: '#19e6a6', hair: '#ff3a8a' },
  comic: { sky: ['#ffe66d', '#ff9a3c'], hill: '#3aa6d9', skin: '#ffd0a8', cloth: '#e8334a', hair: '#1a1a1a' },
  kids: { sky: ['#bfe9ff', '#fff2c2'], hill: '#9be08a', skin: '#ffd9b8', cloth: '#ff8ab0', hair: '#c97b3a' },
  surreal: { sky: ['#3a1c71', '#ffaf7b'], hill: '#7a2f5a', skin: '#e9b9a0', cloth: '#1f3a6a', hair: '#1a0f2a' },
  cartoon: { sky: ['#7fd6ff', '#d9f3ff'], hill: '#5ed16a', skin: '#ffc89a', cloth: '#ffd23a', hair: '#e8531c' },
};

export default function StyleArt({ id, className = 'art' }) {
  const u = useId().replace(/:/g, '');
  const p = P[id] || P.cartoon;
  const outline = ['anim2d', 'caricature', 'comic', 'cartoon', 'kids', 'anime'].includes(id) ? '#15131a' : 'none';
  const sw = id === 'comic' || id === 'cartoon' ? 3.5 : id === 'caricature' ? 3 : 2;
  const big = id === 'caricature' ? 1.35 : id === 'kids' || id === 'pixarlike' ? 1.15 : 1;
  const eyeR = id === 'anime' || id === 'pixarlike' ? 7 : id === 'kids' ? 6 : 4.5;
  const flat = ['anim2d', 'cartoon', 'comic', 'kids', 'caricature'].includes(id);
  const lp = id === 'lowpoly';
  const tris = lp ? Array.from({ length: 40 }, (_, i) => { const x = (i % 8) * 50, y = Math.floor(i / 8) * 40; const s = (i * 37) % 7; return [`${x},${y} ${x + 50},${y} ${x + (s % 2 ? 50 : 0)},${y + 40}`, `hsl(${255 + s * 12} 65% ${48 + s * 3}%)`]; }) : [];
  return (
    <svg className={className} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Ejemplo de estilo ${id}`}>
      <defs>
        <linearGradient id={`s${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.sky[0]} /><stop offset="1" stopColor={p.sky[1]} /></linearGradient>
        <radialGradient id={`f${u}`} cx=".38" cy=".35" r=".8"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#000" stopOpacity=".35" /></radialGradient>
        <radialGradient id={`v${u}`} cx=".5" cy=".5" r=".75"><stop offset=".55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".7" /></radialGradient>
        <pattern id={`h${u}`} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.6" fill="#000" opacity=".22" /></pattern>
        <filter id={`n${u}`}><feTurbulence type="fractalNoise" baseFrequency={id === 'stopmotion' ? 0.9 : 0.8} numOctaves="2" /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 0" /></filter>
      </defs>
      <rect width="400" height="300" fill={`url(#s${u})`} />
      {lp && tris.map(([pts, c], i) => <polygon key={i} points={pts} fill={c} opacity=".85" />)}
      {id === 'videogame' && <g stroke="#19e6a655" strokeWidth="1">{Array.from({ length: 12 }, (_, i) => <line key={i} x1={i * 40} y1="190" x2={200 + (i - 5) * 120} y2="300" />)}{[210, 235, 265].map((y) => <line key={y} x1="0" x2="400" y1={y} y2={y} />)}</g>}
      {id === 'surreal' && <><circle cx="300" cy="80" r="52" fill="#ffe9c9" /><ellipse cx="90" cy="60" rx="26" ry="14" fill="#fff" /><circle cx="90" cy="60" r="8" fill="#3a1c71" /><path d="M40 120 q30 -40 60 0" fill="none" stroke="#ffe9c9" strokeWidth="3" /></>}
      {(id === 'anim2d' || id === 'kids' || id === 'cartoon') && <><ellipse cx="90" cy="60" rx="34" ry="14" fill="#fff" /><ellipse cx="320" cy="50" rx="28" ry="11" fill="#fff" /><circle cx="340" cy="100" r="22" fill="#ffe34d" /></>}
      {id === 'stopmotion' && <g fill="#fff8" ><circle cx="70" cy="60" r="18" /><circle cx="330" cy="70" r="12" /></g>}
      {id === 'anime' && <g stroke="#fff9" strokeWidth="2">{Array.from({ length: 14 }, (_, i) => <line key={i} x1={20 + i * 28} y1={10 + (i % 3) * 8} x2={14 + i * 28} y2={60 + (i % 4) * 14} />)}</g>}
      <path d={lp ? 'M0 230 L90 170 L170 220 L260 160 L400 235 L400 300 L0 300Z' : 'M0 220 Q110 160 220 205 T400 200 L400 300 L0 300Z'} fill={p.hill} stroke={outline} strokeWidth={sw} />
      {/* Personaje */}
      <g transform={`translate(200 ${150 - (big - 1) * 40}) scale(${big})`} stroke={outline} strokeWidth={sw} strokeLinejoin="round">
        <path d={lp ? 'M-46 120 L-30 52 L30 52 L46 120Z' : 'M-46 120 Q-44 50 0 50 Q44 50 46 120Z'} fill={p.cloth} />
        {id === 'cinematic3d' || id === 'pixarlike' || id === 'hyperreal' ? <path d="M-46 120 Q-44 50 0 50 Q44 50 46 120Z" fill={`url(#f${u})`} stroke="none" /> : null}
        <rect x="-9" y="38" width="18" height="18" fill={p.skin} />
        {lp ? <polygon points="-36,-4 -22,-44 22,-44 36,-4 22,40 -22,40" fill={p.skin} /> : <ellipse cx="0" cy="0" rx="38" ry="42" fill={p.skin} />}
        {lp && <polygon points="-22,-44 0,-8 22,-44" fill="#0002" stroke="none" />}
        {id === 'stopmotion' ? <path d="M-38 -10 Q-30 -52 0 -50 Q30 -52 38 -10 Q20 -30 0 -28 Q-20 -30 -38 -10Z" fill={p.hair} /> : id === 'anime' ? <path d="M-40 -6 L-34 -48 L-14 -34 L0 -56 L14 -34 L34 -48 L40 -6 Q22 -30 0 -26 Q-22 -30 -40 -6Z" fill={p.hair} /> : <path d="M-38 -8 Q-34 -50 0 -50 Q34 -50 38 -8 Q20 -32 0 -30 Q-20 -32 -38 -8Z" fill={p.hair} />}
        <g stroke="none"><circle cx="-14" cy="-2" r={eyeR} fill="#fff" /><circle cx="14" cy="-2" r={eyeR} fill="#fff" /><circle cx="-13" cy="-1" r={eyeR * 0.55} fill={id === 'anime' ? '#3a6bff' : '#1a1a1a'} /><circle cx="15" cy="-1" r={eyeR * 0.55} fill={id === 'anime' ? '#3a6bff' : '#1a1a1a'} />{eyeR > 5 && <><circle cx="-11" cy="-4" r="1.8" fill="#fff" /><circle cx="17" cy="-4" r="1.8" fill="#fff" /></>}</g>
        {id === 'caricature' && <path d="M-3 4 Q-14 18 0 18" fill="none" strokeWidth="2.5" />}
        <path d={id === 'caricature' || id === 'cartoon' || id === 'kids' ? 'M-14 20 Q0 36 14 20' : 'M-9 22 Q0 27 9 22'} fill={id === 'kids' || id === 'cartoon' ? '#fff' : 'none'} strokeWidth={Math.max(1.5, sw - 1)} />
        {(id === 'kids' || id === 'pixarlike' || id === 'anime') && <g stroke="none" fill="#ff7a9a" opacity=".5"><circle cx="-26" cy="14" r="6" /><circle cx="26" cy="14" r="6" /></g>}
      </g>
      {id === 'comic' && <><rect width="400" height="300" fill={`url(#h${u})`} /><path d="M310 28 l10 18 22-8-8 20 22 10-24 6 6 22-20-14-12 20-4-22-22 2 16-16-14-16 22 4z" fill="#fff" stroke="#15131a" strokeWidth="3" /><text x="316" y="72" fontSize="16" fontWeight="900" fill="#e8334a" stroke="#15131a" strokeWidth=".6">¡POW!</text><rect x="3" y="3" width="394" height="294" fill="none" stroke="#15131a" strokeWidth="6" /></>}
      {id === 'videogame' && <g><rect x="14" y="14" width="110" height="10" rx="3" fill="#0006" stroke="#19e6a6" /><rect x="16" y="16" width="78" height="6" rx="2" fill="#19e6a6" /><rect x="14" y="30" width="80" height="8" rx="3" fill="#0006" stroke="#ff3a8a" /><rect x="16" y="32" width="46" height="4" rx="2" fill="#ff3a8a" /><g fill="#19e6a6"><rect x="340" y="14" width="12" height="12" /><rect x="356" y="14" width="12" height="12" opacity=".5" /><rect x="372" y="14" width="12" height="12" opacity=".3" /></g></g>}
      {(id === 'cinematic' || id === 'hyperreal' || id === 'cinematic3d') && <rect width="400" height="300" fill={`url(#v${u})`} />}
      {(id === 'cinematic' || id === 'hyperreal' || id === 'stopmotion') && <rect width="400" height="300" filter={`url(#n${u})`} opacity={id === 'stopmotion' ? 0.5 : 0.35} />}
      {id === 'cinematic' && <><rect width="400" height="30" fill="#000" /><rect y="270" width="400" height="30" fill="#000" /></>}
      {id === 'cinematic3d' && <g fill="#ffd9a8" opacity=".35">{[[60, 70, 12], [330, 90, 18], [350, 200, 9], [40, 190, 14]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g>}
      {id === 'hyperreal' && <circle cx="330" cy="50" r="40" fill="#fff" opacity=".18" />}
      {id === 'stopmotion' && <g stroke="#fff7" strokeDasharray="4 4" fill="none"><path d="M-46 0" /><path d="M158 200 L242 200" strokeWidth="2" /></g>}
    </svg>
  );
}
