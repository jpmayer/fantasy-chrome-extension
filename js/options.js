let currentLeague = null;
let leagueDBNames = null;
let leagueNameMap = null;
const container = document.getElementById('container-body');
const leagueSelector = document.getElementById('league-selector');
const categories = document.getElementsByClassName('category');
const leagueDatabase = {};
leagueDatabase.webdb = {};
leagueDatabase.webdb.db = null;
const saveButton = document.getElementById('save');
const resetButton = document.getElementById('reset');
const QBG = document.getElementById('QBG');
const QBGName = document.getElementById('QBG-Name');
const QBS= document.getElementById('QBS');
const QBSName= document.getElementById('QBS-Name');
const RBG = document.getElementById('RBG');
const RBGName = document.getElementById('RBG-Name');
const RBS = document.getElementById('RBS');
const RBSName = document.getElementById('RBS-Name');
const WRG = document.getElementById('WRG');
const WRGName = document.getElementById('WRG-Name');
const WRS = document.getElementById('WRS');
const WRSName = document.getElementById('WRS-Name');
const TEG = document.getElementById('TEG');
const TEGName = document.getElementById('TEG-Name');
const TES = document.getElementById('TES');
const TESName = document.getElementById('TES-Name');
const DSTG = document.getElementById('DSTG');
const DSTGName = document.getElementById('DSTG-Name');
const DSTS = document.getElementById('DSTS');
const DSTSName = document.getElementById('DSTS-Name');
const KG = document.getElementById('KG');
const KGName = document.getElementById('KG-Name');
const KS = document.getElementById('KS');
const KSName = document.getElementById('KS-Name');

const showLoserCheckbox = document.getElementById('losers-show');
const show3rdPlaceCheckbox = document.getElementById('3rd-show');
const hideAverageLineCheckbox = document.getElementById('acuna-show');
const averageLineNameInput = document.getElementById('acuna-name');
const lastPlaceNameInput = document.getElementById('sacko-name');

const leaderBoardOptionsDiv = document.getElementById('leader-board-options');
const managerOptionsDiv = document.getElementById('manager-options');
const recordBoardOptionsDiv = document.getElementById('record-board-options');

const managerTable = document.getElementById('manager-override');
const managerTableBody = managerTable.getElementsByTagName( 'tbody' )[0];
const sackoTable = document.getElementById('sacko-override');

const errorHandler = (transaction, error) => {
  alert("Error processing SQL: "+ error.message);
  return true;
}

let yearArray = [];
let managerArray = [];
let sackoMap = null;
let managerMap = null;
let lastSync = null;

for(var h = 0; h < categories.length; h++) {
  ((index) => {
    categories[index].addEventListener("click", () => {
      if(categories[index].className.indexOf('inactive') > -1) {
        for(var j = 0; j < categories.length; j++) {
          categories[j].classList.remove('inactive');
          categories[j].classList.add('inactive');
        }
        categories[index].classList.remove('inactive');
      }
    });
  })(h);
}

leagueSelector.addEventListener('change', (event) => {
  currentLeague = event.target.value;
  updateOptionsForLeague();
});

const updateOptionsForLeague = () => {
  yearArray = []; managerArray = [];
  leagueDatabase.webdb.open = () => {
    var dbSize = 5 * 1024 * 1024; // 5MB
    leagueDatabase.webdb.db = openDatabase((currentLeague), "1", "League Database", dbSize);
  }

  leagueDatabase.webdb.open();
  chrome.storage.sync.get([currentLeague], (response) => {
    const data = response[currentLeague];
    lastSync = data.lastSync;
    QBG.value = (data.QBG) ? data.QBG.score : null;
    QBS.value = (data.QBS) ? data.QBS.score : null;
    RBG.value = (data.RBG) ? data.RBG.score : null;
    RBS.value = (data.RBS) ? data.RBS.score : null;
    WRG.value = (data.WRG) ? data.WRG.score : null;
    WRS.value = (data.WRS) ? data.WRS.score : null;
    TEG.value = (data.TEG) ? data.TEG.score : null;
    TES.value = (data.TES) ? data.TES.score : null;
    DSTG.value = (data.DSTG) ? data.DSTG.score : null;
    DSTS.value = (data.DSTS) ? data.DSTS.score : null;
    KG.value = (data.KG) ? data.KG.score : null;
    KS.value = (data.KS) ? data.KS.score : null;

    QBGName.value = (data.QBG) ? data.QBG.name : null;
    QBSName.value = (data.QBS) ? data.QBS.name : null;
    RBGName.value = (data.RBG) ? data.RBG.name : null;
    RBSName.value = (data.RBS) ? data.RBS.name : null;
    WRGName.value = (data.WRG) ? data.WRG.name : null;
    WRSName.value = (data.WRS) ? data.WRS.name : null;
    TEGName.value = (data.TEG) ? data.TEG.name : null;
    TESName.value = (data.TES) ? data.TES.name : null;
    DSTGName.value = (data.DSTG) ? data.DSTG.name : null;
    DSTSName.value = (data.DSTS) ? data.DSTS.name : null;
    KGName.value = (data.KG) ? data.KG.name : null;
    KSName.value = (data.KS) ? data.KS.name : null;

    showLoserCheckbox.checked = (data.trackLosers) ? data.trackLosers : false;
    show3rdPlaceCheckbox.checked = (data.track3rdPlaceGame) ? data.track3rdPlaceGame : false;
    hideAverageLineCheckbox.checked = (data.hideAverageLine) ? data.hideAverageLine : null;
    averageLineNameInput.value = (data.averageLineName) ? data.averageLineName : null;
    lastPlaceNameInput.value = (data.lastPlaceName) ? data.lastPlaceName : null;

    //get options from database
    const query = 'SELECT DISTINCT year FROM matchups';
    const query2 = 'SELECT DISTINCT manager FROM matchups';
    leagueDatabase.webdb.db.transaction((tx) => {
      tx.executeSql(query, [],
        (tx, rs) => {
          for(var i = 0; i < rs.rows.length; i++) {
            yearArray.push(rs.rows[i].year);
          }
          tx.executeSql(query2, [],
            (tx, rs2) => {
              for(var m = 0; m < rs2.rows.length; m++) {
                managerArray.push(rs2.rows[m].manager);
              }
              sackoMap = (data.sackoMap) ? data.sackoMap : {};
              managerMap = (data.managerMap) ? data.managerMap : {};
              populateManagerAlias(managerArray);
              populateLastPlaceSelection(yearArray, sackoMap, managerArray);
            }, errorHandler);
        }, errorHandler);
      });
  });
}

