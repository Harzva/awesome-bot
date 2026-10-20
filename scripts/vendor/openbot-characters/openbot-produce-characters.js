/* OpenBot · 20 new companions. Original vector reconstruction of the approved
 * character concepts. Standalone SVG/CSS: no images, fonts, scripts or remote URLs.
 * Browser: OpenBotProduce.svg('strawberry', {state:'thinking', size:32})
 * App adapter: shared stylesheet and neutral/error mouths for real task states.
 * Node: require('./openbot-produce-characters.js')
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OpenBotProduce = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const tr = (zh, en, params) => {
    const i18n = typeof window === 'object' && window.OpenBotI18n;
    return i18n && typeof i18n.t === 'function' ? i18n.t(zh, en, params) : zh;
  };
  const ink = '#25252B';
  // Semantic paint hooks keep the original vector colors as light-mode
  // fallbacks while allowing the shared night theme to warm the family.
  const cssVar = (name, fallback) => `var(${name},${fallback})`;
  const bodyFill = fallback => cssVar('--ob-avatar-body-fill', fallback);
  const detailFill = fallback => cssVar('--ob-avatar-detail-fill', fallback);
  const shadowFill = fallback => cssVar('--ob-avatar-shadow-fill', fallback);
  const faceFill = fallback => cssVar('--ob-avatar-face-fill', fallback);
  const faceInk = fallback => cssVar('--ob-avatar-face-ink', fallback);
  const faceAccent = fallback => cssVar('--ob-avatar-mouth-accent', fallback);
  const cheekFill = fallback => cssVar('--ob-avatar-cheek-fill', fallback);
  const characters = [
    {id:'strawberry',number:13,name:tr('莓莓','Strawberry'),color:'#F5354A',group:'fruit',note:tr('有点害羞，也想多看你一眼','A little shy, but eager to take a look'),motion:tr('叶子轻摇 · 害羞眨眼','Leaves sway · shy blink')},
    {id:'peach',number:14,name:tr('桃桃','Peach'),color:'#FF8277',group:'fruit',note:tr('悄悄给你一个温柔的暗号','Quietly sends you a gentle signal'),motion:tr('歪头 · 眨单眼','Tilt · wink')},
    {id:'banana',number:15,name:tr('蕉蕉','Banana'),color:'#FFD324',group:'fruit',note:tr('事情交给我，酷一点也没关系','Leave it to me; a little cool is fine'),motion:tr('扶墨镜 · 得意轻晃','Adjust shades · confident sway')},
    {id:'lemon',number:16,name:tr('柠柠','Lemon'),color:'#FFE22C',group:'fruit',note:tr('又发现一件有意思的小事','Found another interesting little thing'),motion:tr('惊喜抬头 · 叶片轻摆','Look up · leaves sway')},
    {id:'pear',number:17,name:tr('梨梨','Pear'),color:'#B8DD39',group:'fruit',note:tr('我只是路过，顺便偷偷看一眼','Just passing by for a quick peek'),motion:tr('侧眼偷瞄 · 轻轻倾身','Side glance · lean in')},
    {id:'watermelon',number:18,name:tr('瓜瓜','Watermelon'),color:'#FF535C',group:'fruit',note:tr('把好消息笑着告诉你','Smiles while sharing good news'),motion:tr('笑眯眯 · 轻轻摇摆','Grin · gentle sway')},
    {id:'pineapple',number:19,name:tr('菠菠','Pineapple'),color:'#FFB911',group:'fruit',note:tr('头顶小皇冠，认真做大事','A little crown for serious work'),motion:tr('叶冠轻摇 · 自信点头','Crown leaves sway · confident nod')},
    {id:'blueberry',number:20,name:tr('蓝蓝','Blueberry'),color:'#414DC8',group:'fruit',note:tr('有一点困，但我一直在听','A little sleepy, still listening'),motion:tr('困困眨眼 · 慢呼吸','Sleepy blink · slow breath')},
    {id:'eggplant',number:21,name:tr('茄茄','Eggplant'),color:'#7827A4',group:'vegetable',note:tr('表面很酷，事情都记着呢','Looks cool, remembers every detail'),motion:tr('傲娇侧目 · 轻晃','Side-eye · gentle sway')},
    {id:'chili',number:22,name:tr('椒椒','Chili'),color:'#F4243E',group:'vegetable',note:tr('来啦，这件事让我来','Here I am; let me handle this'),motion:tr('蓄力前倾 · 挑眉','Lean forward · raise a brow')},
    {id:'carrot',number:23,name:tr('卜卜','Carrot'),color:'#FF861C',group:'vegetable',note:tr('每一个小进展都值得开心','Every little step forward is worth celebrating'),motion:tr('叶子弹动 · 元气小跳','Leaves bounce · energetic hop')},
    {id:'mushroom',number:24,name:tr('菇菇','Mushroom'),color:'#F22D42',group:'vegetable',note:tr('躲在帽檐下面，认真陪着你','Under the brim, here with you'),motion:tr('帽檐轻动 · 探头','Brim moves · peek out')},
    {id:'peas',number:25,name:tr('豌豌','Peas'),color:'#AADC42',group:'vegetable',note:tr('挤一挤，我们一起想办法','Squeeze in and let’s solve it together'),motion:tr('豆豆轻挤 · 调皮眨眼','Peas nudge · playful blink')},
    {id:'broccoli',number:26,name:tr('西兰兰','Broccoli'),color:'#15985B',group:'vegetable',note:tr('等等，让我再想一个好办法','Wait, let me think of a better way'),motion:tr('树冠轻摆 · 抬眼思考','Crown sways · look up and think')},
    {id:'garlic',number:27,name:tr('蒜蒜','Garlic'),color:'#F7F0DF',group:'vegetable',note:tr('好主意已经偷偷想好了','A good idea is quietly ready'),motion:tr('侧眼偷笑 · 小辫轻摇','Side grin · little tuft sways')},
    {id:'pumpkin',number:28,name:tr('南南','Pumpkin'),color:'#FF951C',group:'vegetable',note:tr('笑一下，我们又完成了一点','Smile; we made a little more progress'),motion:tr('憨憨点头 · 笑出小牙','Cheerful nod · toothy grin')},
    {id:'cloud',number:29,name:tr('云朵','Cloud'),color:'#91C1FF',group:'spirit',note:tr('慢慢来，我在这里陪着你','Take your time; I am here with you'),motion:tr('柔软漂浮 · 温柔眨眼','Soft float · gentle blink')},
    {id:'bolt',number:30,name:tr('闪闪','Bolt'),color:'#1462FF',group:'spirit',note:tr('准备好了，马上行动','Ready when you are'),motion:tr('机灵倾身 · 自信回眸','Quick lean · confident glance')},
    {id:'jelly',number:31,name:tr('冻冻','Jelly'),color:'#42DEBE',group:'spirit',note:tr('哇，又有新鲜事发生啦','Wow, something new just happened'),motion:tr('软弹呼吸 · 惊喜眨眼','Soft bounce · surprised blink')},
    {id:'ink',number:32,name:tr('墨墨','Ink'),color:'#292B31',group:'spirit',note:tr('我没偷看，只是刚好在这里','I was not peeking; I just happened to be here'),motion:tr('悄悄倾身 · 慢慢侧眼','Quiet lean · slow side glance')}
  ];
  const states = [
    {id:'idle',label:tr('待机','Idle')}, {id:'thinking',label:tr('思考','Thinking')},
    {id:'peeking',label:tr('偷看','Peeking')}, {id:'done',label:tr('完成','Done')}, {id:'rest',label:tr('休息','Rest')}
  ];
  const css = `
.obx-avatar{display:block;overflow:hidden;isolation:isolate}
.obx-avatar .obx-body{transform-origin:64px 112px;animation:obx-breathe 7.2s ease-in-out infinite;animation-delay:var(--obx-phase)}
.obx-avatar .obx-lid{transform-box:fill-box;transform-origin:center;animation:obx-blink 7.6s linear infinite;animation-delay:var(--obx-phase)}
.obx-avatar .obx-pupil{animation:obx-gaze 9s ease-in-out infinite;animation-delay:var(--obx-phase)}
.obx-avatar .obx-eye-awake,.obx-avatar .obx-eye-rest,.obx-avatar .obx-eye-wink,.obx-avatar .obx-mouth-done,.obx-avatar .obx-mouth-rest,.obx-avatar .obx-mouth-flat,.obx-avatar .obx-mouth-worry,.obx-avatar .obx-mouth-await,.obx-avatar .obx-spark{display:none}
.obx-avatar .obx-line{fill:none;stroke:${faceInk(ink)};stroke-width:2.15;stroke-linecap:round;stroke-linejoin:round}
.obx-avatar .obx-brow{stroke-width:2.9}
.obx-avatar .obx-leaf{transform-origin:64px 31px;animation:obx-leaf 6.8s ease-in-out infinite;animation-delay:var(--obx-phase)}
.obx-avatar .obx-crown{transform-origin:64px 46px;animation:obx-crown 6.2s ease-in-out infinite;animation-delay:var(--obx-phase)}
.obx-avatar .obx-tuft{transform-origin:62px 29px;animation:obx-tuft 8s ease-in-out infinite;animation-delay:var(--obx-phase)}
.obx-avatar .obx-glasses{transform-origin:64px 65px;animation:obx-glasses 9s ease-in-out infinite;animation-delay:var(--obx-phase)}
.obx-avatar .obx-glasses ellipse{stroke:#575A64;stroke-width:1}
.obx-avatar .obx-cap{transform-origin:64px 72px;animation:obx-cap 8.2s ease-in-out infinite;animation-delay:var(--obx-phase)}
.obx-avatar .obx-peeker{animation:obx-peek 8.2s ease-in-out infinite;animation-delay:var(--obx-phase)}
.obx-avatar .obx-pea-left{animation:obx-pea-left 6s ease-in-out infinite;animation-delay:var(--obx-phase)}
.obx-avatar .obx-pea-right{animation:obx-pea-right 6s ease-in-out infinite;animation-delay:var(--obx-phase)}
.obx-avatar .obx-pea-center{animation:obx-pea-center 6s ease-in-out infinite;animation-delay:var(--obx-phase)}
.obx-avatar[data-character="peach"] .obx-body,.obx-avatar[data-character="watermelon"] .obx-body,.obx-avatar[data-character="eggplant"] .obx-body{animation-name:obx-sway}
.obx-avatar[data-character="pear"] .obx-body,.obx-avatar[data-character="ink"] .obx-body{animation-name:obx-sneak;animation-duration:9s}
.obx-avatar[data-character="pear"] .obx-pupil,.obx-avatar[data-character="garlic"] .obx-pupil,.obx-avatar[data-character="ink"] .obx-pupil{animation-name:obx-side-eye}
.obx-avatar[data-character="cloud"] .obx-body{animation-name:obx-float;animation-duration:6.4s}
.obx-avatar[data-character="jelly"] .obx-body{animation-name:obx-jelly;animation-duration:5.6s}
.obx-avatar[data-character="carrot"] .obx-body{animation-name:obx-hop;animation-duration:7s}
.obx-avatar[data-character="bolt"] .obx-body,.obx-avatar[data-character="chili"] .obx-body{animation-name:obx-ready;animation-duration:6.8s}
.obx-avatar[data-character="lemon"] .obx-body{animation-name:obx-curious}
.obx-avatar[data-character="pumpkin"] .obx-body{animation-name:obx-nod;animation-duration:7.8s}
.obx-avatar[data-character="blueberry"] .obx-lid{animation-duration:10s}
.obx-avatar[data-character="broccoli"] .obx-pupil{animation-name:obx-think;animation-duration:8.5s}
.obx-avatar[data-state="thinking"] .obx-face{transform:rotate(-2deg);transform-origin:64px 74px;animation:obx-think-tilt 6s ease-in-out infinite;animation-delay:var(--obx-phase)}
.obx-avatar[data-state="thinking"] .obx-pupil{transform:translate(0,-1.6px);animation-name:obx-think;animation-duration:5s}
.obx-avatar[data-state="peeking"] .obx-pupil{transform:translate(1.6px,-.25px);animation-name:obx-side-eye;animation-duration:5.8s}
.obx-avatar[data-state="peeking"] .obx-body{transform:translateX(-1.7px) rotate(-1.5deg);animation-name:obx-sneak;animation-duration:6.2s}
.obx-avatar[data-state="done"] .obx-body{animation:obx-done .68s ease-out 1}
.obx-avatar[data-state="done"] .obx-eye-idle,.obx-avatar[data-state="done"] .obx-mouth-idle{display:none}
.obx-avatar[data-state="done"] .obx-eye-left .obx-eye-awake,.obx-avatar[data-state="done"] .obx-eye-right .obx-eye-wink,.obx-avatar[data-state="done"] .obx-mouth-done,.obx-avatar[data-state="done"] .obx-spark{display:inline}
.obx-avatar[data-state="done"] .obx-spark{transform-origin:110px 21px;animation:obx-spark .68s ease-out 1}
.obx-avatar[data-state="rest"] .obx-eye-idle,.obx-avatar[data-state="rest"] .obx-mouth-idle,.obx-avatar[data-state="rest"] .obx-brow,.obx-avatar[data-state="rest"] .obx-glasses{display:none}
.obx-avatar[data-state="rest"] .obx-eye-rest,.obx-avatar[data-state="rest"] .obx-mouth-rest{display:inline}
.obx-avatar[data-state="rest"] .obx-body{animation:obx-rest 8.6s ease-in-out infinite;animation-delay:var(--obx-phase)}
.obx-avatar[data-state="rest"] .obx-body *,.obx-avatar[data-state="done"] .obx-body *{animation:none}
.obx-avatar[data-character="ink"] .obx-line{stroke:#E2E6ED}
.obx-avatar[data-character="ink"] .obx-mouth-done>path:first-child{stroke:#E2E6ED;stroke-width:1.2}
.obx-avatar[data-motion="paused"] *{animation-play-state:paused!important}
.obx-avatar[data-motion="off"] *{animation:none!important;transition:none!important}
@keyframes obx-breathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-.7px) scale(1.007,.994)}}
@keyframes obx-blink{0%,38%,42%,100%{transform:scaleY(1)}39.5%,40.5%{transform:scaleY(.07)}}
@keyframes obx-gaze{0%,25%,65%,100%{transform:translate(0,0)}33%,50%{transform:translate(1.2px,-.4px)}75%,89%{transform:translate(-1px,.3px)}}
@keyframes obx-leaf{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(3deg)}}
@keyframes obx-crown{0%,100%{transform:rotate(-1.3deg)}50%{transform:rotate(2.4deg)}}
@keyframes obx-tuft{0%,26%,74%,100%{transform:rotate(0)}42%,54%{transform:rotate(3deg)}}
@keyframes obx-glasses{0%,28%,60%,100%{transform:translate(0,0) rotate(0)}36%,48%{transform:translate(-1px,-4px) rotate(-5deg)}}
@keyframes obx-cap{0%,15%,80%,100%{transform:rotate(0)}35%,60%{transform:rotate(-2deg) translateY(-1.2px)}}
@keyframes obx-peek{0%,15%,80%,100%{transform:translate(0,0)}35%,60%{transform:translate(2px,2px)}}
@keyframes obx-pea-left{0%,100%{transform:translate(0,0)}50%{transform:translate(1.4px,.4px)}}
@keyframes obx-pea-right{0%,100%{transform:translate(0,0)}50%{transform:translate(-1.4px,.7px)}}
@keyframes obx-pea-center{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
@keyframes obx-sway{0%,100%{transform:rotate(-.9deg)}50%{transform:rotate(1.3deg)}}
@keyframes obx-sneak{0%,18%,85%,100%{transform:translateX(0) rotate(0)}38%,65%{transform:translateX(-1.7px) rotate(-1.5deg)}}
@keyframes obx-side-eye{0%,16%,85%,100%{transform:translate(0,0)}34%,64%{transform:translate(1.6px,-.25px)}}
@keyframes obx-float{0%,100%{transform:translateY(1px)}50%{transform:translateY(-2px)}}
@keyframes obx-jelly{0%,100%{transform:scale(1)}40%{transform:scale(1.022,.973)}65%{transform:scale(.99,1.013)}}
@keyframes obx-hop{0%,55%,78%,100%{transform:translateY(0) scale(1)}61%{transform:scale(1.016,.982)}68%{transform:translateY(-2.4px) scale(.991,1.012)}74%{transform:scale(1.012,.988)}}
@keyframes obx-ready{0%,18%,80%,100%{transform:rotate(0)}40%,60%{transform:rotate(-2deg) translateX(1px)}}
@keyframes obx-curious{0%,22%,82%,100%{transform:translateY(0)}42%,65%{transform:translateY(-1.4px) rotate(-1deg)}}
@keyframes obx-nod{0%,20%,75%,100%{transform:scale(1)}35%{transform:scale(1.014,.986)}50%{transform:scale(.997,1.003)}}
@keyframes obx-think{0%,100%{transform:translate(0,-1.6px)}40%,70%{transform:translate(1.1px,-1.3px)}}
@keyframes obx-think-tilt{0%,100%{transform:rotate(0)}45%,70%{transform:rotate(-2deg)}}
@keyframes obx-done{0%,100%{transform:translateY(0) scale(1)}23%{transform:scale(1.025,.975)}52%{transform:translateY(-3px) scale(.985,1.015)}78%{transform:scale(1.012,.988)}}
@keyframes obx-spark{0%{opacity:0;transform:scale(.65)}60%,100%{opacity:1;transform:scale(1)}}
@keyframes obx-rest{0%,100%{transform:scale(1)}50%{transform:scale(1.005,.99)}}
@media(prefers-reduced-motion:reduce){.obx-avatar *{animation:none!important;transition:none!important}}
`;

  const path = (d, fill, cls = '') => `<path${cls ? ` class="${cls}"` : ''} d="${d}" fill="${fill}"/>`;
  const bodyPath = (d, fill, cls = '') => path(d, bodyFill(fill), cls ? `${cls} obx-body-fill` : 'obx-body-fill');
  const detailPath = (d, fill, cls = '') => path(d, detailFill(fill), cls ? `${cls} obx-detail-fill` : 'obx-detail-fill');
  const shadowPath = (d, fill, cls = '') => path(d, shadowFill(fill), cls ? `${cls} obx-shadow-fill` : 'obx-shadow-fill');
  const line = (d, cls = '') => `<path class="obx-line ${cls}" d="${d}"/>`;
  const ellipse = (cx,cy,rx,ry,fill) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
  const bodyEllipse = (cx,cy,rx,ry,fill) => ellipse(cx,cy,rx,ry,bodyFill(fill));
  const detailEllipse = (cx,cy,rx,ry,fill) => ellipse(cx,cy,rx,ry,detailFill(fill));
  const group = (cls, content) => `<g class="${cls}">${content}</g>`;
  function eye(x,y,side,kind='open',r=9.3,h=12.3,rotation=0) {
    const pupil = (cy=0,sy=h*.57) => group('obx-pupil', ellipse(1,cy,r*.46,sy,faceInk(ink))+ellipse(2.5,cy-sy*.53,1.2,1.5,faceFill('#FFF')));
    const open = ellipse(0,0,r,h,faceFill('#FFF'))+pupil();
    const sleepy = path(`M${-r} 1Q0 -1 ${r} -3C${r+1} ${h+2} ${-r} ${h+3} ${-r} 1Z`,faceFill('#FFF'))+group('obx-pupil',ellipse(2,4,r*.43,h*.40,faceInk(ink)));
    const wink = line(`M${r*.65} -3Q0 -6 ${-r*.65} 1Q0 -1 ${r*.65} 4`);
    return `<g class="obx-eye obx-eye-${side}" transform="translate(${x} ${y}) rotate(${rotation})"><g class="obx-lid"><g class="obx-eye-idle">${kind==='wink'?wink:kind==='sleepy'?sleepy:open}</g><g class="obx-eye-awake">${open}</g><path class="obx-line obx-eye-rest" d="M${-r*.7} 0Q0 6 ${r*.7} 0"/><path class="obx-line obx-eye-wink" d="M${r*.65} -3Q0 -6 ${-r*.65} 1Q0 -1 ${r*.65} 4"/></g></g>`;
  }
  function face({x=47,y=65,gap=29,dy=-2,r=9.3,h=12.3,left='open',right='open',rotation=-7,mx,my,mouth='smile',brows=[],cheeks=false,cheek='#FF969D'}={}) {
    mx ??= x+gap/2; my ??= y+19;
    let m;
    if(mouth==='o') m=ellipse(0,1,3.5,4.8,faceInk(ink));
    else if(mouth==='w') m=line('M-4.5-1Q-3 4 0 1Q3 5 5 0');
    else if(mouth==='smirk') m=line('M-5 1Q1 4 6-2M5-2L7-1');
    else if(mouth==='laugh'||mouth==='tooth') m=path('M-9-4Q0 0 9-5Q10 10 1 11Q-7 10-9-4Z',faceInk(ink))+(mouth==='tooth'?path('M-3-2L4-2L3 3L-2 3Z',faceFill('#FFF')):path('M-5 7Q0 1 6 7Q2 12-1 10Z',faceAccent('#FF8798')));
    else m=line('M-4-1Q0 5 5-1');
    return group('obx-face',
      (cheeks?ellipse(x-10,y+12,4.8,2.8,cheekFill(cheek))+ellipse(x+gap+9,y+dy+13,4.8,2.8,cheekFill(cheek)):'')+
      eye(x,y,'left',left,r,h,rotation)+eye(x+gap,y+dy,'right',right,r,h,rotation)+
      brows.map(d=>line(d,'obx-brow')).join('')+
      `<g transform="translate(${mx} ${my})"><g class="obx-mouth-idle">${m}</g><g class="obx-mouth-done">${path('M-6-2Q0 1 6-3Q7 7 1 8Q-5 7-6-2Z',faceInk(ink))}${path('M-3 5Q0 2 4 5Q1 8-1 7Z',faceAccent('#FF8798'))}</g>${line('M-2 1Q0 3 2 1','obx-mouth-rest')}${line('M-3.5 1H3.5','obx-mouth-flat')}${line('M-4 2Q0-3 4 2','obx-mouth-worry')}<ellipse class="obx-line obx-mouth-await" cy="1" rx="2.2" ry="2.7"/></g>`);
  }
  function drawing(id) {
    switch(id) {
      case 'strawberry': return bodyPath('M62 27C42 18 16 28 13 51C9 77 35 105 58 117Q64 121 71 117C95 104 119 79 116 53C114 30 86 20 62 27Z','#F5354A')+
        group('obx-leaf',detailPath('M62 31C48 34 36 24 39 16Q52 13 60 23C58 11 66 6 74 5Q85 14 77 27C89 18 101 22 104 28Q95 39 78 34Q73 45 68 39Z','#73C98D'))+
        [[28,40,-30],[20,65,-10],[101,52,-20],[99,83,25],[65,108,15]].map(([x,y,rot])=>`<ellipse cx="${x}" cy="${y}" rx="2.1" ry="3.5" fill="#FFF1C4" transform="rotate(${rot} ${x} ${y})"/>`).join('')+
        face({x:46,y:62,gap:28,dy:4,r:11,h:14.2,rotation:9,my:82,mouth:'w',cheeks:true,brows:['M43 43Q47 44 50 40','M83 49L86 53']});
      case 'peach': return group('obx-leaf',detailPath('M67 30C62 12 82 11 109 9C104 30 87 37 68 32Z','#62AA50')+detailPath('M69 28Q84 18 99 16Q81 24 69 32Z','#387E3E')+detailPath('M67 34Q60 25 61 21Q65 16 70 32Z','#85543F'))+
        bodyPath('M65 33C45 19 15 35 13 62C9 86 30 110 49 112Q60 115 66 109C84 118 113 100 116 77C122 48 97 24 75 33Q69 35 65 33Z','#FF8277')+
        shadowPath('M68 35Q89 57 73 71Q81 53 68 35ZM75 79Q75 100 61 111Q70 102 75 79Z','#F56D66')+
        face({x:45,y:65,gap:38,dy:3,r:10.8,h:14.4,right:'wink',rotation:5,mx:63,my:83,cheeks:true,cheek:'#F86E67',brows:['M40 46Q43 42 48 42','M88 53L92 57']});
      case 'banana': return bodyPath('M56 12C61 14 67 15 70 17C59 36 61 61 76 73C86 82 103 85 115 82C117 95 106 108 87 114C66 122 39 113 26 96C9 73 16 48 33 31Q49 19 51 11Z','#FFD324')+
        shadowPath('M51 14C51 32 22 42 24 71C23 99 54 117 81 113C55 122 26 107 20 85C11 61 25 35 40 24Q48 17 49 12Z','#FFB914')+
        detailPath('M50 10Q57 5 66 11Q74 15 70 19Q59 20 50 14Z','#795039')+
        detailEllipse(115,86,3.8,7.2,'#795039')+
        face({x:43,y:61,gap:28,dy:-4,r:8.6,h:10.4,rotation:-17,mx:67,my:81,mouth:'smirk',brows:['M35 45Q40 40 46 40','M68 44Q71 42 75 44']})+
        group('obx-glasses',`<path d="M26 63L35 67M56 63L62 61M84 55L88 52" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>`+`<g transform="rotate(-15 57 64)">${ellipse(44,67,12.5,8.7,'#1D1E24')}${ellipse(74,63,12.5,8.7,'#1D1E24')}<path d="M47 61L50 64M77 57L80 60" stroke="#6C6D75" stroke-width="3" stroke-linecap="round"/></g>`);
      case 'lemon': return group('obx-leaf',detailPath('M85 29Q82 13 111 12Q107 30 88 30Z','#85C637')+detailPath('M84 31Q89 21 101 18L88 28Z','#4F8E32'))+
        bodyPath('M28 39C46 18 81 21 99 41Q108 54 111 69Q111 73 117 78Q122 84 111 88C98 108 76 115 53 109C31 104 22 88 16 76Q12 69 10 66Q7 55 18 53Q23 53 28 39Z','#FFE22C')+
        face({x:49,y:60,gap:31,dy:10,r:10.7,h:15.3,rotation:17,mx:63,my:90,mouth:'o',brows:['M43 40Q47 37 53 37','M85 48Q89 49 92 52']});
      case 'pear': return group('obx-leaf',detailPath('M62 24C44 21 34 15 36 6C53 2 65 14 65 24Z','#438C34')+detailPath('M40 9Q55 13 63 21L56 13Z','#7BAA37')+detailPath('M65 26Q69 17 64 10Q65 5 69 8Q74 20 71 27Z','#285636'))+
        bodyPath('M64 23C81 19 85 37 92 52C99 67 116 79 114 98C112 118 94 121 70 116C51 119 24 123 16 107C4 88 23 72 32 60Q44 43 46 32Q49 23 64 23Z','#B8DD39')+
        shadowPath('M52 27Q47 47 39 62C16 88 20 107 40 117Q24 118 16 107C5 89 23 73 32 60Q44 43 46 32Z','#8FBE2D')+
        face({x:53,y:68,gap:29,dy:6,r:10,h:14.2,rotation:-7,mx:71,my:91,mouth:'smirk',brows:['M51 49Q56 47 58 43','M83 54Q87 51 91 54']});
      case 'watermelon': return detailPath('M17 86Q39 101 66 100Q94 99 111 81L118 92C116 111 84 121 60 118C33 117 10 105 11 95Z','#099A5F')+
        detailPath('M16 83Q39 99 65 98Q94 97 110 78L115 88C98 113 45 116 13 94Z','#97D890')+
        bodyPath('M17 82L49 31Q59 15 70 26L108 68Q116 76 111 85C98 103 43 112 17 90Q12 87 17 82Z','#FF535C')+
        [[99,71,-35],[102,82,-20],[94,87,-25]].map(([x,y,a])=>`<ellipse cx="${x}" cy="${y}" rx="2.2" ry="3.8" fill="#3A3832" transform="rotate(${a} ${x} ${y})"/>`).join('')+
        face({x:49,y:62,gap:30,dy:-6,r:10,h:13,rotation:-18,mx:67,my:81,mouth:'laugh',cheeks:true,brows:['M38 45Q41 40 47 39','M71 37Q77 37 80 41']});
      case 'pineapple': return group('obx-crown',detailPath('M50 48C39 35 29 27 25 17Q39 13 54 28C52 14 58 5 65 4Q81 15 78 32Q93 20 109 23Q106 34 89 50Z','#24A980')+detailPath('M59 48Q51 28 37 26Q44 35 50 49ZM67 45Q64 20 61 18Q56 30 62 46ZM79 47Q90 31 99 30Q90 41 89 48Z','#147B5B'))+
        bodyPath('M42 46C63 38 91 42 100 57C110 72 115 97 105 110Q94 119 65 118C42 119 25 115 24 101C22 78 26 53 42 46Z','#FFB911')+
        `<path d="M32 63L37 58M30 84L35 79M95 85L100 80M95 101L102 94" fill="none" stroke="#E89410" stroke-width="4" stroke-linecap="round"/>`+
        face({x:48,y:75,gap:28,dy:3,r:8.9,h:12.2,rotation:8,mx:62,my:94,mouth:'smirk',brows:['M43 56L51 61','M74 62Q79 59 84 61']});
      case 'blueberry': return group('obx-tuft',detailPath('M46 31Q35 19 44 15Q50 16 52 19Q55 5 62 9Q66 12 66 18Q75 8 80 15Q81 20 73 28Z','#27247B'))+
        bodyPath('M66 25C93 24 114 51 116 79C118 106 94 118 63 118C33 119 12 105 12 80C12 53 35 25 66 25Z','#414DC8')+
        face({x:49,y:69,gap:35,dy:-5,r:13.8,h:16,left:'sleepy',right:'sleepy',rotation:-12,mx:69,my:91,cheeks:true,cheek:'#A38AF7',brows:['M44 50Q47 46 52 46','M88 41Q92 39 97 41']});
      case 'eggplant': return group('obx-tuft',detailPath('M57 29Q53 16 45 14Q41 8 48 7Q59 11 66 25Z','#42B96A'))+
        bodyPath('M51 24C72 16 81 34 87 50C95 65 110 83 107 101C103 118 85 124 63 119C41 117 32 105 35 88C39 66 33 36 51 24Z','#7827A4')+
        shadowPath('M48 29C41 50 52 66 46 86C40 104 49 113 58 119Q30 115 35 88Q41 58 40 43Z','#963CB8')+
        group('obx-leaf',detailPath('M46 23Q62 15 76 25L87 29Q90 34 80 33Q81 46 71 42L61 35Q57 48 51 39Q44 47 39 41Q43 31 46 23Z','#42B96A'))+
        face({x:57,y:65,gap:26,dy:-6,r:9.9,h:12.3,left:'sleepy',right:'sleepy',rotation:-13,mx:71,my:85,mouth:'smirk',brows:['M51 49Q54 46 59 46','M78 40Q83 36 87 41']});
      case 'chili': return group('obx-tuft',detailPath('M71 34Q67 19 55 16Q48 17 48 11Q49 5 56 9Q71 10 78 30Z','#357F2B')+detailPath('M72 31Q85 25 93 32L102 40Q103 45 96 43L87 40Q80 49 75 42Q67 49 61 43Z','#389343'))+
        bodyPath('M76 34C92 30 108 44 109 65C109 92 89 113 60 119C40 122 20 116 18 103Q17 91 25 93Q41 109 57 94C72 79 61 64 62 49Q63 38 76 34Z','#F4243E')+
        shadowPath('M103 46C119 75 96 110 65 118Q36 126 22 112Q45 122 75 104Q104 86 103 46Z','#D70C2E')+
        face({x:76,y:65,gap:19,dy:-4,r:7.5,h:11.3,rotation:7,mx:86,my:81,mouth:'laugh',brows:['M69 49Q75 47 79 51','M90 44L98 40']});
      case 'carrot': return group('obx-crown',detailPath('M53 39C43 25 28 27 24 19Q22 8 33 11Q50 13 55 27C47 12 48 5 57 5C73 3 82 22 73 34C85 19 100 17 105 26Q110 36 78 42Z','#68BC32')+`<path d="M35 18Q51 25 57 39M60 14Q69 26 66 40M94 28Q80 34 74 41" fill="none" stroke="#38972B" stroke-width="3.3" stroke-linecap="round"/>`)+
        bodyPath('M62 37C87 33 108 51 104 73C100 90 83 114 72 120Q67 124 61 119C44 104 24 76 27 60C29 44 45 39 62 37Z','#FF861C')+
        `<path d="M30 75L38 77M33 82L42 84M84 99L91 101M81 105L85 106" fill="none" stroke="#E96B13" stroke-width="3.3" stroke-linecap="round"/>`+
        face({x:48,y:61,gap:28,dy:4,r:10,h:12,rotation:17,mx:63,my:83,mouth:'laugh',cheeks:true,brows:['M44 46Q48 43 53 45','M80 51Q84 52 86 56']});
      case 'mushroom': return group('obx-peeker',path('M47 64Q63 58 80 67L90 99Q95 117 72 120Q45 124 37 113Q31 105 39 84Z','#FAEBD3')+
        face({x:50,y:91,gap:25,dy:0,r:7.8,h:10,rotation:-7,mx:63,my:106,cheeks:true,brows:['M45 77Q47 74 51 74','M72 74L77 76']}))+
        group('obx-cap',bodyPath('M10 75C17 48 39 17 63 16C88 13 111 42 119 68Q125 85 115 89Q96 93 76 82Q56 78 34 89Q8 97 10 75Z','#F22D42')+
        shadowPath('M17 85Q50 65 76 80Q98 91 115 86Q93 99 75 85Q51 80 31 91Q19 94 17 85Z','#BF1830')+
        ellipse(63,34,16,15,'#FFF5E4')+`<ellipse cx="25" cy="62" rx="10" ry="15" fill="#FFF5E4" transform="rotate(30 25 62)"/><ellipse cx="103" cy="65" rx="10" ry="14" fill="#FFF5E4" transform="rotate(-32 103 65)"/>`);
      case 'peas': return group('obx-tuft',detailPath('M110 44Q105 31 111 29Q119 33 116 47Z','#54A637'))+
        bodyPath('M9 84Q17 63 42 59Q62 57 82 44Q97 37 115 44C125 64 108 88 86 95L35 111Q14 113 7 99Q5 92 9 84Z','#53A536')+
        shadowPath('M12 85Q30 61 55 61Q79 42 113 47Q108 74 83 87L32 105Q13 106 12 85Z','#267D32')+
        group('obx-pea-left',bodyEllipse(34,85,17,17,'#AADC42')+detailEllipse(39,77,5,3.8,'#C4ED6A'))+
        group('obx-pea-right',bodyEllipse(96,61,15,17,'#AADC42')+detailEllipse(101,54,4.7,3.8,'#C4ED6A'))+
        group('obx-pea-center',bodyEllipse(66,74,18,18,'#AADC42')+face({x:59,y:73,gap:17,dy:-7,r:5.2,h:6.9,left:'wink',rotation:-14,mx:69,my:85,mouth:'smile',brows:['M55 62L58 60','M73 59Q75 57 77 59']}))+
        `<path d="M9 90Q14 63 47 59Q73 54 83 45Q96 38 115 45M9 92Q29 101 58 96Q93 87 111 65" fill="none" stroke="#B9E663" stroke-width="2.5" stroke-linecap="round"/>`;
      case 'broccoli': return detailPath('M43 66Q56 82 48 106Q43 118 66 120Q90 118 82 106Q73 83 91 64Z','#ADDC59')+
        `<path d="M45 75Q56 88 55 102M78 76Q69 87 73 104M64 77L65 108" fill="none" stroke="#83B63D" stroke-width="3" stroke-linecap="round"/>`+
        group('obx-crown',bodyPath('M40 32C44 8 82 7 89 31C111 24 125 49 111 64C126 83 107 102 90 94Q80 100 68 93Q52 101 39 92C17 104 1 79 17 63C1 43 20 21 40 32Z','#15985B')+
        face({x:50,y:61,gap:27,dy:-2,r:10.2,h:13,rotation:-12,mx:66,my:81,mouth:'smirk',brows:['M41 45Q49 44 53 38','M77 42Q81 39 86 42']}));
      case 'garlic': return group('obx-tuft',detailPath('M61 31Q58 20 52 17Q45 17 49 13Q53 11 59 17C55 7 63 3 67 8L70 20Q78 10 79 18L72 34Z','#D1B1E8'))+
        `<path class="obx-body-fill" d="M63 27C63 45 39 47 21 65C2 83 5 108 25 114Q36 119 46 112Q65 124 84 113C108 123 125 104 117 83C109 59 81 55 73 30Q69 21 63 27Z" fill="${bodyFill('#F7F0DF')}" stroke="#D3B9E7" stroke-width="1.5"/>`+
        `<path d="M64 39Q40 61 34 87Q28 105 44 114M72 37Q69 57 83 73Q98 94 85 112" fill="none" stroke="#D3B9E7" stroke-width="1.45" stroke-linecap="round"/>`+
        face({x:51,y:79,gap:34,dy:3,r:10.5,h:12.3,rotation:-9,mx:69,my:99,mouth:'smirk',cheeks:true,brows:['M45 62Q51 57 58 61','M81 68L90 64']});
      case 'pumpkin': return group('obx-tuft',detailPath('M58 34Q64 17 73 13Q84 5 90 12Q95 22 87 23Q82 22 85 17Q73 11 70 34Z','#27977E'))+
        bodyEllipse(31,76,23,34,'#FF951C')+bodyEllipse(98,79,24,32,'#FF951C')+
        bodyPath('M48 42Q57 33 68 38Q80 34 88 49C101 69 104 102 86 115Q67 125 49 113C30 98 29 61 48 42Z','#F18413')+
        shadowPath('M54 40Q66 34 76 42C91 56 98 88 87 108Q75 123 57 115C37 102 36 64 47 48Z','#FF951C')+
        face({x:53,y:72,gap:27,dy:4,r:11,h:14.5,rotation:7,mx:67,my:95,mouth:'tooth',brows:['M45 53Q48 49 54 50','M82 57Q87 58 89 63']});
      case 'cloud': return bodyPath('M18 67C6 50 24 31 43 39C51 14 84 16 94 34Q106 48 96 62C121 63 126 88 107 100Q93 110 78 100C66 116 45 114 36 102C16 111 1 99 8 82Q11 72 18 67Z','#91C1FF')+
        face({x:48,y:68,gap:31,dy:7,r:10,h:12,right:'wink',rotation:5,mx:65,my:88,cheeks:true,cheek:'#FFC3A8',brows:['M43 50Q46 48 51 50','M84 61L90 64']});
      case 'bolt': return bodyPath('M39 18Q41 12 49 12L95 8Q107 8 103 21L78 58L98 58Q111 59 103 71L59 119Q51 126 47 117L60 80H36Q25 80 28 69Z','#1462FF')+
        face({x:53,y:55,gap:23,dy:3,r:8.8,h:11.5,rotation:13,mx:66,my:74,mouth:'smirk',brows:['M48 38L56 43','M76 44L82 42']});
      case 'jelly': return bodyPath('M18 72C22 38 39 23 65 23C92 23 110 45 113 74L119 100Q122 118 104 120Q89 122 81 114Q67 127 50 115C37 126 9 123 10 107Z','#42DEBE')+
        face({x:48,y:65,gap:34,dy:-8,r:12.7,h:16,rotation:-11,mx:69,my:91,mouth:'o',cheeks:true,brows:['M37 43Q42 39 48 40','M80 35Q85 34 91 39']})+
        group('obx-idle-detail',ellipse(68,95,2.9,3.1,'#FF768A'));
      case 'ink': return `<path class="obx-body-fill" d="M59 16Q65 10 73 16C93 31 114 54 119 72C125 95 93 119 67 121C44 122 10 107 9 84C8 63 39 29 59 16Z" fill="${bodyFill('#292B31')}" stroke="#8392BA" stroke-width="1.4"/>`+
        face({x:46,y:70,gap:37,dy:-6,r:15,h:17,left:'sleepy',right:'sleepy',rotation:-8,mx:66,my:99,mouth:'smirk',brows:['M39 52Q46 48 54 49','M82 42L93 38']})+
        ellipse(95,96,2.7,2.7,'#429AFF');
      default: throw new Error('Unknown character: '+id);
    }
  }
  function escape(value) { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
  function svg(id='strawberry',options={}) {
    const i=characters.findIndex(c=>c.id===id), c=characters[Math.max(0,i)];
    const state=states.find(s=>s.id===options.state)||states[0];
    const motion=['paused','off'].includes(options.motion)?options.motion:'auto';
    const size=Number.isFinite(options.size)?Math.max(12,Math.min(2048,Math.round(options.size))):128;
    const phase=Number.isFinite(options.phase)?Math.max(-60,Math.min(0,options.phase)):-Math.max(0,i)*.43;
    const label=escape(options.label||`${c.name} · ${state.label}`);
    return `<svg xmlns="http://www.w3.org/2000/svg" class="obx-avatar" data-character="${c.id}" data-state="${state.id}" data-motion="${motion}" viewBox="0 0 128 128" width="${size}" height="${size}" role="img" aria-label="${label}" style="--obx-phase:${phase}s"><title>${label}</title>${options.withStyle === false ? '' : `<style>${css}</style>`}<g class="obx-body">${drawing(c.id)}</g><path class="obx-spark" d="M109 17L112 11M116 24L121 22" fill="none" stroke="#E5A631" stroke-width="3" stroke-linecap="round"/></svg>`;
  }
  function setState(element,state) {
    if(!element?.matches('svg.obx-avatar')) return false;
    const s=states.find(s=>s.id===state), c=characters.find(c=>c.id===element.dataset.character);
    if(!s||!c) return false;
    const label=`${c.name} · ${s.label}`;
    if(element.dataset.state!==state) element.dataset.state=state;
    if(element.getAttribute('aria-label')!==label) element.setAttribute('aria-label',label);
    const title=element.querySelector('title'); if(title&&title.textContent!==label) title.textContent=label;
    return true;
  }
  return Object.freeze({characters:Object.freeze(characters.map(Object.freeze)),states:Object.freeze(states.map(Object.freeze)),css,svg,setState});
});
