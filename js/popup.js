const leagueDatabase = {};
leagueDatabase.webdb = {};
leagueDatabase.webdb.db = null;
let dbName = '';
let leagueLocalStorage = {};
let leagueDBNames = null;
let leagueName = '';
let leagueNameMap = null;
let leagueInfo = {};
let leagueSettings = {};
let selectedYearLeagueSettings = {};
let leagueId = null;

const recordBook = document.getElementById('record-book');
const allTimeWins = document.getElementById('all-time-wins');
const powerRankings = document.getElementById('power-rankings');
const updateDatabase = document.getElementById('update-database');
const deleteDatabase = document.getElementById('delete-database');
const databaseInfo = document.getElementById('database-info');
const loadingDiv = document.getElementById('loading-div');
const syncText = document.getElementById('database-last-update');
const screenshot = document.getElementById('create-screenshot');
const lmNote = document.getElementById('lm-note');
const nameDisplay = document.getElementById('league-name');
const powerRankingTable = document.getElementById('power-rankings-table').getElementsByTagName('tbody')[0];
const powerRankingWeek = document.getElementById('power-ranking-week');

let lastSync = null;
let firstYear = null;
let currentYear = (new Date()).getUTCFullYear();
let selectedYear = null;
let currentWeek = null;
let lastDate = '';
let previousManager = ''; // for power rankings manager dropdown
let isOverridePowerRanking = false;
let lastCreatedTabId = null;
let htmlBlock = null;

const positions = { QB: "0.0", RB: "2.0", WR: "4.0", TE: "6.0", DST: "16.0", K: "17.0" }
const positionsByESPNValue = { "0.0": "QB", "2.0": "RB", "4.0": "WR", "6.0": "TE", "16.0": "DST", "17.0": "K" }

//get initial options - league id and name, lastSync and former saved options
chrome.storage.sync.get(['leagueDBNames','leagueNameMap'], (data) => {
  leagueDBNames = (data.leagueDBNames) ? data.leagueDBNames : [];
  leagueNameMap = (data.leagueNameMap) ? data.leagueNameMap : {};

  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, (tabs) => {
    chrome.tabs.executeScript(
      tabs[0].id,
      {code: 'var oldHiddenDiv = document.getElementById("hidden-com-div"); if(oldHiddenDiv){oldHiddenDiv.parentNode.removeChild(oldHiddenDiv);} var oldHiddenScript = document.getElementById("hidden-com-script"); if(oldHiddenScript){oldHiddenScript.parentNode.removeChild(oldHiddenScript);} var s = document.createElement("script"); var hiddenDiv = document.createElement("div"); hiddenDiv.setAttribute("hidden","hidden"); hiddenDiv.setAttribute("id", "hidden-com-div"); s.setAttribute("id","hidden-com-script"); s.type = "text/javascript"; var code = "document.getElementById(\'hidden-com-div\').innerHTML = JSON.stringify(com.espn.games);"; s.appendChild(document.createTextNode(code)); document.body.appendChild(hiddenDiv); document.body.appendChild(s); document.getElementById("hidden-com-div").innerHTML'},
      (leagueObject) => {
        leagueInfo = JSON.parse(leagueObject[0]);
        leagueId = leagueInfo.leagueId;
        currentWeek = leagueInfo.currentScoringPeriodId;

        chrome.tabs.executeScript(
          tabs[0].id,
          {code: 'document.getElementById("seasonHistoryMenu").lastChild.value;'},
          (firstYearResults) => {
            firstYear = (firstYearResults[0]) ? firstYearResults[0] : leagueInfo.seasonId;
            selectedYear = leagueInfo.seasonId;
            if(!firstYearResults[0]) {
              // first year league
              retrieveLeagueDetails(tabs)
            } else {
              chrome.tabs.executeScript(
                tabs[0].id,
                {code: 'document.getElementById("seasonHistoryMenu").getElementsByTagName("option")[0].value'},
                (latestResults) => {
                    if(parseInt(selectedYear) !== parseInt(latestResults[0])) {
                      updateDatabase.setAttribute('disabled','disabled');
                    }
                    retrieveLeagueDetails(tabs);
                });
            }
        });
    });
  });
});

