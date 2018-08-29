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
let leagueId = null;

let recordBook = document.getElementById('record-book');
let allTimeWins = document.getElementById('all-time-wins');
let updateDatabase = document.getElementById('update-database');
let deleteDatabase = document.getElementById('delete-database');
let databaseInfo = document.getElementById('database-info');
let loadingDiv = document.getElementById('loading-div');
let syncText = document.getElementById('database-last-update');
let screenshot = document.getElementById('create-screenshot');
let lmNote = document.getElementById('lm-note');
let nameDisplay = document.getElementById('league-name');

let lastSync = null;
let firstYear = null;
let currentYear = (new Date()).getUTCFullYear();
let currentWeek = null;
let lastDate = '';
let QBG = null, QBS= null, RBG = null, RBS = null, WRG = null, WRS = null;
let TEG = null, TES = null, DSTG = null, DSTS = null, KG = null, KS = null;

const positions = { QB: "0.0", RB: "2.0", WR: "4.0", TE: "6.0", DST: "16.0", K: "17.0" }

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
          (results) => {
            firstYear = results[0];
          });

        chrome.tabs.executeScript(
          tabs[0].id,
          {code: 'document.getElementById("lo-league-header").getElementsByClassName("league-team-names")[0].getElementsByTagName("h1")[0].title;'},
          (results) => {
          leagueName = results[0];
          nameDisplay.innerHTML = leagueName;

          dbName = 'league-' + leagueId;

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
                //Get old records from extension options
                QBG = data[dbName].QBG;
                QBS = data[dbName].QBS;
                RBG = data[dbName].RBG;
                RBS = data[dbName].RBS;
                WRG = data[dbName].WRG;
                WRS = data[dbName].WRS;
                TEG = data[dbName].TEG;
                TES = data[dbName].TES;
                DSTG = data[dbName].DSTG;
                DSTS = data[dbName].DSTS;
                KG = data[dbName].KG;
                KS = data[dbName].KS;
              }
              //set last sync display time
              syncText.innerHTML = (lastSync) ? ('Week ' + lastSync.split('-')[1] + ", Year " + lastSync.split('-')[0]) : 'Never';
            });

          leagueDatabase.webdb.open = () => {
            var dbSize = 5 * 1024 * 1024; // 5MB
            leagueDatabase.webdb.db = openDatabase(dbName, "1", "League Database", dbSize);
          }

          leagueDatabase.webdb.open();
        });
      });
  });
});

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

const addMatchupBoxscoreToDB = (matchups, index, periodId, pointerYear, seasonId, ownerLookup) => {
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
          if(lastDate === (pointerYear + '-' + periodId)) {
            setTimeout(() => {
              //TODO : have handler only show once if users save third place or losers bracket games
              alert("Database Update Complete")
              enableButtons();
            })
          }
        }, errorHandler);
     });
     if(matchups.length > 0) {
       addMatchupBoxscoreToDB(matchups, ++index, periodId, pointerYear, seasonId, ownerLookup);
     }
  } else if(matchups.length > 0) {
    addMatchupBoxscoreToDB(matchups, ++index, periodId, pointerYear, seasonId, ownerLookup);
  }
}

createTables = () => {
  // update from last sync to present - if no last sync, then from firstYear
  let yearPointer = (lastSync) ? lastSync.split("-")[0] : firstYear;
  let weekPointer = (lastSync) ? lastSync.split("-")[1] : 1;

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
      if(currentYear === yearPointer && currentWeek === weekPointer) {
        lastDate = (weekPointer === 1) ? "" + (yearPointer - 1) + "-" + leagueSettings.finalMatchupPeriodId : "" + (yearPointer - 1) + "-" + weekPointer;
        return true;
      }
      addMatchupBoxscoreToDB(week.matchups, 0, weekPointer, yearPointer, seasonId, ownerLookup);
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
  loadingDiv.innerHTML = 'Loading...';
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
      chrome.storage.sync.set({'leagueDBNames': leagueDBNames, 'leagueNameMap': leagueNameMap}, () => {});
      leagueDatabase.webdb.db.transaction((tx) => {
        tx.executeSql("CREATE TABLE IF NOT EXISTS " +
                      "history(manager TEXT, week INTEGER, year INTEGER, player TEXT, playerPosition TEXT, score FLOAT)", [], ()=>{}, errorHandler);
        tx.executeSql("CREATE TABLE IF NOT EXISTS " +
                      "matchups(manager TEXT, week INTEGER, year INTEGER, vs TEXT, isHomeGame BOOLEAN, winLoss INTEGER, score FLOAT, matchupTotal Float, pointDiff FLOAT, isThirdPlaceGame BOOLEAN, isChampionship BOOLEAN, isLosersBacketGame BOOLEAN)", [], ()=>{}, errorHandler);
        tx.executeSql("CREATE TABLE IF NOT EXISTS " +
                      "rankings(manager TEXT, week INTEGER, year INTEGER, ranking INTEGER, description TEXT)", [], () => { createTables() }, errorHandler);
      });
    } else {
      createTables();
    }
  }, 1)
};

deleteDatabase.onclick = (element) => {
  let shouldDelete = confirm('Are you sure you want to delete the data from your database?');

  if(shouldDelete) {
    try {
      leagueDatabase.webdb.db.transaction((tx) => {
        tx.executeSql("DROP TABLE rankings",[],() => {
          tx.executeSql("DROP TABLE matchups",[],() => {
            tx.executeSql("DROP TABLE history",[],() => {
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
  }
};

recordBook.onclick = (element) => {
  const onReady = (htmlBlock) => {
    chrome.tabs.create({
      url: chrome.extension.getURL('../html/screenshot.html'),
      //tabId: tabs[0].id,
      active: false
    });
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.runtime.sendMessage({
        msg: "something_completed",
        data: {
            name: "league_record_book",
            html: htmlBlock
        }
      });
    });
  }

  var yearList = yearRangeGenerator(parseInt(firstYear,10),parseInt(currentYear,10));
  const leagueSettingsMap = getLeagueSettings(yearList, leagueId);
  mergeDataIntoRecordBook(leagueDatabase.webdb.db, positions, leagueSettingsMap, leagueLocalStorage, onReady);
};

allTimeWins.onclick = (element) => {
  const onReady = (htmlBlock) => {
    chrome.tabs.create({
      url: chrome.extension.getURL('../html/screenshot.html'),
      //tabId: tabs[0].id,
      active: false
    });
    setTimeout(() => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.runtime.sendMessage({
          msg: "something_completed",
          data: {
            name: "league_all_time_wins",
            html: htmlBlock
          }
        });
      });
    }, 100);

  }
  getManagers(leagueDatabase.webdb.db, (managerList) => {
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
  });

}
