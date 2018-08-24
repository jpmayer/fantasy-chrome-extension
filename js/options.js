let currentLeague = null;
const container = document.getElementById('container-body');
const leagueSelector = document.getElementById('league-selector');
const categories = document.getElementsByClassName('category');
let saveButton = document.getElementById('save');
let QBG = document.getElementById('QBG');
let QBGName = document.getElementById('QBG-Name');
let QBS= document.getElementById('QBS');
let QBSName= document.getElementById('QBS-Name');
let RBG = document.getElementById('RBG');
let RBGName = document.getElementById('RBG-Name');
let RBS = document.getElementById('RBS');
let RBSName = document.getElementById('RBS-Name');
let WRG = document.getElementById('WRG');
let WRGName = document.getElementById('WRG-Name');
let WRS = document.getElementById('WRS');
let WRSName = document.getElementById('WRS-Name');
let TEG = document.getElementById('TEG');
let TEGName = document.getElementById('TEG-Name');
let TES = document.getElementById('TES');
let TESName = document.getElementById('TES-Name');
let DSTG = document.getElementById('DSTG');
let DSTGName = document.getElementById('DSTG-Name');
let DSTS = document.getElementById('DSTS');
let DSTSName = document.getElementById('DSTS-Name');
let KG = document.getElementById('KG');
let KGName = document.getElementById('KG-Name');
let KS = document.getElementById('KS');
let KSName = document.getElementById('KS-Name');

for(var h = 0; h < categories.length; h++) {
  ((index) => {
    categories[index].addEventListener("click", () => {
      if(categories[index].className.indexOf('active') === -1) {
        for(var j = 0; j < categories.length; j++) {
          categories[j].classList.remove('active');
        }
        categories[index].classList.add('active');
      }
    });
  })(h);
}

chrome.storage.sync.get(['leagueDBNames','leagueNameMap'], (result) => {
  console.log(result);
  currentLeague = (result.leagueDBNames.length > 0) ? result.leagueDBNames[0] : null;
  let options = [];
  if(currentLeague) {
    //leagueTitle.innerHTML = result.leagueNameMap[currentLeague];
    for(var i = 0; i < result.leagueDBNames.length; i++) {
      let selected = (i === 0) ? 'selected' : '';
      options.push(`<option key='${result.leagueDBNames[i]}' ${selected}>${result.leagueNameMap[result.leagueDBNames[i]]}</option>`)
    }
    leagueSelector.innerHTML = options;
    chrome.storage.sync.get([currentLeague], (data) => {
      console.log(data);
      /*
      QBG.value = data.QBG.score;
      QBS.value = data.QBS.score;
      RBG.value = data.RBG.score;
      RBS.value = data.RBS.score;
      WRG.value = data.WRG.score;
      WRS.value = data.WRS.score;
      TEG.value = data.TEG.score;
      TES.value = data.TES.score;
      DSTG.value = data.DSTG.score;
      DSTS.value = data.DSTS.score;
      KG.value = data.KG.score;
      KS.value = data.KS.score;

      QBGName.value = data.QBG.name;
      QBSName.value = data.QBS.name;
      RBGName.value = data.RBG.name;
      RBSName.value = data.RBS.name;
      WRGName.value = data.WRG.name;
      WRSName.value = data.WRS.name;
      TEGName.value = data.TEG.name;
      TESName.value = data.TES.name;
      DSTGName.value = data.DSTG.name;
      DSTSName.value = data.DSTS.name;
      KGName.value = data.KG.name;
      KSName.value = data.KS.name;
      */
    });
  } else {
    container.innerHTML = "<div class='container' style='padding:25px; text-align:center;'>Upload league database before adding league options</div>";
  }
});


saveButton.onclick = function(element) {
  alert("saved");
  const savedObject = {};
  savedObject[currentLeague] = {QBG: { score: QBG.value, name: QBGName.value}, QBS: { score: QBS.value, name: QBSName.value}, RBG: { score: RBG.value, name: RBGName.value}, RBS: { score: RBS.value, name: RBSName.value},
    WRG: { score: WRG.value, name: WRGName.value}, WRS: { score: WRS.value, name: WRSName.value}, TEG: { score: TEG.value, name: TEGName.value}, TES: { score: TES.value, name: TESName.value},
    DSTG: { score: DSTG.value, name: DSTGName.value}, DSTS: { score: DSTS.value, name: DSTSName.value}, KG: { score: KG.value, name: KGName.value}, KS: { score: KS.value, name: KSName.value}};
  chrome.storage.sync.set(savedObject, function() {
  });
};
