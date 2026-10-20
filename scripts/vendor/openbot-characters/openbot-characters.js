/* OpenBot character family · original geometric drawings, SVG + CSS, no dependencies.
 * Approved 2026-10-18 SVG family, adapted for the shared OpenBot avatar renderer.
 * Browser: OpenBotCharacters.svg('peek', { state: 'thinking', size: 32 })
 * Node:    const characters = require('./openbot-characters.js')
 */
(function (root, factory) {
  const produce = typeof module === 'object' && module.exports
    ? require('./openbot-produce-characters') : root.OpenBotProduce;
  const api = factory(produce);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OpenBotCharacters = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (produce) {
  'use strict';
  const tr = (zh, en, params) => {
    const i18n = typeof window === 'object' && window.OpenBotI18n;
    return i18n && typeof i18n.t === 'function' ? i18n.t(zh, en, params) : zh;
  };
  const ink = '#24242A';
  // Keep the approved light artwork as the fallback while exposing semantic
  // paint hooks for an automatic night variant.  The renderer owns identity;
  // the theme owns the optional dark-mode paint values.
  const cssVar = (name, fallback) => `var(${name},${fallback})`;
  const bodyFill = fallback => cssVar('--ob-avatar-body-fill', fallback);
  const detailFill = fallback => cssVar('--ob-avatar-detail-fill', fallback);
  const faceFill = fallback => cssVar('--ob-avatar-face-fill', fallback);
  const faceInk = fallback => cssVar('--ob-avatar-face-ink', fallback);
  const faceLine = fallback => cssVar('--ob-avatar-face-line', fallback);
  const faceAccent = fallback => cssVar('--ob-avatar-mouth-accent', fallback);
  const originalCharacters = [
    { id: 'peek', name: tr('门门', 'Peek'), color: '#2875FF', note: tr('悄悄探头，看看你在忙什么', 'Peeks out quietly to see what you are working on'), motion: tr('探头 · 眨眼', 'Peeking · blink') },
    { id: 'sprout', name: tr('芽芽', 'Sprout'), color: '#99CD45', note: tr('想法正在悄悄发芽', 'An idea is quietly taking root'), motion: tr('叶片轻摇 · 偷看', 'Leaves sway · peek') },
    { id: 'tuantuan', name: tr('团团', 'TuanTuan'), color: '#FF6068', note: tr('有一点调皮，也很靠谱', 'A little playful, always dependable'), motion: tr('轻晃 · 眯眼', 'Sway · squint') },
    { id: 'bubble', name: tr('泡泡', 'Bubble'), color: '#49CFD6', note: tr('好奇心总是冒个小泡', 'Curiosity is always bubbling up'), motion: tr('泡泡轻颤 · 眨眼', 'Bubble trembles · blink') },
    { id: 'fold', name: tr('方方', 'Fold'), color: '#A38AF7', note: tr('把事情整理得妥妥当当', 'Keeps every detail neatly in order'), motion: tr('折角轻动 · 侧目', 'Corner moves · side glance') },
    { id: 'mochi', name: tr('糯糯', 'Mochi'), color: '#FFCE48', note: tr('软乎乎地陪你一起完成', 'Softly here to help you finish'), motion: tr('轻轻呼吸 · 眨眼', 'Gentle breath · blink') },
    { id: 'ghost', name: tr('咕咕', 'Ghost'), color: '#9664F5', note: tr('偷偷出现，给你一个暗号', 'Appears quietly with a little signal'), motion: tr('浮动 · 眨单眼', 'Float · wink') },
    { id: 'moon', name: tr('眠眠', 'Moon'), color: '#6C9BEF', note: tr('慢慢来，我一直都在', 'Take your time; I am right here'), motion: tr('困困眨眼 · 轻呼吸', 'Sleepy blink · gentle breath') },
    { id: 'curl', name: tr('卷卷', 'Curl'), color: '#FF953E', note: tr('脑袋一转，又有新点子', 'Turn it around and a new idea appears'), motion: tr('侧身轻摇 · 看一眼', 'Side sway · take a look') },
    { id: 'clover', name: tr('点点', 'Dot'), color: '#F65B8B', note: tr('给日常加一点好运气', 'Adds a little good luck to the day'), motion: tr('轻点头 · 眨眼', 'Nod · blink') },
    { id: 'seed', name: tr('粒粒', 'Seed'), color: '#8EB84B', note: tr('小小一粒，认真生长', 'Small, steady, and growing with care'), motion: tr('轻轻倾身 · 偷看', 'Lean in · peek') },
    { id: 'capsule', name: tr('啵啵', 'Capsule'), color: '#54BFF3', note: tr('听见啦，马上就来', 'Heard you; on my way'), motion: tr('耳朵轻动 · 开心眨眼', 'Ears twitch · happy blink') },
  ];
  const characters = originalCharacters.concat(produce ? produce.characters : []);
  const produceIds = new Set(produce ? produce.characters.map(c => c.id) : []);
  const states = [
    { id: 'idle', label: tr('待机', 'Idle') }, { id: 'thinking', label: tr('思考', 'Thinking') },
    { id: 'peeking', label: tr('偷看', 'Peeking') }, { id: 'done', label: tr('完成', 'Done') },
    { id: 'rest', label: tr('休息', 'Rest') },
  ];

  // Deliberately namespaced: many inline SVGs can coexist without ID collisions.
  // Motion is attached to inner groups, leaving placement transforms untouched.
  const css = `
.obf-avatar{display:block;overflow:visible;isolation:isolate}
.obf-avatar .obf-body{transform-origin:64px 112px;animation:obf-breathe 7s ease-in-out infinite;animation-delay:var(--obf-phase)}
.obf-avatar .obf-eye-lid{transform-box:fill-box;transform-origin:center;animation:obf-blink 8s linear infinite;animation-delay:var(--obf-phase)}
.obf-avatar .obf-gaze{animation:obf-gaze 9s ease-in-out infinite;animation-delay:var(--obf-phase);transform:translate(2px,-1px)}
.obf-avatar .obf-closed,.obf-avatar .obf-happy,.obf-avatar .obf-sleepy,.obf-avatar .obf-mouth-rest,.obf-avatar .obf-mouth-done,.obf-avatar .obf-mouth-flat,.obf-avatar .obf-mouth-worry,.obf-avatar .obf-mouth-await,.obf-avatar .obf-spark{display:none}
.obf-avatar .obf-line{fill:none;stroke:${faceInk(ink)};stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round}
.obf-avatar .obf-brow{stroke-width:3.3}
.obf-avatar .obf-peeker{animation:obf-peek 10s ease-in-out infinite;animation-delay:var(--obf-phase)}
.obf-avatar .obf-leaves{transform-origin:64px 43px;animation:obf-leaf 6s ease-in-out infinite;animation-delay:var(--obf-phase)}
.obf-avatar .obf-bubble-tip{transform-origin:94px 43px;animation:obf-bubble 7s ease-in-out infinite;animation-delay:var(--obf-phase)}
.obf-avatar .obf-fold-tip{transform-origin:88px 24px;animation:obf-fold 9s ease-in-out infinite;animation-delay:var(--obf-phase)}
.obf-avatar .obf-ear{transform-origin:64px 44px;animation:obf-ear 8s ease-in-out infinite;animation-delay:var(--obf-phase)}
.obf-avatar[data-character="ghost"] .obf-body{animation-name:obf-float}
.obf-avatar[data-character="curl"] .obf-body,.obf-avatar[data-character="seed"] .obf-body{animation-name:obf-sway}
.obf-avatar[data-character="tuantuan"] .obf-eye-left .obf-open{display:none}
.obf-avatar[data-character="tuantuan"] .obf-eye-left .obf-sleepy{display:inline}
.obf-avatar[data-character="ghost"] .obf-eye-right .obf-open{display:none}
.obf-avatar[data-character="ghost"] .obf-eye-right .obf-happy{display:inline}
.obf-avatar[data-character="moon"] .obf-open{display:none}
.obf-avatar[data-character="moon"] .obf-sleepy{display:inline}
.obf-avatar[data-state="thinking"] .obf-gaze{animation:obf-think 5s ease-in-out infinite;animation-delay:var(--obf-phase);transform:translate(0,-3px)}
.obf-avatar[data-state="thinking"] .obf-face-sway{transform-origin:64px 80px;transform:rotate(-2deg);animation:obf-think-tilt 6s ease-in-out infinite;animation-delay:var(--obf-phase)}
.obf-avatar[data-state="peeking"] .obf-gaze{animation:obf-side-eye 6s ease-in-out infinite;animation-delay:var(--obf-phase);transform:translate(3px,0)}
.obf-avatar[data-state="peeking"] .obf-peeker{transform:translateX(-4px);animation:obf-peek-more 6s ease-in-out infinite;animation-delay:var(--obf-phase)}
.obf-avatar[data-state="done"] .obf-body{animation:obf-celebrate .65s ease-out 1}
.obf-avatar[data-state="done"] .obf-eye-right .obf-open,.obf-avatar[data-state="done"] .obf-eye-right .obf-sleepy,.obf-avatar[data-state="done"] .obf-mouth-idle{display:none}
.obf-avatar[data-state="done"] .obf-eye-right .obf-happy,.obf-avatar[data-state="done"] .obf-mouth-done,.obf-avatar[data-state="done"] .obf-spark{display:inline}
.obf-avatar[data-state="done"] .obf-spark{animation:obf-spark .65s ease-out 1;transform-origin:110px 25px}
.obf-avatar[data-state="rest"] .obf-open,.obf-avatar[data-state="rest"] .obf-happy,.obf-avatar[data-state="rest"] .obf-sleepy,.obf-avatar[data-state="rest"] .obf-mouth-idle,.obf-avatar[data-state="rest"] .obf-brow{display:none}
.obf-avatar[data-state="rest"] .obf-eye .obf-open,.obf-avatar[data-state="rest"] .obf-eye .obf-happy,.obf-avatar[data-state="rest"] .obf-eye .obf-sleepy{display:none}
.obf-avatar[data-state="rest"] .obf-closed,.obf-avatar[data-state="rest"] .obf-mouth-rest{display:inline}
.obf-avatar[data-state="rest"] .obf-body{animation:obf-rest 8s ease-in-out infinite;animation-delay:var(--obf-phase)}
.obf-avatar[data-state="rest"] .obf-eye-lid,.obf-avatar[data-state="rest"] .obf-gaze,.obf-avatar[data-state="rest"] .obf-leaves,.obf-avatar[data-state="rest"] .obf-ear,.obf-avatar[data-state="rest"] .obf-peeker,.obf-avatar[data-state="rest"] .obf-fold-tip,.obf-avatar[data-state="rest"] .obf-bubble-tip{animation:none}
.obf-avatar[data-character="peek"] .obf-line{stroke:${faceLine('#FFF')}}
.obf-avatar[data-motion="paused"] *{animation-play-state:paused!important}
.obf-avatar[data-motion="off"] *{animation:none!important;transition:none!important}
@keyframes obf-blink{0%,33%,38%,100%{transform:scaleY(1)}35%,36%{transform:scaleY(.08)}}
@keyframes obf-gaze{0%,22%,64%,100%{transform:translate(2px,-1px)}29%,48%{transform:translate(-2px,0)}72%,86%{transform:translate(1px,-2px)}}
@keyframes obf-breathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-.7px) scale(1.006,.994)}}
@keyframes obf-peek{0%,19%,61%,100%{transform:translateX(0)}32%,47%{transform:translateX(-3px)}}
@keyframes obf-peek-more{0%,100%{transform:translateX(-1px)}30%,70%{transform:translateX(-6px)}}
@keyframes obf-leaf{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(3deg)}}
@keyframes obf-bubble{0%,100%{transform:scale(1)}50%{transform:scale(1.035,.975)}}
@keyframes obf-fold{0%,35%,75%,100%{transform:rotate(0)}45%,60%{transform:rotate(-4deg)}}
@keyframes obf-ear{0%,30%,45%,100%{transform:rotate(0)}34%{transform:rotate(-4deg)}39%{transform:rotate(3deg)}}
@keyframes obf-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes obf-sway{0%,100%{transform:rotate(-.6deg)}50%{transform:rotate(.8deg)}}
@keyframes obf-think{0%,100%{transform:translate(0,-3px)}35%,70%{transform:translate(2px,-2px)}}
@keyframes obf-think-tilt{0%,100%{transform:rotate(0)}45%,65%{transform:rotate(-3deg)}}
@keyframes obf-side-eye{0%,100%{transform:translate(3px,0)}42%,70%{transform:translate(-3px,-1px)}}
@keyframes obf-celebrate{0%,100%{transform:translateY(0) scale(1)}25%{transform:translateY(0) scale(1.035,.965)}55%{transform:translateY(-5px) scale(.98,1.02)}80%{transform:translateY(0) scale(1.025,.975)}}
@keyframes obf-spark{0%{opacity:0;transform:scale(.5)}55%,100%{opacity:1;transform:scale(1)}}
@keyframes obf-rest{0%,100%{transform:scale(1)}50%{transform:scale(1.005,.988)}}
@media(prefers-reduced-motion:reduce){.obf-avatar *{animation:none!important;transition:none!important}}
`;

  function eye(x, y, side, options = {}) {
    const rx = options.rx || 10.2, ry = options.ry || 13.1;
    const pupilX = Math.min(4.8, rx * .45), pupilY = ry * .63;
    // No clipping paths / IDs; pupils stay inside the sclera over the full gaze range.
    return `<g class="obf-eye obf-eye-${side}" transform="translate(${x} ${y}) rotate(${options.rotate || 0})"><g class="obf-eye-lid">
<g class="obf-open"><ellipse rx="${rx}" ry="${ry}" fill="${faceFill('#FFF')}"/><g class="obf-gaze"><ellipse rx="${pupilX}" ry="${pupilY}" fill="${faceInk(ink)}"/></g></g>
<g class="obf-sleepy"><path d="M${-rx},0 Q0,${ry * .45} ${rx},0 A${rx},${ry} 0 0 1 ${-rx},0Z" fill="${faceFill('#FFF')}"/><path d="M${-rx + 1},0 Q0,${ry * .36} ${rx - 1},0 Q${rx - 1},${ry * .65} 0,${ry * .67} Q${-rx + 1},${ry * .65} ${-rx + 1},0Z" fill="${faceInk(ink)}"/></g>
<path class="obf-line obf-happy" d="M${rx * .65},${-ry * .35} Q${-rx * .1},${-ry * .2} ${-rx * .62},${ry * .22} L${rx * .5},${ry * .3}"/>
<path class="obf-line obf-closed" d="M${-rx * .68},0 Q0,${ry * .72} ${rx * .68},0"/>
</g></g>`;
  }
  function face(o) {
    const { left, right, mouth, brows = [], excited = false } = o;
    return `<g class="obf-face-sway">${eye(...left, 'left', o.eyeOptions || {})}${eye(...right, 'right', o.eyeOptions || {})}
${brows.map(d => `<path class="obf-line obf-brow" d="${d}"/>`).join('')}
<g transform="translate(${mouth[0]} ${mouth[1]})">
${excited ? `<g class="obf-mouth-idle"><path d="M-6-3Q0-6 6-3Q7 7 0 8Q-6 7-6-3Z" fill="${faceInk(ink)}"/><path d="M-4 5Q0 1 4 5Q2 9-1 8Q-3 7-4 5Z" fill="${faceAccent('#FF727A')}"/></g>` : '<path class="obf-line obf-mouth-idle" d="M-3.4-1Q0 4.5 4-1.5"/>'}
<path class="obf-line obf-mouth-done" d="M-4.5-1Q0 6 5-2"/><path class="obf-line obf-mouth-rest" d="M-2 1Q0 2.6 2 1"/>
<path class="obf-line obf-mouth-flat" d="M-3.5 1H3.5"/><path class="obf-line obf-mouth-worry" d="M-4 2Q0-3 4 2"/><ellipse class="obf-line obf-mouth-await" cy="1" rx="2.2" ry="2.7"/>
</g></g>`;
  }

  function drawing(id) {
    switch (id) {
      case 'peek':
        return `<g class="obf-peeker"><path d="M90 49C72 49 56 66 56 87C56 108 69 116 94 116H102V68Q102 49 90 49Z" fill="${faceInk(ink)}"/>${face({ left: [68, 82], right: [82, 76], mouth: [76, 94], eyeOptions: { rx: 6.6, ry: 9.1, rotate: -9 } })}</g><path d="M12 108V62C12 29 30 12 64 12S116 29 116 62V108Q116 116 108 116H93Q85 116 85 108V66C85 49 79 42 64 42S43 49 43 66V108Q43 116 35 116H20Q12 116 12 108Z" fill="${bodyFill('#2875FF')}"/>`;
      case 'sprout':
        return `<g class="obf-leaves"><path d="M63 47C66 31 54 33 46 24C35 10 44 3 55 9C68 14 70 26 66 39C72 22 85 21 91 26C99 35 82 39 68 37L66 48Z" fill="${detailFill('#78BA3E')}"/><path d="M64 34C50 30 42 23 42 16C42 7 50 5 57 9C69 15 68 27 64 34Z" fill="${bodyFill('#99CD45')}"/></g><path d="M62 39C82 39 88 56 101 70C120 91 106 115 79 117C48 121 22 108 22 83C22 57 39 39 62 39Z" fill="${bodyFill('#99CD45')}"/>${face({ left: [46, 75], right: [76, 84], mouth: [60, 97], brows: ['M44 56L48 55', 'M78 64L81 67'], eyeOptions: { rotate: -10 } })}`;
      case 'tuantuan':
        return `<path d="M23 56C27 36 43 18 61 20C74 20 82 27 88 34C111 36 121 57 113 76C122 99 109 115 89 116C79 116 70 114 64 113C43 122 21 114 20 97C3 84 8 64 23 56Z" fill="${bodyFill('#FF6068')}"/>${face({ left: [45, 75], right: [81, 66], mouth: [64, 89], brows: ['M75 46L80 44'], eyeOptions: { rotate: -12 } })}`;
      case 'bubble':
        return `<circle class="obf-bubble-tip" cx="100" cy="34" r="21" fill="${bodyFill('#49CFD6')}"/><path d="M111 76C111 103 91 117 62 117C31 118 13 103 13 80C13 53 33 29 64 29C92 29 111 49 111 76Z" fill="${bodyFill('#49CFD6')}"/>${face({ left: [45, 82], right: [77, 69], mouth: [64, 91], brows: ['M38 61L41 58', 'M72 49Q75 47 78 49'], eyeOptions: { rotate: -13 } })}`;
      case 'fold':
        return `<path d="M30 21Q17 21 17 36V98Q17 115 35 115H94Q113 115 113 97V48L88 21Z" fill="${bodyFill('#A38AF7')}"/><path class="obf-fold-tip" d="M88 21V38Q88 48 99 48H113Z" fill="${detailFill('#C4B2FD')}"/>${face({ left: [50, 79], right: [81, 70], mouth: [67, 91], brows: ['M42 60L46 56'], eyeOptions: { rotate: -11 } })}`;
      case 'mochi':
        return `<path d="M11 94C13 68 34 37 60 35C92 31 111 57 118 88C123 107 114 115 97 115H33Q8 115 11 94Z" fill="${bodyFill('#FFCE48')}"/><path d="M30 88L33 91M97 84L94 88" fill="none" stroke="#FF706C" stroke-width="7" stroke-linecap="round"/>${face({ left: [49, 72], right: [79, 68], mouth: [65, 89], brows: ['M43 54L47 51'], eyeOptions: { rotate: -8 } })}`;
      case 'ghost':
        return `<path d="M17 89C20 49 34 19 65 19C98 19 109 49 114 83L119 103C120 118 99 120 88 111C76 123 50 121 43 111C27 124 8 117 12 102Z" fill="${bodyFill('#9664F5')}"/>${face({ left: [47, 66], right: [87, 68], mouth: [65, 83] })}`;
      case 'moon':
        return `<path d="M57 19C30 22 10 49 12 77C14 103 36 117 69 117C98 117 115 103 119 83Q123 72 112 72C81 73 64 56 63 32C63 23 64 16 57 19Z" fill="${bodyFill('#6C9BEF')}"/>${face({ left: [45, 81], right: [77, 87], mouth: [61, 97], brows: ['M42 68L46 67', 'M79 72L83 75'], eyeOptions: { rx: 9.7, ry: 11.5, rotate: -5 } })}`;
      case 'curl':
        return `<path d="M115 57C116 80 98 90 87 82C80 90 88 100 101 100C108 100 108 107 100 111C77 122 36 119 20 102C0 81 16 45 43 28C75 7 113 20 115 57Z" fill="${bodyFill('#FF953E')}"/><path d="M87 82C83 72 87 66 95 66C106 66 105 77 98 81Q92 84 87 82Z" fill="${detailFill('#E97E26')}"/>${face({ left: [40, 78], right: [67, 65], mouth: [56, 88], brows: ['M60 47L64 45'], eyeOptions: { rotate: -14 } })}`;
      case 'clover':
        return `<path d="M64 29C44 6 16 17 17 43C17 52 21 60 24 64C6 82 9 105 28 113C43 121 56 113 64 107C78 123 103 120 112 103C122 86 112 72 104 65C126 43 112 16 92 18C80 17 72 21 64 29Z" fill="${bodyFill('#F65B8B')}"/>${face({ left: [44, 68], right: [78, 77], mouth: [59, 89], brows: ['M75 58L79 57'], eyeOptions: { rotate: -8 } })}`;
      case 'seed':
        return `<path d="M68 18C83 20 107 45 115 66C125 89 100 108 77 117C58 125 39 111 23 93C10 80 9 70 19 57C31 42 53 17 68 18Z" fill="${bodyFill('#8EB84B')}"/>${face({ left: [50, 80], right: [82, 66], mouth: [67, 92], brows: ['M41 63L45 60', 'M77 47Q80 45 84 47'], eyeOptions: { rotate: -12 } })}`;
      case 'capsule':
        return `<g class="obf-ear"><circle cx="37" cy="27" r="11" fill="${bodyFill('#54BFF3')}"/><circle cx="92" cy="26" r="11" fill="${bodyFill('#54BFF3')}"/></g><path d="M25 73C22 48 35 28 63 28C94 27 105 45 109 75C115 107 101 118 71 119C39 123 30 106 25 73Z" fill="${bodyFill('#54BFF3')}"/>${face({ left: [46, 71], right: [78, 60], mouth: [65, 85], excited: true, eyeOptions: { rotate: -12 } })}`;
      default: throw new Error('Unknown character');
    }
  }

  function escapeAttr(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  }
  function svg(id = 'peek', options = {}) {
    if (produceIds.has(id)) return produce.svg(id, options);
    const index = characters.findIndex(c => c.id === id);
    const character = characters[index < 0 ? 0 : index];
    const state = states.some(s => s.id === options.state) ? options.state : 'idle';
    const motion = ['off', 'paused'].includes(options.motion) ? options.motion : 'auto';
    const size = Number.isFinite(options.size) ? Math.min(2048, Math.max(12, Math.round(options.size))) : 128;
    const phase = Number.isFinite(options.phase) ? Math.min(0, Math.max(-60, options.phase)) : -(Math.max(0, index) * .57);
    const label = options.label || `${character.name} · ${states.find(s => s.id === state).label}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="obf-avatar" data-character="${character.id}" data-state="${state}" data-motion="${motion}" width="${size}" height="${size}" viewBox="0 0 128 128" role="img" aria-label="${escapeAttr(label)}" style="--obf-phase:${phase}s">
<title>${escapeAttr(label)}</title>${options.withStyle === false ? '' : `<style>${css}</style>`}<g class="obf-body">${drawing(character.id)}</g><path class="obf-spark" d="M110 16L113 10M117 24L123 22" stroke="#FFCB3F" stroke-width="3.5" stroke-linecap="round" fill="none"/></svg>`;
  }

  function setState(element, state) {
    if (produce && element && element.matches('svg.obx-avatar')) return produce.setState(element, state);
    if (!element || !element.matches('svg.obf-avatar')) return false;
    const validState = states.find(s => s.id === state);
    const character = characters.find(c => c.id === element.dataset.character);
    if (!validState || !character) return false;
    const label = `${character.name} · ${validState.label}`;
    const title = element.querySelector('title');
    if (element.dataset.state !== state) element.dataset.state = state;
    if (element.getAttribute('aria-label') !== label) element.setAttribute('aria-label', label);
    if (title && title.textContent !== label) title.textContent = label;
    return true;
  }

  return Object.freeze({ characters: Object.freeze(characters.map(Object.freeze)), states: Object.freeze(states.map(Object.freeze)), css: css + (produce ? produce.css : ''), svg, setState });
});
