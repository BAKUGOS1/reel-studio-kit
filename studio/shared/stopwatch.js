// The story reels' ticking device: a small drawn stopwatch in the top-right corner, in the illustrations' style.
// The red wedge is the time left; the hand jumps once a second. Pressing the crown stops it.
// Case #3 hangs a caterer's paper chit with the plate count under it. Pure function of the state passed in.
(function(){
const INKD='#1A1512',CREAM='#FBF8F1',R='#D0213B',GREEN='#1F7A4A',GOOD='#7FD49A',BRASS='#B08A4A',NUM='"Bodoni Moda","Noto Serif"';
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v)},ease=v=>1-(1-clamp(v))**3;

// One digit reel; pos 4.5 is halfway from 4 to 5.
function reel(x,pos,cx,base,cw,ch,color){const k=Math.floor(pos),f=pos-k;x.save();x.beginPath();x.rect(cx-cw/2,base-ch*.86,cw,ch*1.02);x.clip();x.fillStyle=color;x.textAlign='center';
 for(const [d,off] of [[k,-f*ch],[k+1,(1-f)*ch]]){if(Math.abs(off)>=ch)continue;x.globalAlpha=1-Math.abs(off)/ch*.85;x.fillText(String(((d%10)+10)%10),cx,base+off)}x.restore()}
function odometer(x,D,places,cx0,base,cw,ch,color){for(let p=0;p<places;p++){const s=10**p,carry=p?clamp(D%s-(s-1)):0,pos=p?Math.floor(D/s)+carry:D%10;reel(x,pos,cx0+(places-1-p)*cw,base,cw,ch,color)}}

