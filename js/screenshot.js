'use strict';

const saveScreenshot = (callback) => {
  chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
      if (request.msg === "something_completed") {
        document.getElementById("create-screenshot").innerHTML = request.data.html;
        html2canvas(document.getElementById("create-screenshot"),
          {width: "fit-content", allowTaint: true}).then(function(canvas) {
            document.getElementById("screenshot-img").src = canvas.toDataURL();
            canvas.toBlob((blob) => {
              saveAs(blob, request.data.name + ".png");
              callback();
            });
            //Comment the below line to retain the original table
            document.getElementById("create-screenshot").style.display = "none";
        });
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