const retrieveLeagueDetails = (tabs) => {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", `http://games.espn.com/ffl/api/v2/leagueSettings?leagueId=${leagueId}&seasonId=${selectedYear}&matchupPeriodId=1`, false);
  xhr.send();
  selectedYearLeagueSettings = JSON.parse(xhr.responseText).leaguesettings;

  powerRankingWeek.innerHTML = 'Matchup Week ' + currentWeek;

  chrome.tabs.executeScript(
    tabs[0].id,
    {code: 'document.getElementById("lo-league-header").getElementsByClassName("league-team-names")[0].getElementsByTagName("h1")[0].title;'},
    (results) => {
    leagueName = results[0];
    nameDisplay.innerHTML = leagueName;
    dbName = 'league-' + leagueId;

    leagueDatabase.webdb.open = () => {
      var dbSize = 5 * 1024 * 1024; // 5MB
      leagueDatabase.webdb.db = openDatabase(dbName, "1", "League Database", dbSize);
    }
    leagueDatabase.webdb.open();

    leagueDatabase.webdb.db.transaction((tx) => {
      tx.executeSql("CREATE TABLE IF NOT EXISTS " +
                    "rankings(manager TEXT, week INTEGER, year INTEGER, ranking INTEGER, description TEXT, title TEXT)", [],
                    () => {}, errorHandler);
    });

    if(leagueDBNames.indexOf(dbName) === -1) {
      if(leagueDBNames.length === 0) {
        leagueDBNames = [dbName];
      } else {
        leagueDBNames.push(dbName);
      }
      leagueNameMap[dbName] = leagueName;
    }

    chrome.storage.sync.get([dbName], (data) => {
      if(data[dbName]) {
        lastSync = data[dbName].lastSync;
        leagueLocalStorage = data[dbName];
      }
      // generate power ranking table
      populatePowerRankings();
      //set last sync display time
      syncText.innerHTML = (lastSync) ? ('Week ' + lastSync.split('-')[1] + ", Year " + lastSync.split('-')[0]) : 'Never';
    });
  });
}

const generatePRManagerDropdown = (place, selectedTeam) => {
  let selectManager = document.createElement('select');
  selectManager.setAttribute('place', place);
  selectManager.addEventListener('focus', (event) => {
    previousManager = event.target.value;
  });
  selectManager.addEventListener('change', (event) => {
    let selectElements = document.getElementsByTagName('select');
    for(var s = 0; s < selectElements.length; s++) {
      let select = selectElements[s];
      if(select.getAttribute('place') !== event.target.getAttribute('place')) {
        if(select.value === event.target.value) {
          let descripElem = select.parentElement.nextSibling.getElementsByTagName('input')[0];
          let newDescripElem = event.target.parentElement.nextSibling.getElementsByTagName('input')[0];
          let oldText = descripElem.value;
          descripElem.value = newDescripElem.value;
          newDescripElem.value = oldText;
          select.value = previousManager;
          previousManager = event.target.value;
        }
      }
    }
  });

  for(var teamKey in selectedYearLeagueSettings.teams) {
    if (selectedYearLeagueSettings.teams.hasOwnProperty(teamKey)) {
      let managerOption = document.createElement('option');
      let oName = selectedYearLeagueSettings.teams[teamKey].owners[0].firstName.trim() + ' ' + selectedYearLeagueSettings.teams[teamKey].owners[0].lastName.trim();
      managerOption.setAttribute('value', oName);
      managerOption.innerHTML = (leagueLocalStorage.managerMap && leagueLocalStorage.managerMap[oName]) ? leagueLocalStorage.managerMap[oName] : oName;
      if(oName === selectedTeam) {
        managerOption.setAttribute('selected', 'selected');
      }
      selectManager.appendChild(managerOption);
    }
  }
  return selectManager;
}

const rankingToPlaceString = (ranking) => {
  let place = ranking.toString();
  if(place === '11' || place === '12' || place === '13') {
    return place + 'th';
  }
  switch(place.split('').pop()) {
    case '1': place = place + 'st'; break;
    case '2': place = place + 'nd'; break;
    case '3': place = place + 'rd'; break;
    default: place = place + 'th'; break;
  } return place;
}

