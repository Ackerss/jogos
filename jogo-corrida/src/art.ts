// Desenhos em SVG feitos em código (leves para a TV): pilotos bichinhos e o carrinho.
export const ANIMAL_NAMES = ['Gato', 'Cachorro', 'Coelho', 'Urso', 'Sapo', 'Panda'];

type Face = {face: string; ear: string; inner: string; muzzle: string; nose: string};
const FACES: Face[] = [
  {face: '#ffad4d', ear: '#ffad4d', inner: '#ff8a7a', muzzle: '#fff1dc', nose: '#e2574c'},  // gato
  {face: '#c98a52', ear: '#7a4a2a', inner: '#7a4a2a', muzzle: '#f4dcc0', nose: '#2b1d16'},  // cachorro
  {face: '#f7f3f2', ear: '#f7f3f2', inner: '#ffb3c8', muzzle: '#ffffff', nose: '#ff7aa2'},  // coelho
  {face: '#9b6a43', ear: '#9b6a43', inner: '#e9c39d', muzzle: '#e9c39d', nose: '#3a2516'},  // urso
  {face: '#6fd36a', ear: '#6fd36a', inner: '#ffffff', muzzle: '#b8f0a5', nose: '#2f7a2c'},  // sapo
  {face: '#fbfbfb', ear: '#26262f', inner: '#26262f', muzzle: '#ffffff', nose: '#26262f'},  // panda
];

/** Cabeça do bichinho, centrada em (cx, cy) com raio r. */
export function head(animal: number, cx: number, cy: number, r: number): string {
  const f = FACES[animal] || FACES[0]!;
  const e = r * 0.36; // olhos
  let ears = '';
  if (animal === 0) ears = `<path d="M${cx - r * .95} ${cy - r * .2} L${cx - r * .75} ${cy - r * 1.25} L${cx - r * .1} ${cy - r * .8}Z M${cx + r * .95} ${cy - r * .2} L${cx + r * .75} ${cy - r * 1.25} L${cx + r * .1} ${cy - r * .8}Z" fill="${f.ear}"/><path d="M${cx - r * .78} ${cy - r * .45} L${cx - r * .7} ${cy - r * 1} L${cx - r * .33} ${cy - r * .75}Z M${cx + r * .78} ${cy - r * .45} L${cx + r * .7} ${cy - r * 1} L${cx + r * .33} ${cy - r * .75}Z" fill="${f.inner}"/>`;
  if (animal === 1) ears = `<ellipse cx="${cx - r * .92}" cy="${cy - r * .05}" rx="${r * .32}" ry="${r * .7}" fill="${f.ear}" transform="rotate(18 ${cx - r * .92} ${cy})"/><ellipse cx="${cx + r * .92}" cy="${cy - r * .05}" rx="${r * .32}" ry="${r * .7}" fill="${f.ear}" transform="rotate(-18 ${cx + r * .92} ${cy})"/>`;
  if (animal === 2) ears = `<ellipse cx="${cx - r * .42}" cy="${cy - r * 1.35}" rx="${r * .26}" ry="${r * .75}" fill="${f.ear}"/><ellipse cx="${cx + r * .42}" cy="${cy - r * 1.35}" rx="${r * .26}" ry="${r * .75}" fill="${f.ear}"/><ellipse cx="${cx - r * .42}" cy="${cy - r * 1.3}" rx="${r * .12}" ry="${r * .55}" fill="${f.inner}"/><ellipse cx="${cx + r * .42}" cy="${cy - r * 1.3}" rx="${r * .12}" ry="${r * .55}" fill="${f.inner}"/>`;
  if (animal === 3 || animal === 5) ears = `<circle cx="${cx - r * .78}" cy="${cy - r * .78}" r="${r * .36}" fill="${f.ear}"/><circle cx="${cx + r * .78}" cy="${cy - r * .78}" r="${r * .36}" fill="${f.ear}"/>${animal === 3 ? `<circle cx="${cx - r * .78}" cy="${cy - r * .78}" r="${r * .18}" fill="${f.inner}"/><circle cx="${cx + r * .78}" cy="${cy - r * .78}" r="${r * .18}" fill="${f.inner}"/>` : ''}`;
  if (animal === 4) ears = `<circle cx="${cx - r * .5}" cy="${cy - r * .8}" r="${r * .38}" fill="${f.face}"/><circle cx="${cx + r * .5}" cy="${cy - r * .8}" r="${r * .38}" fill="${f.face}"/>`;
  const eyeY = animal === 4 ? cy - r * .82 : cy - r * .12;
  const eyeX = animal === 4 ? r * .5 : r * .4;
  const patches = animal === 5 ? `<ellipse cx="${cx - eyeX}" cy="${eyeY + r * .03}" rx="${r * .26}" ry="${r * .32}" fill="#26262f" transform="rotate(-20 ${cx - eyeX} ${eyeY})"/><ellipse cx="${cx + eyeX}" cy="${eyeY + r * .03}" rx="${r * .26}" ry="${r * .32}" fill="#26262f" transform="rotate(20 ${cx + eyeX} ${eyeY})"/>` : '';
  const eyeWhite = animal === 5 || animal === 4 ? '#fff' : '#222';
  const eyes = `<circle cx="${cx - eyeX}" cy="${eyeY}" r="${e * .5}" fill="${eyeWhite}"/><circle cx="${cx + eyeX}" cy="${eyeY}" r="${e * .5}" fill="${eyeWhite}"/>`
    + (animal === 5 || animal === 4 ? `<circle cx="${cx - eyeX}" cy="${eyeY}" r="${e * .3}" fill="#222"/><circle cx="${cx + eyeX}" cy="${eyeY}" r="${e * .3}" fill="#222"/>` : '')
    + `<circle cx="${cx - eyeX + e * .15}" cy="${eyeY - e * .18}" r="${e * .14}" fill="#fff"/><circle cx="${cx + eyeX + e * .15}" cy="${eyeY - e * .18}" r="${e * .14}" fill="#fff"/>`;
  const muzzle = animal === 4
    ? `<path d="M${cx - r * .55} ${cy + r * .25} Q${cx} ${cy + r * .75} ${cx + r * .55} ${cy + r * .25}" stroke="${f.nose}" stroke-width="${r * .1}" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="${cx}" cy="${cy + r * .32}" rx="${r * .46}" ry="${r * .34}" fill="${f.muzzle}"/><ellipse cx="${cx}" cy="${cy + r * .18}" rx="${r * .15}" ry="${r * .1}" fill="${f.nose}"/><path d="M${cx - r * .18} ${cy + r * .4} Q${cx} ${cy + r * .52} ${cx + r * .18} ${cy + r * .4}" stroke="${f.nose}" stroke-width="${r * .07}" fill="none" stroke-linecap="round"/>`;
  const whiskers = animal === 0 ? `<path d="M${cx - r * .45} ${cy + r * .28}h-${r * .5}M${cx - r * .45} ${cy + r * .42}l-${r * .45} ${r * .12}M${cx + r * .45} ${cy + r * .28}h${r * .5}M${cx + r * .45} ${cy + r * .42}l${r * .45} ${r * .12}" stroke="#8a5a2b" stroke-width="${r * .05}" stroke-linecap="round"/>` : '';
  const cheeks = `<circle cx="${cx - r * .66}" cy="${cy + r * .25}" r="${r * .14}" fill="#ff7d9a" opacity=".55"/><circle cx="${cx + r * .66}" cy="${cy + r * .25}" r="${r * .14}" fill="#ff7d9a" opacity=".55"/>`;
  return `${ears}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f.face}"/>${patches}${eyes}${muzzle}${whiskers}${cheeks}`;
}

