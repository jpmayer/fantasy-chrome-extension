let saveButton = document.getElementById('save');
let QBG = document.getElementById('QBG');
let QBS= document.getElementById('QBS');
let RBG = document.getElementById('RBG');
let RBS = document.getElementById('RBS');
let WRG = document.getElementById('WRG');
let WRS = document.getElementById('WRS');
let TEG = document.getElementById('TEG');
let TES = document.getElementById('TES');
let DSTG = document.getElementById('DSTG');
let DSTS = document.getElementById('DSTS');
let KG = document.getElementById('KG');
let KS = document.getElementById('KS');

chrome.storage.sync.get(['QBG', 'QBS', 'RBG', 'RBS', 'WRG', 'WRS', 'TEG', 'TES', 'DSTG', 'DSTS', 'KG', 'KS'], function(data) {
    lastSync = data.lastSync;
    QBG.value = data.QBG;
    QBS.value = data.QBS;
    RBG.value = data.RBG;
    RBS.value = data.RBS;
    WRG.value = data.WRG;
    WRS.value = data.WRS;
    TEG.value = data.TEG;
    TES.value = data.TES;
    DSTG.value = data.DSTG;
    DSTS.value = data.DSTS;
    KG.value = data.KG;
    KS.value = data.KS;
  });

saveButton.onclick = function(element) {
  alert("saved");
  chrome.storage.sync.set({QBG: QBG.value, QBS: QBS.value, RBG: RBG.value, RBS: RBS.value,
    WRG: WRG.value, WRS: WRS.value, TEG: TEG.value, TES: TES.value, DSTG: DSTG.value, DSTS: DSTS.value, KG: KG.value, KS: KS.value}, function() {
  });
};