const populatePowerRankings = () => {
  const query = "SELECT manager, ranking, week, year, description, title FROM rankings WHERE week = ? AND year = ?";
  const powerRankingTitleRow = document.createElement('tr');
  //const powerRankingTitleCell = document.createElement('td');
  const powerRankingTitleInputCell = document.createElement('td');
  const powerRankingTitleInput = document.createElement('input');
  powerRankingTitleInput.setAttribute('type', 'text');
  powerRankingTitleInput.setAttribute('id', 'power-ranking-title');
  powerRankingTitleInputCell.setAttribute('colspan', '3');
  powerRankingTitleInput.setAttribute('placeholder', getPowerRankingWeekNameDisplay(currentWeek, selectedYearLeagueSettings.finalRegularSeasonMatchupPeriodId, selectedYearLeagueSettings.finalMatchupPeriodId) + ' ' + selectedYear);
  //powerRankingTitleCell.innerHTML = 'Title:';
  powerRankingTitleInputCell.appendChild(powerRankingTitleInput);
  //powerRankingTitleRow.appendChild(powerRankingTitleCell);
  powerRankingTitleRow.appendChild(powerRankingTitleInputCell);
  powerRankingTable.innerHTML = powerRankingTitleRow.outerHTML;
  leagueDatabase.webdb.db.transaction((tx) => {
    tx.executeSql(query, [currentWeek, selectedYear],
      (tx, tr) => {
        if(tr.rows.length === 0) {
          for(var teamKey in selectedYearLeagueSettings.teams) {
            if (selectedYearLeagueSettings.teams.hasOwnProperty(teamKey)) {
              let oName = selectedYearLeagueSettings.teams[teamKey].owners[0].firstName.trim() + ' ' + selectedYearLeagueSettings.teams[teamKey].owners[0].lastName.trim();
              const row = document.createElement('tr');
              const rankingCell = document.createElement('td');
              const managerCell = document.createElement('td');
              const descriptionCell = document.createElement('td');
              const descriptionInput = document.createElement('input');
              rankingCell.innerHTML = rankingToPlaceString(teamKey) + ": ";
              managerCell.appendChild(generatePRManagerDropdown(teamKey, oName));
              descriptionInput.setAttribute('type','text');
              descriptionInput.setAttribute('data-name',oName)
              //descriptionInput.setAttribute('placeholder','...');
              descriptionCell.appendChild(descriptionInput);
              row.appendChild(rankingCell);
              row.appendChild(managerCell);
              row.appendChild(descriptionCell);
              powerRankingTable.appendChild(row);
            }
          }
        } else {
          isOverridePowerRanking = true;
          document.getElementById('power-ranking-title').value = tr.rows[0].title;
          for(var i = 0; i < tr.rows.length; i++) {
            let oName = tr.rows[i].manager;
            const row = document.createElement('tr');
            const rankingCell = document.createElement('td');
            const managerCell = document.createElement('td');
            const descriptionCell = document.createElement('td');
            const descriptionInput = document.createElement('input');
            rankingCell.innerHTML = rankingToPlaceString(tr.rows[i].ranking) + ": ";
            managerCell.appendChild(generatePRManagerDropdown(tr.rows[i].ranking, oName));
            descriptionInput.setAttribute('type','text');
            descriptionInput.setAttribute('data-name',oName)
            descriptionInput.value = tr.rows[i].description;
            //descriptionInput.setAttribute('placeholder','...');
            descriptionCell.appendChild(descriptionInput);
            row.appendChild(rankingCell);
            row.appendChild(managerCell);
            row.appendChild(descriptionCell);
            powerRankingTable.appendChild(row);
          }
        }
      }, errorHandler
    );
  });
}

let parseTeams = (teamArray) => {
  const ownerMap = {};
  teamArray.forEach((team) => {
    ownerMap[team.teamId] = team.owners[0].firstName.trim() + " " + team.owners[0].lastName.trim();
  });
  return ownerMap;
}

isValidPostSeasonMatchup = (periodId, index, champWeek) => {
  const matchupsTillFinal = champWeek - periodId;
  if(leagueLocalStorage.trackLosers) {
    return true;
  } else if(leagueLocalStorage.track3rdPlaceGame && matchupsTillFinal === 0) {
    return index < 2;
  } return index < Math.pow(2, matchupsTillFinal);
}

