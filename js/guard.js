// Poistka pri aktualizácii: ak nová stránka narazí na starého pomocníka offline režimu (service worker),
// ten jej môže odmietnuť nové skripty a appka ostane prázdna („Štartujem…“, bez radaru).
// Tento súbor nemá číslo verzie, takže ho starý pomocník vždy pustí zo siete. Keď appka nenaštartuje,
// počká na nového pomocníka a raz sa sama obnoví.
(function(){
  var KEY="ctl_guardReload";
  addEventListener("load",function(){
    setTimeout(function(){
      if(window.__ctlBooted)return;
      var last=0;try{last=+sessionStorage.getItem(KEY)||0}catch(e){}
      if(Date.now()-last<60000)return;
      try{sessionStorage.setItem(KEY,String(Date.now()))}catch(e){}
      try{var s=document.getElementById("status");if(s)s.textContent="Aktualizujem appku…"}catch(e){}
      var done=false,go=function(){if(done)return;done=true;location.reload()};
      var sw=navigator.serviceWorker;
      if(!sw){setTimeout(go,300);return}
      sw.addEventListener("controllerchange",go);
      sw.getRegistration().then(function(r){if(r)return r.update()}).catch(function(){});
      setTimeout(go,8000);
    },400);
  });
})();