/** Só o rosto, para botões de escolha. */
export function face(animal: number): string {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${head(animal, 50, 58, 30)}</svg>`;
}

/** Carrinho de corrida com o bichinho dirigindo (vista de lado, virado para a direita). */
export function kart(color: string, animal: number, slot = 0): string {
  const id = `k${slot}`;
  return `<svg viewBox="0 0 150 110" aria-hidden="true" class="kart-svg">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient></defs>
<ellipse cx="76" cy="103" rx="60" ry="6" fill="#000" opacity=".22"/>
<g class="driver">${head(animal, 66, 40, 20)}</g>
<path d="M14 66 Q16 52 34 52 L58 52 Q64 62 82 62 L110 60 Q134 60 140 76 L142 86 Q142 92 134 92 L20 92 Q10 92 10 82Z" fill="${color}"/>
<path d="M14 66 Q16 52 34 52 L58 52 Q64 62 82 62 L110 60 Q134 60 140 76 L142 86 Q142 92 134 92 L20 92 Q10 92 10 82Z" fill="url(#${id})"/>
<path d="M4 50 h20 v10 h-20z" fill="#2c2c44"/><path d="M12 58 v8" stroke="#2c2c44" stroke-width="5"/>
<circle cx="112" cy="74" r="5" fill="#fff" opacity=".9"/><path d="M60 78 h40" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>
<text x="84" y="88" font-family="Arial Black,Arial" font-weight="900" font-size="15" fill="#fff" opacity=".9">${slot + 1}</text>
<g class="wheel" style="transform-origin:38px 92px"><circle cx="38" cy="92" r="15" fill="#22223a"/><circle cx="38" cy="92" r="7" fill="#d9dbef"/><path d="M38 80v24M26 92h24" stroke="#22223a" stroke-width="3"/></g>
<g class="wheel" style="transform-origin:118px 92px"><circle cx="118" cy="92" r="15" fill="#22223a"/><circle cx="118" cy="92" r="7" fill="#d9dbef"/><path d="M118 80v24M106 92h24" stroke="#22223a" stroke-width="3"/></g>
</svg>`;
}

export function flag(): string {
  return `<svg viewBox="0 0 40 60" aria-hidden="true"><path d="M5 4v54" stroke="#3a3a52" stroke-width="4" stroke-linecap="round"/><path d="M7 5h28v20H7z" fill="#fff"/><path d="M7 5h7v5H7zm14 0h7v5h-7zM14 10h7v5h-7zm14 0h7v5h-7zM7 15h7v5H7zm14 0h7v5h-7zM14 20h7v5h-7zm14 0h7v5h-7z" fill="#222"/></svg>`;
}