const addMatchupBoxscoreToDB = (matchups, index, periodId, pointerYear, seasonId, ownerLookup, hasNextMatchup) => {
  let matchup = matchups.shift();
  if(!matchup.isBye && (periodId <= leagueSettings.finalRegularSeasonMatchupPeriodId || isValidPostSeasonMatchup(periodId, index, leagueSettings.finalMatchupPeriodId))) {
    if(currentYear - seasonId <= 1) {
      // if current year or previous year, calculate player records
      var xhr = new XMLHttpRequest();
      xhr.open("GET", `http://games.espn.com/ffl/api/v2/boxscore?leagueId=${leagueId}&seasonId=${pointerYear}&matchupPeriodId=${periodId}&teamId=${matchup.awayTeamId}`, false);
      xhr.send();
      var boxscore = JSON.parse(xhr.responseText).boxscore;

      boxscore.teams.forEach((teamMatchup) => {
        const teamName = teamMatchup.team.teamId;
        teamMatchup.slots.forEach((playerStats) => {
          if(playerStats.slotCategoryId !== 20) {
            // dont save bench players
            if(playerStats.player) {
              //only save if player slot filled
              let position = playerStats.player.eligibleSlotCategoryIds[0];
              leagueDatabase.webdb.db.transaction((tx) => {
                tx.executeSql("INSERT INTO history(manager, week, year, player, playerPosition, score) VALUES (?,?,?,?,?,?)",
                    [ownerLookup[teamName], periodId, seasonId, (playerStats.player.firstName.trim() + " " + playerStats.player.lastName.trim()), position, playerStats.currentPeriodRealStats.appliedStatTotal], ()=>{}, errorHandler);
               });
            }
          }
        })
      })
    }
    let homeScore = matchup.homeTeamScores.reduce((a, b) => a + b, 0);
    let awayScore = matchup.awayTeamScores.reduce((a, b) => a + b, 0);
    let awayOutcome = 3;
    let isThirdPlaceGame = (periodId === leagueSettings.finalMatchupPeriodId && index === 1) ? true : false;
    let isChampionship = (periodId === leagueSettings.finalMatchupPeriodId && index === 0) ? true : false;
    let isLosersBacketGame = (periodId > leagueSettings.finalRegularSeasonMatchupPeriodId && index > Math.pow(2, leagueSettings.finalMatchupPeriodId - periodId)) ? true : false;
    if(matchup.outcome === 1) {
      awayOutcome = 2;
    } else if(matchup.outcome === 2) {
      awayOutcome = 1;
    }
    // home team
    leagueDatabase.webdb.db.transaction((tx) => {
      tx.executeSql("INSERT INTO matchups(manager, week, year, vs, isHomeGame, winLoss, score, matchupTotal, pointDiff, isThirdPlaceGame, isChampionship, isLosersBacketGame) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          [ownerLookup[matchup.homeTeamId], periodId, seasonId, ownerLookup[matchup.awayTeamId], true, matchup.outcome, (homeScore + matchup.homeTeamBonus), (awayScore + homeScore + matchup.homeTeamBonus), ((homeScore + matchup.homeTeamBonus) - awayScore), isThirdPlaceGame, isChampionship, isLosersBacketGame], ()=>{}, errorHandler);
     });
    // away team
    leagueDatabase.webdb.db.transaction((tx) => {
      tx.executeSql("INSERT INTO matchups(manager, week, year, vs, isHomeGame, winLoss, score, matchupTotal, pointDiff, isThirdPlaceGame, isChampionship, isLosersBacketGame) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          [ownerLookup[matchup.awayTeamId], periodId, seasonId, ownerLookup[matchup.homeTeamId], false, awayOutcome, awayScore, (awayScore + homeScore + matchup.homeTeamBonus), (awayScore - (homeScore + matchup.homeTeamBonus)), isThirdPlaceGame, isChampionship, isLosersBacketGame],
        (tx, tr) => {
          loadingDiv.innerHTML = 'Uploading Matchup ' + periodId + ', Year ' + pointerYear;
          if(isEndOfDatabaseUpdates(lastDate, pointerYear, periodId, isChampionship, isThirdPlaceGame, hasNextMatchup)) {
            setTimeout(() => {
              //TODO : have handler only show once if users save third place or losers bracket games
              alert("Database Update Complete")
              enableButtons();
            })
          }
        }, errorHandler);
     });
     if(matchups.length > 0) {
       addMatchupBoxscoreToDB(matchups, ++index, periodId, pointerYear, seasonId, ownerLookup, matchups.length > 1);
     }
  } else if(matchups.length > 0) {
    addMatchupBoxscoreToDB(matchups, ++index, periodId, pointerYear, seasonId, ownerLookup, matchups.length > 1);
  }
}

const isEndOfDatabaseUpdates = (lastDate, pointerYear, periodId, isChampionship, isThirdPlaceGame, hasNextMatchup) => {
  if (lastDate === (pointerYear + '-' + periodId)) {
    // check if the last date in the queue is the current pointer date
    if (isChampionship && (!leagueLocalStorage.trackLosers && !leagueLocalStorage.track3rdPlaceGame)) {
      // if championship week, in a league not counting losers bracket or 3rd place games
      // return immediately because we only process one matchup record for the date
      return true;
    } else if (leagueLocalStorage.trackLosers && !hasNextMatchup) {
      // if tracking losers, return when we are on the last matchup of the week
      return true;
    } else if (leagueLocalStorage.track3rdPlaceGame && isThirdPlaceGame) {
      // if tracking 3rd place but not other loser and it is third place game, return true
      return true;
    } else if (!hasNextMatchup) {
      // if not the championship game and not tracking any losers, then return when there
      // are no matchups left to process for the week
      return true;
    }
  } return false;
}

createTables = () => {
  // update from last sync to present - if no last sync, then from firstYear
  let yearPointer = (lastSync) ? parseInt(lastSync.split("-")[0], 10) : firstYear;
  let weekPointer = (lastSync) ? parseInt(lastSync.split("-")[1], 10) : 1;
  let initialRun = true;

  for(yearPointer; yearPointer <= currentYear; yearPointer++) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", `http://games.espn.com/ffl/api/v2/leagueSettings?leagueId=${leagueId}&seasonId=${yearPointer}&matchupPeriodId=1`, false);
    xhr.send();
    leagueSettings = JSON.parse(xhr.responseText).leaguesettings;

    //get team info for the year to match with ids later
    xhr = new XMLHttpRequest();
    xhr.open("GET", `http://games.espn.com/ffl/api/v2/teams?leagueId=${leagueId}&seasonId=${yearPointer}&matchupPeriodId=1`, false);
    xhr.send();
    var teamInfo = JSON.parse(xhr.responseText).teams;
    let ownerLookup = parseTeams(teamInfo);

    xhr = new XMLHttpRequest();
    xhr.open("GET", `http://games.espn.com/ffl/api/v2/leagueSchedules?leagueId=${leagueId}&seasonId=${yearPointer}&matchupPeriodId=1`, false);
    xhr.send();
    var leagueSchedule = JSON.parse(xhr.responseText).leagueSchedule;
    let scheduleItems = leagueSchedule.scheduleItems;
    let seasonId = leagueSchedule.seasonId;

    scheduleItems.some((week) => { //add setting for this - pull from league Settings
      weekPointer = week.matchupPeriodId;
      // check for current week
      if(initialRun) {
        if(currentYear === yearPointer && currentWeek === weekPointer) {
          alert("Database Update Complete")
          enableButtons();
          return true;
        }
      } else if(currentYear === yearPointer && currentWeek === weekPointer) {
        lastDate = (weekPointer === 1) ? "" + (yearPointer - 1) + "-" + leagueSettings.finalMatchupPeriodId : "" + (yearPointer - 1) + "-" + weekPointer;
        return true;
      }
      initialRun = false;
      addMatchupBoxscoreToDB(week.matchups, 0, weekPointer, yearPointer, seasonId, ownerLookup, week.matchups.length > 1);
    });
  }
  yearPointer--;
  lastSync = yearPointer+'-'+weekPointer;
  leagueLocalStorage.lastSync = lastSync;
  let saveState = {};
  saveState[dbName] = leagueLocalStorage;
  chrome.storage.sync.set(saveState, () => {
    syncText.innerHTML = 'Week ' + weekPointer + ", Year " + yearPointer;
  });
}

