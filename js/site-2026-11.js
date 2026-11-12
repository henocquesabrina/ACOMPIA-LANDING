/* ACOMPIA · accueil, novembre 2026 (généré par tools/integrer-site-2026-11.py) */
(function(){
  var d=document,reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function homography(w,h,pts){
    var x0=pts[0][0],y0=pts[0][1],x1=pts[1][0],y1=pts[1][1],x2=pts[2][0],y2=pts[2][1],x3=pts[3][0],y3=pts[3][1];
    var dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
    var g=(dx3*dy2-dx2*dy3)/den,hh=(dx1*dy3-dx3*dy1)/den;
    var a=x1-x0+g*x1,b=x3-x0+hh*x3,c=x0,dd=y1-y0+g*y1,e=y3-y0+hh*y3,f=y0;
    a/=w;b/=h;dd/=w;e/=h;g/=w;hh/=h;
    return 'matrix3d('+[a,dd,0,g,b,e,0,hh,0,0,1,0,c,f,0,1].map(function(v){return v.toFixed(6)}).join(',')+')';
  }
  function fit(){
    d.querySelectorAll('.scene').forEach(function(sc){
      var W=sc.clientWidth,H=sc.clientHeight;if(!W||!H)return;
      var q=sc.dataset.quad.trim().split(/\s+/).map(function(p){var a=p.split(',');return [parseFloat(a[0])*W,parseFloat(a[1])*H]});
      sc.querySelector('.layer').style.transform=homography(W,H,q);
      var m=sc.querySelector('.logo-mask');
      if(m){m.style.left=(0.474*W)+'px';m.style.top=(0.583*H)+'px';m.style.width=(0.038*W)+'px';m.style.height=(0.056*H)+'px'}
      sc.classList.add('is-fit');
    });
    camGo(camIdx,true);
  }

  /* apparition au défilement, une fois */
  var rv=d.querySelectorAll('.rv');
  if('IntersectionObserver' in window&&!reduce){
    var ioR=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');ioR.unobserve(e.target)}})},{threshold:.18});
    rv.forEach(function(el){ioR.observe(el)});
    setTimeout(function(){rv.forEach(function(el){var r=el.getBoundingClientRect();if(r.top<innerHeight)el.classList.add('in')})},1200);
  }else{rv.forEach(function(el){el.classList.add('in')})}
  d.querySelectorAll('[data-replay]').forEach(function(el){
    el.addEventListener('mouseenter',function(){if(reduce)return;el.classList.remove('replay');void el.offsetWidth;el.classList.add('replay')});
  });

  /* barre du haut */
  var nav=d.getElementById('nav');
  function onScroll(){nav.classList.toggle('is-stuck',window.scrollY>8)}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();

  /* pilotage : caméra sur la capture */
  var cam=d.getElementById('cam'),tabs=cam?cam.querySelectorAll('.tab'):[],frame=cam&&cam.querySelector('.cam-frame'),cimg=frame&&frame.querySelector('img'),camIdx=0,camTimer=null,camAuto=false;
  function camGo(i,silent){
    if(!frame)return;camIdx=i;
    var r=tabs[i].dataset.r.split(',').map(Number),FW=frame.clientWidth,FH=frame.clientHeight,pad=FW*0.04;
    var s=Math.min((FW-2*pad)/r[2],(FH-2*pad)/r[3]);
    var tx=-r[0]*s+(FW-r[2]*s)/2,ty=-r[1]*s+(FH-r[3]*s)/2;
    cimg.style.transform='translate('+tx.toFixed(1)+'px,'+ty.toFixed(1)+'px) scale('+s.toFixed(4)+')';
    if(!silent)tabs.forEach(function(t,k){t.setAttribute('aria-selected',k===i?'true':'false');t.classList.remove('run')});
  }
  function camStop(){camAuto=false;clearTimeout(camTimer);tabs.forEach(function(t){t.classList.remove('run')})}
  function camNext(){
    if(!camAuto)return;tabs[camIdx].classList.add('run');
    camTimer=setTimeout(function(){var n=camIdx+1;if(n>=tabs.length){camStop();camGo(0);return}camGo(n);camNext()},3200);
  }
  tabs.forEach(function(t,i){
    t.addEventListener('click',function(){camStop();camGo(i)});
    t.addEventListener('keydown',function(e){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();camStop();var n=(i+(e.key==='ArrowDown'?1:tabs.length-1))%tabs.length;camGo(n);tabs[n].focus()}});
  });
  if(cam&&'IntersectionObserver' in window&&!reduce){
    var ioC=new IntersectionObserver(function(en){if(en[0].isIntersecting){ioC.disconnect();camAuto=true;camNext()}},{threshold:.5});
    ioC.observe(cam);
  }
  window.addEventListener('resize',fit);window.addEventListener('load',fit);fit();

  /* les quatre temps : lecture une fois, puis au clic */
  var how=d.getElementById('how'),svg=d.getElementById('anim');
  if(how&&svg&&!reduce&&'IntersectionObserver' in window){
    d.documentElement.classList.add('js-anim');
    svg.setAttribute('class','');
    var steps=how.querySelectorAll('.steps li'),timers=[];
    function setTo(n){var c='';for(var k=1;k<=n;k++)c+=' t'+k;svg.setAttribute('class',c.trim());steps.forEach(function(li){li.classList.toggle('on',+li.dataset.s===n)})}
    function play(){timers.forEach(clearTimeout);timers=[];setTo(1);timers.push(setTimeout(function(){setTo(2)},1900),setTimeout(function(){setTo(3)},4300),setTimeout(function(){setTo(4)},6100))}
    var io=new IntersectionObserver(function(en){if(!en[0].isIntersecting)return;io.disconnect();play()},{threshold:.35});
    io.observe(how);
    steps.forEach(function(li){
      function act(){timers.forEach(clearTimeout);timers=[];var n=+li.dataset.s;if(n===1){svg.setAttribute('class','');void svg.getBoundingClientRect()}setTo(n)}
      li.addEventListener('click',act);li.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();act()}});
    });
  }

  /* IA : questions cliquables, réponse qui s'écrit */
  var A=[
    {t:"<b>1&nbsp;554,59&nbsp;€ pour septembre.</b> À temps partiel, le SMIC se calcule sur les 28&nbsp;h du contrat. Les 8&nbsp;heures complémentaires s'ajoutent ensuite, une seule fois, sans majoration.",s:["Contrat, durée de 28&nbsp;h","Relevé d'heures de septembre","Code de la sécurité sociale, art. D.&nbsp;241-7"]},
    {t:"<b>Oui, pour avril.</b> La demande de dispense signée le 25 mars mentionne le mois d'avril. Aucun justificatif ne couvre le mois de mai dans les pièces consultées.",s:["Bulletin d'avril","Demande signée, page 1","Bulletin de mai"]},
    {t:"<b>Deux pièces manquent.</b> Les relevés kilométriques des techniciens et la note d'interdiction d'usage privé des véhicules n'ont pas été déposés.",s:["Écran Documents","Frais","Parc et usage des véhicules"]}
  ];
  var qs=d.querySelectorAll('.q'),ansT=d.getElementById('ans-txt'),srcs=d.getElementById('srcs'),typ=null;
  function showA(i){
    clearInterval(typ);var a=A[i];
    qs.forEach(function(q,k){q.setAttribute('aria-pressed',k===i?'true':'false')});
    srcs.classList.remove('show');srcs.innerHTML=a.s.map(function(x){return '<span>'+x+'</span>'}).join('');
    if(reduce){ansT.innerHTML=a.t;srcs.classList.add('show');return}
    var plain=a.t,n=0,len=plain.length;
    typ=setInterval(function(){
      n+=2;if(plain.charAt(n-1)==='<'||plain.slice(0,n).lastIndexOf('<')>plain.slice(0,n).lastIndexOf('>')){n=plain.indexOf('>',n)+1}
      if(n>=len){clearInterval(typ);ansT.innerHTML=a.t;srcs.classList.add('show');return}
      ansT.innerHTML=plain.slice(0,n)+'<i class="caret"></i>';
    },16);
  }
  /* tant que le visiteur n'a rien touché, les questions tournent seules : on voit que le bloc est vivant */
  var chat=d.getElementById('chat'),qAuto=null,qIdx=0,Q_D=6500;
  function qStop(){clearTimeout(qAuto);qAuto=null;if(chat)chat.classList.remove('is-auto')}
  function qNext(){qAuto=setTimeout(function(){qIdx=(qIdx+1)%A.length;showA(qIdx);qNext()},Q_D)}
  qs.forEach(function(q,i){q.addEventListener('click',function(){qStop();showA(i);cap('question_ia',{rang:i+1})})});
  if(chat&&qs.length&&!reduce&&'IntersectionObserver' in window){
    chat.style.setProperty('--q-d',Q_D+'ms');
    var ioQ=new IntersectionObserver(function(en){
      if(en[0].isIntersecting){if(!qAuto&&chat.classList.contains('is-auto')===false&&!chat.dataset.touched){chat.classList.add('is-auto');showA(qIdx);qNext()}}
      else if(qAuto){clearTimeout(qAuto);qAuto=null;chat.classList.remove('is-auto')}
    },{threshold:.5});
    ioQ.observe(chat);
    ['pointerdown','focusin'].forEach(function(ev){chat.addEventListener(ev,function(){chat.dataset.touched='1';qStop();ioQ.disconnect()})});
  }

  /* bouton collant mobile */
  var sticky=d.getElementById('sticky');
  if(sticky&&'IntersectionObserver' in window){
    var vis={};
    var io2=new IntersectionObserver(function(en){en.forEach(function(e){vis[e.target.id]=e.isIntersecting});sticky.classList.toggle('show',!vis['cta-hero']&&!vis['cta-final'])});
    ['cta-hero','cta-final'].forEach(function(id){var el=d.getElementById(id);if(el){vis[id]=true;io2.observe(el)}});
  }

  /* mesure PostHog, sans donnée personnelle */
  function cap(n,p){if(window.posthog&&posthog.capture)posthog.capture(n,p)}
  /* cta_clique et scroll_atteint : émis par js/socle.js */
})();

/* Fil des trois gains : la pastille suit le bloc à l'écran. */
(function(){var d=document,ls=d.querySelectorAll('.o2-steps a');if(!ls.length||!('IntersectionObserver' in window))return;
  var io=new IntersectionObserver(function(en){en.forEach(function(e){if(!e.isIntersecting)return;
    ls.forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id)})})},{rootMargin:'-45% 0px -45% 0px'});
  ls.forEach(function(a){var el=d.getElementById(a.getAttribute('href').slice(1));if(el)io.observe(el)});
})();

/* Menu mobile : se referme au clic extérieur, à Échap et après un choix. */
(function(){var d=document,m=d.querySelector('.s26-m');if(!m)return;
  d.addEventListener('click',function(e){if(m.open&&(!m.contains(e.target)||e.target.closest('.s26-m-menu a')))m.open=false});
  d.addEventListener('keydown',function(e){if(e.key==='Escape')m.open=false});
})();
