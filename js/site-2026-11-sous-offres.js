/* ACOMPIA · sous-pages d'offres : apparition douce et animation du projet de réponse. */
(function(){
  var d=document,reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rv=d.querySelectorAll('.so .rv');
  if('IntersectionObserver' in window&&!reduce){
    var io=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
    rv.forEach(function(el){io.observe(el)});
    setTimeout(function(){rv.forEach(function(el){if(el.getBoundingClientRect().top<innerHeight)el.classList.add('in')})},1200);
  }else{rv.forEach(function(el){el.classList.add('in')})}
  var el=d.getElementById('of2-anim');
  if(el&&!reduce&&'IntersectionObserver' in window){
    el.classList.add('arm');
    var io2=new IntersectionObserver(function(en){if(en[0].isIntersecting){io2.disconnect();el.classList.add('play')}},{threshold:.4});
    io2.observe(el);
    setTimeout(function(){var r=el.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)el.classList.add('play')},1500);
  }
})();