disableButtons = () => {
  let buttons = document.getElementsByTagName('button');
  for(var b = 0; b < buttons.length; b++) {
    buttons[b].setAttribute('disabled','disabled');
  }
  databaseInfo.style.display = 'none';
  loadingDiv.innerHTML = 'Preparing SQL Statements...';
  loadingDiv.style.display = 'inline-block';
}

enableButtons = () => {
  let buttons = document.getElementsByTagName('button');
  for(var b = 0; b < buttons.length; b++) {
    buttons[b].removeAttribute('disabled');
  }
  databaseInfo.style.display = 'inline-block';
  loadingDiv.style.display = 'none';
}

updateDatabase.onclick = (element) => {
  alert("Warning: Do not close the extension popup while database is updating.")
  disableButtons();
  setTimeout(() => {
    if(lastSync === null) {
      if(leagueDBNames.indexOf(dbName) === -1) {
        if(leagueDBNames.length === 0) {
          leagueDBNames = [dbName];
        } else {
          leagueDBNames.push(dbName);
        }
        leagueNameMap[dbName] = leagueName;
      }
      // if last sync is null, clear database to be sure an old instance isnt still there
      chrome.storage.sync.set({'leagueDBNames': leagueDBNames, 'leagueNameMap': leagueNameMap}, () => {
        leagueDatabase.webdb.db.transaction((tx) => {
          tx.executeSql("CREATE TABLE IF NOT EXISTS " +
                        "history(manager TEXT, week INTEGER, year INTEGER, player TEXT, playerPosition TEXT, score FLOAT)", [], ()=>{}, errorHandler);
          tx.executeSql("CREATE TABLE IF NOT EXISTS " +
                        "matchups(manager TEXT, week INTEGER, year INTEGER, vs TEXT, isHomeGame BOOLEAN, winLoss INTEGER, score FLOAT, matchupTotal Float, pointDiff FLOAT, isThirdPlaceGame BOOLEAN, isChampionship BOOLEAN, isLosersBacketGame BOOLEAN)", [],
                        () => { createTables(); }, errorHandler);
                      });
      });
    } else {
      createTables();
    }
  }, 1)
};