// s: {t,left,total,stopped,stopAge,label,stopLabel,cx,cy,r, chit?:{plates,cook,unknown,overAge}}
function draw(x,s){const {cx=912,cy=300,r=62}=s;
 const k=s.stopped?Math.ceil(s.left):Math.ceil(s.left),since=s.stopped?9:k-s.left,danger=!s.stopped&&s.left<5;
 // The hand lands on each second with a small bounce.
 const shown=s.stopped?s.left:k-.12*Math.sin(Math.min(since,.35)*Math.PI*6)*Math.exp(-since*12);
 const frac=clamp(shown/s.total),beat=danger?Math.exp(-since*8):0,press=s.stopped?Math.sin(Math.PI*clamp(s.stopAge/.18)):0;
 x.save();
 if(danger){x.translate(Math.sin(s.t*80)*3*beat,Math.cos(s.t*70)*2*beat)}
 const sc=1+.05*beat+(s.stopped?.06*Math.exp(-s.stopAge*8)*Math.sin(s.stopAge*28):0);x.translate(cx,cy);x.scale(sc,sc);
 // Red glow on each of the last five seconds.
 if(beat>.02){const g=x.createRadialGradient(0,0,r*.6,0,0,r*2.1);g.addColorStop(0,`rgba(208,33,59,${.45*beat})`);g.addColorStop(1,'rgba(208,33,59,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,r*2.1,0,7);x.fill()}
 // Crown and side buttons.
 x.fillStyle=INKD;x.strokeStyle=BRASS;x.lineWidth=2;
 const stem=(ang,len,w,dy=0)=>{x.save();x.rotate(ang);x.fillRect(-w*.32,-r-len+dy,w*.64,len);x.beginPath();x.roundRect(-w/2,-r-len-12+dy,w,14,4);x.fill();x.stroke();x.restore()};
 stem(0,20,30,press*7);stem(-.72,12,18);stem(.72,12,18);
 // Case, bezel and face.
 x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=22;x.shadowOffsetY=8;x.beginPath();x.arc(0,0,r+9,0,7);x.fillStyle=INKD;x.fill();x.shadowColor='transparent';
 x.beginPath();x.arc(0,0,r+5,0,7);x.strokeStyle=BRASS;x.lineWidth=2.5;x.stroke();
 const face=x.createRadialGradient(-r*.3,-r*.35,r*.1,0,0,r);face.addColorStop(0,CREAM);face.addColorStop(1,'#E6DDCB');x.beginPath();x.arc(0,0,r,0,7);x.fillStyle=face;x.fill();
 // Time left.
 const a0=-Math.PI/2,a1=a0+frac*Math.PI*2;if(frac>0){x.beginPath();x.moveTo(0,0);x.arc(0,0,r*.9,a0,a1);x.closePath();x.fillStyle=s.stopped?'rgba(31,122,74,.78)':`rgba(208,33,59,${.78+.2*beat})`;x.fill()}
 // Ticks: one per second of the dial, longer every five.
 const n=Math.round(s.total);for(let i=0;i<n;i++){const a=a0+i/n*Math.PI*2,major=i%5===0;x.save();x.rotate(a+Math.PI/2);x.fillStyle=`rgba(26,21,18,${major?.9:.45})`;x.fillRect(-(major?1.6:1),-r+3,major?3.2:2,major?10:5);x.restore()}
 // Hand.
 x.save();x.rotate(a1+Math.PI/2);x.strokeStyle=INKD;x.lineWidth=3;x.lineCap='round';x.beginPath();x.moveTo(0,r*.18);x.lineTo(0,-r*.86);x.stroke();x.restore();
 // Hub with the whole seconds.
 x.beginPath();x.arc(0,0,r*.46,0,7);x.fillStyle=CREAM;x.fill();x.strokeStyle='rgba(26,21,18,.25)';x.lineWidth=1.5;x.stroke();
 x.font=`700 ${Math.round(r*.62)}px ${NUM}`;x.textAlign='center';x.textBaseline='middle';x.fillStyle=s.stopped?GREEN:(danger?R:INKD);x.fillText(String(Math.max(0,k)),0,r*.04);
 x.restore();

 // Label under the watch.
 x.save();x.font='700 19px "Outfit"';x.letterSpacing='4px';x.textAlign='center';x.textBaseline='middle';x.shadowColor='rgba(0,0,0,.85)';x.shadowBlur=10;
 x.fillStyle=s.stopped?GOOD:'rgba(246,245,242,.95)';x.fillText(s.stopped?s.stopLabel:s.label,cx,cy+r+32);x.restore();
 if(s.chit)chit(x,s,cx,cy+r+52);
}

// The caterer's chit: the plate count against what is being cooked, in pen.
function chit(x,s,cx,top){const c=s.chit,w=196,h=104,over=c.plates>c.cook+.5,safe=s.stopped&&s.stopAge>.9,diff=Math.round(c.plates)-c.cook;
 const jit=over&&!s.stopped?Math.exp(-(c.overAge||0)*5)*Math.sin(s.t*70)*5:0;
 x.save();x.translate(cx+jit,top);x.rotate(-.035);x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=18;x.shadowOffsetY=6;x.beginPath();x.roundRect(-w/2,0,w,h,6);x.fillStyle=CREAM;x.fill();x.shadowColor='transparent';
 x.fillStyle='rgba(31,46,110,.18)';x.fillRect(-w/2+10,h-30,w-20,1.5);
 x.font='700 12px "Outfit"';x.letterSpacing='1.5px';x.fillStyle='rgba(26,21,18,.62)';x.textAlign='left';x.fillText(`PLATES · ${c.cook} COOKING`,-w/2+12,22);x.letterSpacing='0px';
 x.font=`700 54px ${NUM}`;const col=safe?INKD:(over?R:INKD),base=74,cw=30,x0=-w/2+26;
 if(c.unknown&&!s.stopped){reel(x,Math.floor(c.plates/100),x0,base,cw,58,INKD);reel(x,8+s.t*7.3,x0+cw,base,cw,58,R);reel(x,s.t*23.1,x0+cw*2,base,cw,58,R)}else odometer(x,c.plates,3,x0,base,cw,58,col);
 x.font='700 23px "Kalam"';x.textAlign='left';const nx=x0+cw*2+22,note=(a,b,color)=>{x.fillStyle=color;x.fillText(a,nx,base-24);x.fillText(b,nx,base+2)};
 if(c.unknown&&!s.stopped)note('how','many?',R);
 else if(!s.stopped&&diff>0)note(String(diff),'short!',R);
 else if(safe){x.globalAlpha=ease((s.stopAge-.9)/.3);note(String(-diff),'to spare',GREEN)}
 x.restore()}

window.ReelStopwatch={draw};
})();
