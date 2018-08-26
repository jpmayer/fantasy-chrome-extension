'use strict';

const saveScreenshot = (callback) => {
  console.log("adding listener");
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log("listener", request);
      if (request.msg === "something_completed") {
        document.getElementById("create-screenshot").innerHTML = request.data.html;
        html2canvas(document.getElementById("create-screenshot"),
          {width: "fit-content", allowTaint: true}).then(function(canvas) {
            document.getElementById("screenshot-img").src = canvas.toDataURL();
            canvas.toBlob(function(blob) {
              saveAs(blob, request.data.name + ".png");
              callback();
            });
            //Comment the below line to retain the original table
            document.getElementById("create-screenshot").style.display = "none";
        });
      } else {
        console.log(request);
      }
    }
  );
}

const closeWindow = () => {
  setTimeout(() => {
    window.close();
  }, 1000);
}

saveScreenshot(closeWindow);