deleteDatabase.onclick = (element) => {
  let shouldDelete = confirm('Are you sure you want to delete the data from your database?');

  if(shouldDelete) {
    let shouldDeleteRankings = confirm('Would you like to clear the Power Rankings database as well? \n(Cancel will delete only the rankings and history tables)');
    if(shouldDeleteRankings) {
      try {
        leagueDatabase.webdb.db.transaction((tx) => {
          tx.executeSql("DROP TABLE IF EXISTS rankings",[],() => {
            tx.executeSql("DROP TABLE IF EXISTS matchups",[],() => {
              tx.executeSql("DROP TABLE IF EXISTS history",[],() => {
                leagueDBNames.splice(leagueDBNames.indexOf(dbName), 1);
                delete leagueNameMap[leagueName];
                let saveState = {'leagueDBNames': leagueDBNames, 'leagueNameMap': leagueNameMap};
                leagueLocalStorage.lastSync = null;
                saveState[dbName] = leagueLocalStorage;
                chrome.storage.sync.set(saveState, () => {
                  alert('Database deletion complete');
                  lastSync = null;
                  syncText.innerHTML = 'Never';
                });
              }, errorHandler);
            }, errorHandler);
          }, errorHandler);
        });
      } catch(e) {
        alert('Database deletion failed. Please try again');
      }
    } else {
      try {
        leagueDatabase.webdb.db.transaction((tx) => {
          tx.executeSql("DROP TABLE IF EXISTS matchups",[],() => {
            tx.executeSql("DROP TABLE IF EXISTS history",[],() => {
              leagueDBNames.splice(leagueDBNames.indexOf(dbName), 1);
              delete leagueNameMap[leagueName];
              let saveState = {'leagueDBNames': leagueDBNames, 'leagueNameMap': leagueNameMap};
              leagueLocalStorage.lastSync = null;
              saveState[dbName] = leagueLocalStorage;
              chrome.storage.sync.set(saveState, () => {
                alert('Database deletion complete');
                lastSync = null;
                syncText.innerHTML = 'Never';
              });
            }, errorHandler);
          }, errorHandler);
        });
      } catch(e) {
        alert('Database deletion failed. Please try again');
      }
    }
  }
};

