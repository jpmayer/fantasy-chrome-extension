'use strict';

const saveScreenshot = (callback) => {
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.msg === "something_completed") {
        document.getElementById("create-screenshot").innerHTML = request.data.html;
        html2canvas(document.getElementById("create-screenshot"), 
          {width: "fit-content", allowTaint: true}).then(function(canvas) {
            document.getElementById("screenshot-img").src = canvas.toDataURL();
            canvas.toBlob(function(blob) {
              saveAs(blob, request.data.name + ".png"); 
            });
            //Comment the below line to retain the original table
            document.getElementById("create-screenshot").style.display = "none";
            callback(true)
        });
      }
    }
  );
}

saveScreenshot(function(){ /*window.close();*/ });