chrome.storage.sync.get(['leagueDBNames','leagueNameMap'], (result) => {
  leagueDBNames = result.leagueDBNames;
  leagueNameMap = result.leagueNameMap;
  const options = [];
  for(var i = 0; i < leagueDBNames.length; i++) {
    let selected = (i === 0) ? 'selected' : '';
    options.push(`<option value='${leagueDBNames[i]}' ${selected}>${leagueNameMap[leagueDBNames[i]]}</option>`)
  }
  leagueSelector.innerHTML = options;
  currentLeague = (leagueDBNames.length > 0) ? leagueDBNames[0] : null;
  if(currentLeague) {
    //leagueTitle.innerHTML = result.leagueNameMap[currentLeague];
    updateOptionsForLeague();
  } else {
    container.innerHTML = "<div class='container' style='padding:25px; text-align:center;'>Upload league database before adding league options</div>";
  }
});

const populateManagerAlias = (managers) => {
  managerTableBody.innerHTML = "";
  managers.forEach((manager) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.setAttribute('style','width: 33%;');
    nameCell.innerHTML = manager + ":";
    const aliasCell = document.createElement('td');
    const aliasInput = document.createElement('input');
    aliasInput.setAttribute('type','text');
    aliasInput.setAttribute('style','margin-left: 5%; width: 90%;');
    let managerValue = (managerMap[manager]) ? managerMap[manager] : '';
    aliasInput.setAttribute('value', managerValue);
    aliasInput.addEventListener('change', (event) => {
      managerMap[manager] = event.target.value;
    });
    aliasCell.appendChild(aliasInput);
    row.appendChild(nameCell);
    row.appendChild(aliasCell);
    managerTableBody.appendChild(row);
  });
  let tableHeight = window.getComputedStyle(managerTableBody).getPropertyValue('height');
  const newHeight = parseInt(tableHeight.split('px')[0],10) + 29;
  managerOptionsDiv.style['max-height'] = `${newHeight}px`;
}

const populateLastPlaceSelection = (years, sackoMap, owners) => {
  sackoTable.innerHTML = "";
  years.forEach((year) => {
    const row = document.createElement('tr');
    const yearCell = document.createElement('td');
    yearCell.innerHTML = year;
    const managerCell = document.createElement('td');
    managerCell.appendChild(generateManagerDropdown(owners, sackoMap[year], year));
    row.appendChild(yearCell);
    row.appendChild(managerCell);
    sackoTable.appendChild(row);
  })
  let tableHeight = window.getComputedStyle(sackoTable).getPropertyValue('height');
  const newHeight = parseInt(tableHeight.split('px')[0],10) + 129;
  leaderBoardOptionsDiv.style['max-height'] = `${newHeight}px`;
}

const generateManagerDropdown = (managers, selectedManager, year) => {
  let selectManager = document.createElement('select');
  selectManager.setAttribute('data-year', year);
  selectManager.addEventListener('change', (event, b) => {
    sackoMap[event.target.getAttribute('data-year')] = event.target.value;
  });
  let noneOption = document.createElement('option');
  noneOption.setAttribute('value', 'none');
  noneOption.innerHTML = '';
  selectManager.appendChild(noneOption);

  managers.forEach((manager) => {
    let managerOption = document.createElement('option');
    managerOption.setAttribute('value', manager);
    managerOption.innerHTML = manager;
    if(manager === selectedManager) {
      managerOption.setAttribute('selected', 'selected');
    }
    selectManager.appendChild(managerOption);
  })
  return selectManager;
}


saveButton.onclick = (element) => {
  const savedObject = {};
  savedObject[currentLeague] = {QBG: { score: QBG.value, name: QBGName.value}, QBS: { score: QBS.value, name: QBSName.value}, RBG: { score: RBG.value, name: RBGName.value}, RBS: { score: RBS.value, name: RBSName.value},
    WRG: { score: WRG.value, name: WRGName.value}, WRS: { score: WRS.value, name: WRSName.value}, TEG: { score: TEG.value, name: TEGName.value}, TES: { score: TES.value, name: TESName.value},
    DSTG: { score: DSTG.value, name: DSTGName.value}, DSTS: { score: DSTS.value, name: DSTSName.value}, KG: { score: KG.value, name: KGName.value}, KS: { score: KS.value, name: KSName.value},
    lastSync: lastSync, sackoMap: sackoMap, managerMap: managerMap, lastPlaceName: lastPlaceNameInput.value, averageLineName: averageLineNameInput.value, hideAverageLine: hideAverageLineCheckbox.checked, track3rdPlaceGame: show3rdPlaceCheckbox.checked, trackLosers: showLoserCheckbox.checked};
  chrome.storage.sync.set(savedObject, () => {
    alert("saved");
  });
};

resetButton.onclick = (element) => {
  updateOptionsForLeague();
}