const popupRecordBookListenerFunction = (request, sender, sendResponse) => {
  if (request.msg === "screen_ready") {
    chrome.runtime.sendMessage({
      msg: "something_completed",
      data: {
          name: "league_record_book",
          html: htmlBlock
      }
    });
  }
}

const createRecordBookTab = () => {
  chrome.runtime.onMessage.removeListener(popupPRListenerFunction);
  chrome.runtime.onMessage.removeListener(popupRecordBookListenerFunction);
  chrome.runtime.onMessage.removeListener(popupListenerFunction);
  chrome.runtime.onMessage.addListener(popupRecordBookListenerFunction);
  chrome.tabs.query({
      active: true, currentWindow: true
    }, tabs => {
      let index = tabs[0].index;
      chrome.tabs.create({
        url: chrome.extension.getURL('../html/screenshot.html'),
        index: index + 1,
        active: false,
      }, (tab) => {
        lastCreatedTabId = tab.id;
      });
    });
}

recordBook.onclick = (element) => {
  const onReady = (result) => {
    htmlBlock = result;
    if(lastCreatedTabId) {
      chrome.tabs.remove(lastCreatedTabId, ()=> {
        createRecordBookTab()
      })
    } else {
      createRecordBookTab();
    }
  }

  var yearList = yearRangeGenerator(parseInt(firstYear,10),parseInt(currentYear,10));
  const leagueSettingsMap = getLeagueSettings(yearList, leagueId);
  mergeDataIntoRecordBook(leagueDatabase.webdb.db, positions, leagueSettingsMap, leagueLocalStorage, onReady);
};

const popupListenerFunction = (request, sender, sendResponse) => {
  if (request.msg === "screen_ready") {
    chrome.runtime.sendMessage({
      msg: "something_completed",
      data: {
          name: "league_all_time_wins",
          html: htmlBlock
      }
    });
  }
}

const createLeaderBoardTab = () => {
  chrome.runtime.onMessage.removeListener(popupPRListenerFunction);
  chrome.runtime.onMessage.removeListener(popupRecordBookListenerFunction);
  chrome.runtime.onMessage.removeListener(popupListenerFunction);
  chrome.runtime.onMessage.addListener(popupListenerFunction);
  chrome.tabs.query({
      active: true, currentWindow: true
    }, tabs => {
      let index = tabs[0].index;
      chrome.tabs.create({
        url: chrome.extension.getURL('../html/screenshot.html'),
        index: index + 1,
        active: false,
      }, (tab) => {
        lastCreatedTabId = tab.id;
      });
    });
}

allTimeWins.onclick = (element) => {
  const onReady = (result) => {
    htmlBlock = result;
    if(lastCreatedTabId) {
      chrome.tabs.remove(lastCreatedTabId, ()=> {
        createLeaderBoardTab()
      })
    } else {
      createLeaderBoardTab();
    }

  }
  getManagers(leagueDatabase.webdb.db, (managerList) => {
    if(managerList.length === 0) {
      // no data in database
      alert('No matchups saved in the database, cannot generate leader board without matchup data. Please upload the database with at least one matchup before attempting again.');
    } else {
      getRecords(leagueDatabase.webdb.db, managerList, (records) => {
        getAllManagersPoints(leagueDatabase.webdb.db, managerList, (points) => {
          var yearList = yearRangeGenerator(parseInt(firstYear,10),parseInt(currentYear,10));
          const leagueSettingsMap = getLeagueSettings(yearList, leagueId);
          getChampionships(leagueDatabase.webdb.db, yearList, leagueSettingsMap, (champions) => {
            getSackos(leagueDatabase.webdb.db, yearList, leagueSettingsMap, (sackos) => {
              getAllManagersPlayoffAppearences(leagueDatabase.webdb.db, managerList, yearList, leagueSettingsMap, (playoffApps) => {
                const mergedRecords = mergeDataIntoRecords(records, sackos, champions, playoffApps, points);
                getAllTimeLeaderBoard(mergedRecords, leagueSettingsMap[yearList[0]], onReady);
              });
            })
          })
        })
      })
    }
  });
}

