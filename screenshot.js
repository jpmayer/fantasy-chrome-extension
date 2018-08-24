'use strict';
chrome.storage.local.get(['payload'], function(result){
  document.getElementById("create-screenshot").innerHTML = result.payload;
  html2canvas(document.getElementById("create-screenshot"), {width: "fit-content", allowTaint: true,
    onrendered: function(canvas){
      console.log("rendered");
      document.getElementById("screenshot-img").src = canvas.toDataURL();
  }}).then(function(canvas) {
    console.log("tainted");
    document.getElementById("screenshot-img").src = canvas.toDataURL();
    //Comment the below line to retain the original table
    document.getElementById("create-screenshot").style.display = "none";
  });;
})
