'use strict';
chrome.storage.local.get(['payload'], function(result){
  console.log(result.payload);
  document.getElementById("create-screenshot").innerHTML = result.payload;
  html2canvas(document.getElementById("create-screenshot")).then(function(canvas) {
    document.getElementById("screenshot-img").src = canvas.toDataURL();
    //document.getElementById("create-screenshot").style.display = "none";
  });
})