const saveWeeklyPowerRanking = (clonedRanking, title, ranking, callback, downloadImageFunction) => {
  let row = clonedRanking.shift();
  leagueDatabase.webdb.db.transaction((tx) => {
    tx.executeSql("INSERT INTO rankings(manager, week, year, ranking, description, title) VALUES (?,?,?,?,?,?)",
        [row.manager, currentWeek, selectedYear, row.place, row.description, title],
        () => {
          if(clonedRanking.length > 0) { saveWeeklyPowerRanking(clonedRanking, title, ranking, callback, downloadImageFunction); }
          else { callback(ranking, title, downloadImageFunction); }
        }, errorHandler);
   });
}

const getTeamRecord = (teamMap, ownerName) => {
  for(var teamKey in teamMap) {
    if (teamMap.hasOwnProperty(teamKey)) {
      let oName = teamMap[teamKey].owners[0].firstName.trim() + " " + teamMap[teamKey].owners[0].lastName.trim();
      if(oName === ownerName) {
        return {
          wins: teamMap[teamKey].record.overallWins,
          losses: teamMap[teamKey].record.overallLosses,
          ties: teamMap[teamKey].record.overallTies,
          image: teamMap[teamKey].logoUrl,
          teamName: teamMap[teamKey].teamLocation + ' ' + teamMap[teamKey].teamNickname
        };
      }
    }
  }
}

powerRankings.onclick = (element) => {
  if(isOverridePowerRanking) {
    if(confirm('Power ranking for the week has already been saved, are you sure you want to overwrite it?')) {
      leagueDatabase.webdb.db.transaction((tx) => {
        tx.executeSql("DELETE FROM rankings WHERE year = ? AND week = ?", [selectedYear, currentWeek],
          () => {
            powerRankingClickFunction(element);
          }, errorHandler);
        });
    }
  } else {
    powerRankingClickFunction(element);
  }
}

const popupPRListenerFunction = (request, sender, sendResponse) => {
  if (request.msg === "screen_ready") {
    chrome.runtime.sendMessage({
      msg: "something_completed",
      data: {
        name: "power_ranking",
        html: htmlBlock
      }
    });
  }
}

const createPowerRankingTab = () => {
  chrome.runtime.onMessage.removeListener(popupPRListenerFunction);
  chrome.runtime.onMessage.removeListener(popupRecordBookListenerFunction);
  chrome.runtime.onMessage.removeListener(popupListenerFunction);
  chrome.runtime.onMessage.addListener(popupPRListenerFunction);
  chrome.tabs.query({
      active: true, currentWindow: true
    }, tabs => {
      let index = tabs[0].index;
      chrome.tabs.create({
        url: chrome.extension.getURL('../html/screenshot.html'),
        index: index + 1,
        active: false
      }, (tab) => {
        lastCreatedTabId = tab.id;
      });
    });
}

const powerRankingClickFunction = (element) => {
  const onReady = (result) => {
    htmlBlock = result;
    if(lastCreatedTabId) {
      chrome.tabs.remove(lastCreatedTabId, () => {
        createPowerRankingTab()
      })
    } else {
      createPowerRankingTab();
    }
  }

  leagueDatabase.webdb.db.transaction((tx) => {
    tx.executeSql("CREATE TABLE IF NOT EXISTS " +
      "rankings(manager TEXT, week INTEGER, year INTEGER, ranking INTEGER, description TEXT, title TEXT)", [],
      () => {
        // first retrieve all the form data
        const selectElements = document.getElementById('power-rankings-table').getElementsByTagName('select');
        const powerRankingTitle = (document.getElementById('power-ranking-title').value !== '') ? document.getElementById('power-ranking-title').value : document.getElementById('power-ranking-title').placeholder;
        const weeklyPowerRanking = [];
        for(var i = 0; i < selectElements.length; i++) {
          const selectElem = selectElements[i];
          const descElem = selectElements[i].parentElement.nextSibling.getElementsByTagName('input')[0];
          const place = i + 1;
          weeklyPowerRanking.push({
            manager: selectElem.value,
            id: selectElem.getAttribute('data-id'),
            description: descElem.value,
            place: place
          });
        }
        //save to DB
        let weeklyPowerRankingClone = JSON.parse(JSON.stringify(weeklyPowerRanking));
        // TODO: if same week already saved, need to delete old records - confirm modal?
        saveWeeklyPowerRanking(weeklyPowerRankingClone, powerRankingTitle, weeklyPowerRanking, generatePowerRanking, onReady);
      }, errorHandler);
  });
}
