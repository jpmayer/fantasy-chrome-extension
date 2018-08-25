const leagueDatabase = {};
leagueDatabase.webdb = {};
leagueDatabase.webdb.db = null;
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
let url = ""
let lastSync = null;
let firstYear = null;
let currentYear = (new Date()).getUTCFullYear();
let leagueId = null;
let QBG = null, QBS= null, RBG = null, RBS = null, WRG = null, WRS = null;
let TEG = null, TES = null, DSTG = null, DSTS = null, KG = null, KS = null;
let leagueLocalStorage = {};
let leagueDBNames = null;
let leagueName = '';
let leagueNameMap = null;
let dbName = '';
let lastDate = '';

const errorHandler = (transaction, error) => {
  alert("Error processing SQL: "+ error.message);
  return true;
}

//get initial options - league id and name, lastSync and former saved options
chrome.storage.sync.get(['leagueDBNames','leagueNameMap'], (data) => {
  leagueDBNames = (data.leagueDBNames) ? data.leagueDBNames : [];
  leagueNameMap = (data.leagueNameMap) ? data.leagueNameMap : {};

  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, (tabs) => {
      url = tabs[0].url;
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
        var xhr = new XMLHttpRequest();

        xhr.open("GET", "http://games.espn.com/ffl/api/v2/boxscore?leagueId=1032115&seasonId=2018&matchupPeriodId=1", false);
        xhr.send();

        var result = xhr.responseText;
        leagueId = url.split('leagueId=')[1].split('&')[0];
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

let parseTeams = (teamArray) => {
  const ownerMap = {};
  teamArray.forEach((team) => {
    ownerMap[team.teamId] = team.owners[0].firstName.trim() + " " + team.owners[0].lastName.trim();
  });
  return ownerMap;
}

const addMatchupBoxscoreToDB = (matchups, index, periodId, pointerYear, pointerWeek, seasonId, ownerLookup) => {
  let matchup = matchups.shift();
  if(!matchup.isBye && (periodId <= 13 || (periodId === 14 && index < 4) || (periodId === 15 && index < 2) || (periodId === 16 && index < 1)) ) {
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
    let homeScore = matchup.homeTeamScores[0];
    let awayScore = matchup.awayTeamScores[0];
    let awayOutcome = 3;
    if(matchup.outcome === 1) {
      awayOutcome = 2;
    } else if(matchup.outcome === 2) {
      awayOutcome = 1;
    }
    // home team
    leagueDatabase.webdb.db.transaction((tx) => {
      tx.executeSql("INSERT INTO matchups(manager, week, year, vs, isHomeGame, winLoss, score, matchupTotal, pointDiff) VALUES (?,?,?,?,?,?,?,?,?)",
          [ownerLookup[matchup.homeTeamId], periodId, seasonId, ownerLookup[matchup.awayTeamId], true, matchup.outcome, (homeScore + matchup.homeTeamBonus), (awayScore + homeScore + matchup.homeTeamBonus), ((homeScore + matchup.homeTeamBonus) - awayScore)], ()=>{}, errorHandler);
     });
    // away team
    leagueDatabase.webdb.db.transaction((tx) => {
      tx.executeSql("INSERT INTO matchups(manager, week, year, vs, isHomeGame, winLoss, score, matchupTotal, pointDiff) VALUES (?,?,?,?,?,?,?,?,?)",
          [ownerLookup[matchup.awayTeamId], periodId, seasonId, ownerLookup[matchup.homeTeamId], false, awayOutcome, awayScore, (awayScore + homeScore + matchup.homeTeamBonus), (awayScore - (homeScore + matchup.homeTeamBonus))],
        (tx, tr) => {
          loadingDiv.innerHTML = 'Uploading Week ' + pointerWeek + ', Year ' + pointerYear;
          if(lastDate === (pointerYear + '-' + pointerWeek)) {
            setTimeout(() => {
              alert("Database Update Complete")
              enableButtons();
            })
          }
        }, errorHandler);
     });
     if(matchups.length > 0) {
       addMatchupBoxscoreToDB(matchups, ++index, periodId, pointerYear, pointerWeek, seasonId, ownerLookup);
     }
  } else if(matchups.length > 0) {
    addMatchupBoxscoreToDB(matchups, ++index, periodId, pointerYear, pointerWeek, seasonId, ownerLookup);
  }
}

createTables = () => {
  // update from last sync to present - if no last sync, then from firstYear
  let yearPointer = (lastSync) ? lastSync.split("-")[0] : firstYear;
  let weekPointer = (lastSync) ? lastSync.split("-")[1] : 1;

  for(yearPointer; yearPointer <= currentYear; yearPointer++) {
    //get team info for the year to match with ids later
    var xhr = new XMLHttpRequest();
    xhr.open("GET", `http://games.espn.com/ffl/api/v2/teams?leagueId=${leagueId}&seasonId=${yearPointer}&matchupPeriodId=1`, false);
    xhr.send();
    var teamInfo = JSON.parse(xhr.responseText).teams;
    let ownerLookup = parseTeams(teamInfo);


    var xhr = new XMLHttpRequest();
    xhr.open("GET", `http://games.espn.com/ffl/api/v2/leagueSchedules?leagueId=${leagueId}&seasonId=${yearPointer}&matchupPeriodId=1`, false);
    xhr.send();
    var leagueSchedule = JSON.parse(xhr.responseText).leagueSchedule;
    let scheduleItems = leagueSchedule.scheduleItems;
    let seasonId = leagueSchedule.seasonId;

    scheduleItems.some((week) => { //add setting for this - pull from league Settings
      weekPointer = week.matchupPeriodId;
      // check for current week
      if(!week.matchups[0].isBye) {
        if(week.matchups[0].homeTeamScores[0] + week.matchups[0].awayTeamScores[0] === 0) {
          lastDate = (weekPointer === 1) ? "" + (yearPointer - 1) + "-" + "16" : "" + (yearPointer - 1) + "-" + periodId; // TODO: Update to last week of year
          return true;
        }
      } else if(!week.matchups[1].isBye) {
        if(week.matchups[1].homeTeamScores[0] + week.matchups[1].awayTeamScores[0] === 0) {
          lastDate = (weekPointer === 1) ? "" + (yearPointer - 1) + "-" + "16" : "" + (yearPointer - 1) + "-" + periodId; // TODO: Update to last week of year
          return true;
        }
      }
      addMatchupBoxscoreToDB(week.matchups, 0, weekPointer, yearPointer, weekPointer, seasonId, ownerLookup);
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
    // if last sync is null, clear database to be sure an old instance isnt still there
    chrome.storage.sync.set({'leagueDBNames': leagueDBNames, 'leagueNameMap': leagueNameMap}, () => {});
    if(lastSync === null) {
      leagueDatabase.webdb.db.transaction((tx) => {
        tx.executeSql("CREATE TABLE IF NOT EXISTS " +
                      "history(manager TEXT, week INTEGER, year INTEGER, player TEXT, playerPosition TEXT, score FLOAT)", [], ()=>{}, errorHandler);
        tx.executeSql("CREATE TABLE IF NOT EXISTS " +
                      "matchups(manager TEXT, week INTEGER, year INTEGER, vs TEXT, isHomeGame BOOLEAN, winLoss BOOLEAN, score FLOAT, matchupTotal Float, pointDiff FLOAT)", [], ()=>{}, errorHandler);
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

const html = "<div id='record-book'><table><tr><th colspan='3' class='header'><h3>League Record Book</h3></th></tr><tr> <td class='column1'><b>Category</b></td><td class='column2'><b>Record</b></td><td class='column3'><b>Holder</b></td></tr><tr> <td class='recordType odd'>Most Points (Game) </td><td class='center odd'>197</td><td class='center odd' title='2014 - Week 10'>Chandos Culleen</td></tr><tr> <td class='recordType even'>Most Points (Season) </td><td class='center even'>1491</td><td class='center even' >Brandon Adams - 2013</td></tr><tr> <td class='recordType odd'>Most Points (Matchup) </td><td class='center odd'>310</td><td class='center odd' title='2013 - Week 9'>Stephen Strigle (145) vs. Chris Jones (165)</td></tr><tr> <td class='recordType even'>Fewest Points (G) </td><td class='center even'>15.8</td><td class='center even' title='2017 - Week 5'>Stephen Strigle</td></tr><tr> <td class='recordType odd'>Fewest Points (S) </td><td class='center odd'>1009.4</td><td class='center odd' >Stephen Strigle - 2017</td></tr><tr> <td class='recordType even'>Fewest Points (M) </td><td class='center even'>93.6</td><td class='center even' title='2017 - Week 5'>Stephen Strigle (15.8) vs. Max Culleen (77.8)</td></tr><tr> <td class='recordType odd'>Most Points Allowed (S) </td><td class='center even'>1484</td><td class='center even' >Chris Jones - 2013</td></tr><tr> <td class='recordType even'>Fewest Points Allowed (S) </td><td class='center even'>1061.2</td><td class='center even' >Chris Livia - 2017</td></tr><tr> <td class='recordType odd'>Longest Win Streak </td><td class='center odd'>10</td><td class='center odd' title='2015 Week 13 to 2016 Week 6 '>Joshua Mayer</td></tr><tr> <td class='recordType even'>Longest Losing Streak </td><td class='center even'>10</td><td class='center even' title='2017 Week 4 to 2017 Week 13 '>Stephen Strigle</td></tr><tr> <td class='recordType odd'>Most Points-QB (G) </td><td class='center odd'>51</td><td class='center odd' title='2013 - Week 1; Owner: Chandos Culleen'>Peyton Manning</td></tr><tr> <td class='recordType even'>Most Points-QB (S) </td><td class='center even'>320</td><td class='center even'>Peyton Manning - 2013</td></tr><tr> <td class='recordType odd'>Most Points-RB (G) </td><td class='center odd'>46</td><td class='center odd' title='2017 - Week 15; Owner: Larry Hernandez'>Todd Gurley II</td></tr><tr> <td class='recordType even'>Most Points-RB (S) </td><td class='center even'>255</td><td class='center even'>David Johnson - 2016</td></tr><tr> <td class='recordType odd'>Most Points-WR (G) </td><td class='center odd'>46</td><td class='center odd' title='2013 - Week 9; Owner: Heather the Terrible'>Andre Johnson</td></tr><tr> <td class='recordType even'>Most Points-WR (S) </td><td class='center even'>213</td><td class='center even'>Antonio Brown - 2014</td></tr><tr> <td class='recordType odd'>Most Points-TE (G) </td><td class='center odd'>34</td><td class='center odd' title='2014 - Week 8; Owner: Stephen Strigle'>Rob Gronkowski</td></tr><tr> <td class='recordType even'>Most Points-TE (S) </td><td class='center even'>180</td><td class='center even'>Jimmy Graham - 2013</td></tr><tr> <td class='recordType odd'>Most Points-D/ST (G) </td><td class='center odd'>52.3</td><td class='center odd' title='2017 - Week 6; Owner: Kevin McNeill'>Ravens D/ST</td></tr><tr> <td class='recordType even'>Most Points-D/ST (S) </td><td class='center even'>221</td><td class='center even'>Seahawks D/ST - 2013</td></tr><tr> <td class='recordType odd'>Most Points-K (G) </td><td class='center odd'>27</td><td class='center odd' title='2017 - Week 4; Owner: Joshua Mayer'>Greg Zuerlein</td></tr><tr> <td class='recordType even'>Most Points-K (S) </td><td class='center even'>138</td><td class='center even'>Greg Zuerlein - 2017</td></tr></table></div><style>.header {  width:500px;  background-color:#1D7225;  color:white;  text-align:center;  border-radius: 3px 3px 0px 0px;}.column1 {width:250px;padding-left:5px;background-color:#6DBB75;text-align:left;}.column2 {  background-color:#6DBB75;  text-align:center;  width:75px}.column3 {  background-color:#6DBB75;  text-align:center;  padding-left:5px}.odd{background-color:#F2F2E8;}.even{background-color:#F8F8F2;}.center{text-align:center;}.recordType{width:250px;padding-left:5px;padding-top:5px;}#recordBook{width:100%;position:relative;margin-left:auto;margin-right:auto;}#recordBook table {border:0px solid black;font-size:12px;width:100%;}</style>";

recordBook.onclick = (element) => {
  chrome.windows.create({
    url: chrome.extension.getURL('../html/screenshot.html'),
    //tabId: tabs[0].id,
    type: 'popup',
    focused: true
  });

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.executeScript(
      tabs[0].id,
      { file: "screenshot.js" },
      () => {
        if (tabs[0].incognito) {
          return;
        } else {
          console.log(html);
          chrome.storage.local.set({'payload': html});
        }
      }
    );
  });
};

allTimeWins.onclick = (element) => {
  const onReady = (htmlBlock) => {
    chrome.windows.create({
      url: chrome.extension.getURL('../html/screenshot.html'),
      //tabId: tabs[0].id,
      type: 'popup',
      focused: true
    });
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.executeScript(
          tabs[0].id,
          {file: "screenshot.js"},
          () => {
            if (tabs[0].incognito) {
              return;
            } else {
              chrome.storage.local.set({'payload': htmlBlock});
            }
          }
      );
    });
  }
  getManagers(leagueDatabase.webdb.db, (managerList) => {
    getRecords(leagueDatabase.webdb.db, managerList, (records) => {
      getAllManagersPoints(leagueDatabase.webdb.db, managerList, (points) => {
        var yearList = yearRangeGenerator(parseInt(firstYear,10),parseInt(currentYear,10));
        getChampionships(leagueDatabase.webdb.db, yearList, (champions) => {
          getSackos(leagueDatabase.webdb.db, yearList, (sackos) => {
            getAllManagersPlayoffAppearences(leagueDatabase.webdb.db, managerList, (playoffApps) => {
              const mergedRecords = mergeDataIntoRecords(records, sackos, champions, playoffApps, points);
              getAllTimeLeaderBoard(mergedRecords, onReady);
            });
          })
        })
      })
    })
  });

}
