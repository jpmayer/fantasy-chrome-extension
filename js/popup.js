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
const currentPeriod = document.getElementById('periodId');
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
let noOwnerCount = 0;
let totalHistoryUpdates = 0;
let historyUpdatesCompleted = 0;
let members = [];
let memberMap = {};
let settingsMap = {};
const defaultPositions = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'D/ST' }
const positions = { QB: "0.0", RB: "2.0", 'RB/WR': '2.0', WR: "4.0", "WR/TE": "4.0", TE: "6.0", DST: "16.0", 'D/ST': "16.0", K: "17.0" }
const positionsByESPNValue = { "0.0": "QB", "2.0": "RB", "4.0": "WR", "6.0": "TE", "16.0": "D/ST", "17.0": "K" }

let periodIndex = {};

//get initial options - league id and name, lastSync and former saved options
chrome.storage.sync.get(['leagueDBNames','leagueNameMap'], (data) => {
  leagueDBNames = (data.leagueDBNames) ? data.leagueDBNames : [];
  leagueNameMap = (data.leagueNameMap) ? data.leagueNameMap : {};

  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, (tabs) => {
    chrome.tabs.executeScript(
      tabs[0].id,
      {code: ''},
      () => {
        leagueId = tabs[0].url.split('leagueId=')[1].split('&')[0];

        const dbName = 'league-' + leagueId;
        chrome.storage.sync.get([dbName], (data) => {
          if(data[dbName]) {
            currentPeriod.value = data[dbName].currentPeriod || 1;
          }

          currentPeriod.onchange = (e) => {
            onPeriodChange(tabs);
            leagueLocalStorage.currentPeriod = currentPeriod.value || 1;
            let saveState = {};
            saveState[dbName] = leagueLocalStorage;
            chrome.storage.sync.set(saveState, () => {
              console.log("updated periodId")
            });
          }
          onPeriodChange(tabs);
        });
    });
  });
});

const onPeriodChange = (tabs) => {
  currentWeek = currentPeriod.value || 1;
  chrome.tabs.executeScript(
    tabs[0].id,
    {code: 'document.getElementsByClassName("dropdown__select")[0].lastChild.value;'},
    (firstYearResults) => {
      firstYear = (firstYearResults[0]) ? firstYearResults[0] : 2021;
      if(parseInt(firstYear) < 2007) {
        alert("League history limited to after 2006 due to API constraints");
        firstYear = 2007;
      }
      selectedYear = 2021;
      if(!firstYearResults[0]) {
        // first year league
        retrieveLeagueDetails(tabs)
      } else {
        chrome.tabs.executeScript(
          tabs[0].id,
          {code: 'document.getElementsByClassName("dropdown__select")[0].value'},
          (latestResults) => {
              if(parseInt(selectedYear) !== parseInt(latestResults[0])) {
                updateDatabase.setAttribute('disabled','disabled');
              }
              retrieveLeagueDetails(tabs);
          });
      }
  });
}

const retrieveLeagueDetails = (tabs) => {
  var xhr = new XMLHttpRequest();
  if(selectedYear < 2018) {
    xhr.open("GET", `https://fantasy.espn.com/apis/v3/games/ffl/leagueHistory/${leagueId}?view=mLiveScoring&view=mMatchupScore&view=mRoster&view=mSettings&view=mStandings&view=mStatus&view=mTeam&view=modular&view=mNav&seasonId=${selectedYear}`, false);
  } else {
    xhr.open("GET", `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${selectedYear}/segments/0/leagues/${leagueId}?view=mSettings&view=mTeam&view=modular&view=mNav`, false);
  }
  xhr.send();
  selectedYearLeagueSettings = JSON.parse(xhr.responseText);
  members = selectedYearLeagueSettings.members;
  powerRankingWeek.innerHTML = 'Matchup Week ' + currentWeek;

  chrome.tabs.executeScript(
    tabs[0].id,
    {code: ''},
    (results) => {
    leagueName = selectedYearLeagueSettings.settings.name;
    owners = selectedYearLeagueSettings.members;
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
  for(var team of selectedYearLeagueSettings.teams) {
    let managerOption = document.createElement('option');
    let oName = getOwnerName(team.primaryOwner);
    memberMap[team.id] = team.primaryOwner;
    managerOption.setAttribute('value', oName);
    managerOption.innerHTML = (leagueLocalStorage.managerMap && leagueLocalStorage.managerMap[oName]) ? leagueLocalStorage.managerMap[oName] : oName;
    if(oName === selectedTeam) {
      managerOption.setAttribute('selected', 'selected');
    }
    selectManager.appendChild(managerOption);
  }
  return selectManager;
}

const getOwnerName = (id) => {
  for(var i = 0; i < members.length; i++) {
    if(members[i].id === id) {
      return members[i].firstName + ' ' + members[i].lastName;
    }
  }
  return id;
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
  const powerRankingTitleInputCell = document.createElement('td');
  const powerRankingTitleInput = document.createElement('input');
  powerRankingTitleInput.setAttribute('type', 'text');
  powerRankingTitleInput.setAttribute('id', 'power-ranking-title');
  powerRankingTitleInputCell.setAttribute('colspan', '3');
  let matchupPeriods = Object.keys(selectedYearLeagueSettings.settings.scheduleSettings.matchupPeriods);
  powerRankingTitleInput.setAttribute('placeholder', getPowerRankingWeekNameDisplay(currentWeek, selectedYearLeagueSettings.settings.scheduleSettings.matchupPeriodCount, matchupPeriods[matchupPeriods.length - 1]) + ' ' + selectedYear);
  powerRankingTitleInputCell.appendChild(powerRankingTitleInput);
  powerRankingTitleRow.appendChild(powerRankingTitleInputCell);
  powerRankingTable.innerHTML = powerRankingTitleRow.outerHTML;
  leagueDatabase.webdb.db.transaction((tx) => {
    tx.executeSql(query, [currentWeek, selectedYear],
      (tx, tr) => {
        var place = 1;
        if(tr.rows.length === 0) {
          //show managers by points scored
          let sortedArray = [];
          for(var teamKey in selectedYearLeagueSettings.teams) {
            sortedArray.push(selectedYearLeagueSettings.teams[teamKey]);
          }
          sortedArray.sort((a,b) => {
            if(a.record.pointsFor < b.record.pointsFor) return 1;
            else if(a.record.pointsFor > b.record.pointsFor) return -1;
            else return 0;
          })
          for(var i = 0; i < sortedArray.length; i++) {
            let oName = getOwnerName(sortedArray[i].primaryOwner); //sortedArray[i].owners[0].firstName.trim() + ' ' + sortedArray[i].owners[0].lastName.trim();
            const row = document.createElement('tr');
            const rankingCell = document.createElement('td');
            const managerCell = document.createElement('td');
            const descriptionCell = document.createElement('td');
            const descriptionInput = document.createElement('input');
            rankingCell.innerHTML = rankingToPlaceString(i+1) + ": ";
            managerCell.appendChild(generatePRManagerDropdown(place, oName));
            place += 1;
            descriptionInput.setAttribute('type','text');
            descriptionInput.setAttribute('data-name',oName)
            descriptionCell.appendChild(descriptionInput);
            row.appendChild(rankingCell);
            row.appendChild(managerCell);
            row.appendChild(descriptionCell);
            powerRankingTable.appendChild(row);
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
  const tempOwnerMap = {};
  teamArray.forEach((team) => {
    let ownerName = ''
    let owner = getOwnerName(team.primaryOwner);

    tempOwnerMap[team.primaryOwner] = owner;
  });
  return tempOwnerMap;
}

isValidPostSeasonMatchup = (periodId, champWeek) => {
  let tempIndex = periodIndex[periodId]; // weeks times the number of games a week (fails because of BYE weeks in playoffs)
  const matchupsTillFinal = champWeek - periodId;
  if(leagueLocalStorage.trackLosers) {
    return true;
  } else if(leagueLocalStorage.track3rdPlaceGame && matchupsTillFinal === 0) {
    return tempIndex < 2;
  } return tempIndex < Math.pow(2, matchupsTillFinal);
}

const addMatchupBoxscoreToDB = (matchup, index, periodId, pointerYear, seasonId, ownerLookup, hasNextMatchup, scheduleItems, currentLeagueSettings) => {
  if(!hasNextMatchup) {
    return;
  }
  let matchupPeriods = Object.keys(currentLeagueSettings.scheduleSettings.matchupPeriods);
  periodIndex[periodId] = (typeof periodIndex[periodId] === 'undefined') ? 0 : periodIndex[periodId] + 1;
  if(matchup.home && matchup.away) {
    if(periodId <= currentLeagueSettings.scheduleSettings.matchupPeriodCount || isValidPostSeasonMatchup(periodId, matchupPeriods[matchupPeriods.length - 1])) {

      // only if 2019 or later do we have boxscore details - consider nixing it - we have the override in extension options for previous record holders
      if(pointerYear > 2018) {
        var xhr = new XMLHttpRequest();

        //need to add x-fantasy-filter: {"schedule":{"filterMatchupPeriodIds":{"value":[1]}}}
        xhr.open("GET", `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${pointerYear}/segments/0/leagues/${leagueId}?view=mMatchup&view=mMatchupScore&scoringPeriodId=${periodId}`, true);
        xhr.setRequestHeader("x-fantasy-filter", JSON.stringify({"schedule":{"filterMatchupPeriodIds":{"value":[periodId]}}}));
        xhr.onload = (e) => {
          //no longer an html returned of one match - this is a data API for returning all matchup data for the week given
          let weekDetails = JSON.parse(xhr.responseText);
          let thisMatchup;
          //find game in schedule Array
          for(var i = 0; i < weekDetails.schedule.length; i++) {
            if(matchup.id === weekDetails.schedule[i].id) {
              thisMatchup = weekDetails.schedule[i];
            }
          }
          totalHistoryUpdates += thisMatchup.home.rosterForMatchupPeriod.entries.length;
          totalHistoryUpdates += thisMatchup.away.rosterForMatchupPeriod.entries.length;

          for(var i = 0; i < thisMatchup.away.rosterForMatchupPeriod.entries.length; i++) {
              let player = thisMatchup.away.rosterForMatchupPeriod.entries[i].playerPoolEntry.player;
              let playerName = player.firstName + ' ' + player.lastName;
              let playerPos = defaultPositions[player.defaultPositionId];
              let playerScore = thisMatchup.away.rosterForMatchupPeriod.entries[i].playerPoolEntry.appliedStatTotal;
              if(playerScore !== '--') {
                leagueDatabase.webdb.db.transaction((tx) => {
                  tx.executeSql("INSERT INTO history(manager, week, year, player, playerPosition, score) VALUES (?,?,?,?,?,?)",
                      [ownerLookup[memberMap[thisMatchup.away.teamId]] || memberMap[thisMatchup.away.teamId], periodId, seasonId, playerName, playerPos, playerScore], ()=>{
                        loadingDiv.innerHTML = 'Uploading History Record ' + historyUpdatesCompleted + ' of ' + totalHistoryUpdates;
                        historyUpdatesCompleted += 1;
                        if(totalHistoryUpdates === historyUpdatesCompleted) {
                          setTimeout(() => {
                            lastSync = lastDate;
                            leagueLocalStorage.lastSync = lastSync;
                            let saveState = {};
                            saveState[dbName] = leagueLocalStorage;
                            chrome.storage.sync.set(saveState, () => {
                              let dateParts = lastDate.split('-');
                              syncText.innerHTML = 'Week ' + dateParts[1] + ", Year " + dateParts[0];
                            });
                            alert("Database Update Complete")
                            enableButtons();
                          })
                        }
                      }, errorHandler);
                 });
              }

          }
          for(var i = 0; i < thisMatchup.home.rosterForMatchupPeriod.entries.length; i++) {
              let player = thisMatchup.home.rosterForMatchupPeriod.entries[i].playerPoolEntry.player;
              let playerName = player.firstName + ' ' + player.lastName;
              let playerPos = defaultPositions[player.defaultPositionId];
              let playerScore = thisMatchup.home.rosterForMatchupPeriod.entries[i].playerPoolEntry.appliedStatTotal;
              if(playerScore !== '--') {
                leagueDatabase.webdb.db.transaction((tx) => {
                  tx.executeSql("INSERT INTO history(manager, week, year, player, playerPosition, score) VALUES (?,?,?,?,?,?)",
                      [ownerLookup[memberMap[thisMatchup.home.teamId]] || memberMap[thisMatchup.home.teamId], periodId, seasonId, playerName, playerPos, playerScore], ()=>{
                        loadingDiv.innerHTML = 'Uploading History Record ' + historyUpdatesCompleted + ' of ' + totalHistoryUpdates;
                        historyUpdatesCompleted += 1;
                        if(totalHistoryUpdates === historyUpdatesCompleted) {
                          setTimeout(() => {
                            lastSync = lastDate;
                            leagueLocalStorage.lastSync = lastSync;
                            let saveState = {};
                            saveState[dbName] = leagueLocalStorage;
                            chrome.storage.sync.set(saveState, () => {
                              let dateParts = lastDate.split('-');
                              syncText.innerHTML = 'Week ' + dateParts[1] + ", Year " + dateParts[0];
                            });
                            alert("Database Update Complete")
                            enableButtons();
                          })
                        }
                      }, errorHandler);
                 });

               }
             }
          }
          xhr.send(null);
        }
          console.log(matchup);
          let homeScore = matchup.home.pointsByScoringPeriod[periodId];
          let awayScore = matchup.away.pointsByScoringPeriod[periodId];
          let awayOutcome = 3;
          let homeOutcome = 3;

          //figure out what is up with index - i dont think it means the same anymore'[-]
          let isThirdPlaceGame = false; // no longer show this as its in losers bracket
          let isChampionship = (periodId == matchupPeriods[matchupPeriods.length - 1]) ? true : false;
          let isLosersBacketGame = false;
          let homeTeamBonus = 2;
          if(matchup.winner === 'AWAY') {
            awayOutcome = 1;
            homeOutcome = 2;
          } else if(matchup.winner === 'HOME') {
            awayOutcome = 2;
            homeOutcome = 1;
          }
          // home team
          leagueDatabase.webdb.db.transaction((tx) => {
            tx.executeSql("INSERT INTO matchups(manager, week, year, vs, isHomeGame, winLoss, score, matchupTotal, pointDiff, isThirdPlaceGame, isChampionship, isLosersBacketGame) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                [ownerLookup[memberMap[matchup.home.teamId]] || memberMap[matchup.home.teamId], periodId, seasonId, ownerLookup[memberMap[matchup.away.teamId]] || memberMap[matchup.away.teamId], true, homeOutcome, (homeScore + homeTeamBonus), (awayScore + homeScore + homeTeamBonus), ((homeScore + homeTeamBonus) - awayScore), isThirdPlaceGame, isChampionship, isLosersBacketGame], ()=>{}, errorHandler);
           });
          // away team
          leagueDatabase.webdb.db.transaction((tx) => {
            tx.executeSql("INSERT INTO matchups(manager, week, year, vs, isHomeGame, winLoss, score, matchupTotal, pointDiff, isThirdPlaceGame, isChampionship, isLosersBacketGame) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                [ownerLookup[memberMap[matchup.away.teamId]] || memberMap[matchup.away.teamId], periodId, seasonId, ownerLookup[memberMap[matchup.home.teamId]] || memberMap[matchup.home.teamId], false, awayOutcome, awayScore, (awayScore + homeScore + homeTeamBonus), (awayScore - (homeScore + homeTeamBonus)), isThirdPlaceGame, isChampionship, isLosersBacketGame],
              (tx, tr) => {
                loadingDiv.innerHTML = 'Uploading Matchup ' + periodId + ', Year ' + pointerYear;
              }, errorHandler);
           });
           if(hasNextMatchup) {
             let matchup = scheduleItems.shift();
             addMatchupBoxscoreToDB(matchup, ++index, matchup.matchupPeriodId, pointerYear, seasonId, ownerLookup, scheduleItems.length > 0, scheduleItems, currentLeagueSettings);
           }

    } else if(hasNextMatchup) {
      let matchup = scheduleItems.shift();
      addMatchupBoxscoreToDB(matchup, ++index, matchup.matchupPeriodId, pointerYear, seasonId, ownerLookup, scheduleItems.length > 0, scheduleItems, currentLeagueSettings);
    }
  } else {
    // doesnt have two teams in the game so it isnt valid
    let matchup = scheduleItems.shift();
    //indexModifier[periodId] = (indexModifier[periodId]) ? indexModifier[periodId] + 1 : 1;
    addMatchupBoxscoreToDB(matchup, ++index, matchup.matchupPeriodId, pointerYear, seasonId, ownerLookup, scheduleItems.length > 0, scheduleItems, currentLeagueSettings);
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
    periodIndex = {};

    if(yearPointer === currentYear) {
      xhr.open("GET", `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${yearPointer}/segments/0/leagues/${leagueId}?view=mLiveScoring&view=mMatchupScore&view=mRoster&view=mSettings&view=mStandings&view=mStatus&view=mTeam&view=modular&view=mNav`, false);
    } else if(yearPointer < 2018) {
      xhr.open("GET", `https://fantasy.espn.com/apis/v3/games/ffl/leagueHistory/${leagueId}?view=mLiveScoring&view=mMatchupScore&view=mRoster&view=mSettings&view=mStandings&view=mStatus&view=mTeam&view=modular&view=mNav&seasonId=${yearPointer}`, false);
    } else {
      xhr.open("GET", `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${yearPointer}/segments/0/leagues/${leagueId}?view=mSettings&view=mTeam&view=modular&view=mNav`, false);
    }


    xhr.send();
    leagueSettings = (yearPointer < 2018) ? JSON.parse(xhr.responseText)[0].settings : JSON.parse(xhr.responseText).settings;
    settingsMap[yearPointer] = leagueSettings;
    if(!leagueSettings) {
      alert("Private League. API request denied.");
    }

    //get team info for the year to match with ids later
    var teamInfo = (yearPointer < 2018) ? JSON.parse(xhr.responseText)[0].teams : JSON.parse(xhr.responseText).teams;
    const ownerMap = parseTeams(teamInfo);

    var leagueSchedule = (yearPointer < 2018) ? JSON.parse(xhr.responseText)[0].settings.scheduleSettings : JSON.parse(xhr.responseText).settings.scheduleSettings;

    let seasonId = (yearPointer < 2018) ? JSON.parse(xhr.responseText)[0].seasonId : JSON.parse(xhr.responseText).seasonId;
    let scheduleItems;
    if(yearPointer === currentYear) {
      xhr.open("GET", `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${yearPointer}/segments/0/leagues/${leagueId}?view=mLiveScoring&view=mMatchupScore&view=mRoster&view=mSettings&view=mStandings&view=mStatus&view=mTeam&view=modular&view=mNav`, false);
      xhr.send();

      scheduleItems = JSON.parse(xhr.responseText).schedule;
    } else {
      xhr.open("GET", `https://fantasy.espn.com/apis/v3/games/ffl/leagueHistory/${leagueId}?seasonId=${yearPointer}&view=mMatchup`, false);
      xhr.send();

      scheduleItems = JSON.parse(xhr.responseText)[0].schedule;
    }

    let week = scheduleItems.shift();
    if(initialRun) {
      // check for current week
      while(weekPointer !== week.matchupPeriodId) {
        week = scheduleItems.shift();
      }
      //weekPointer = week.matchupPeriodId;
      if(currentYear == yearPointer && currentWeek == weekPointer) {
        alert("Database Update Complete")
        enableButtons();
        return true;
      }
    } else if(currentYear == yearPointer && currentWeek == weekPointer) {
      let matchupPeriods = Object.keys(settingsMap[yearPointer - 1].scheduleSettings.matchupPeriods);
      lastDate = (weekPointer === 1) ? "" + (yearPointer - 1) + "-" + matchupPeriods[matchupPeriods.length -  1] : "" + (yearPointer) + "-" + (weekPointer - 1);
      return true;
    }
    initialRun = false;
    addMatchupBoxscoreToDB(week, 0, weekPointer, yearPointer, seasonId, ownerMap, scheduleItems.length > 0, scheduleItems, leagueSettings);
  }
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
  noOwnerCount = 0;
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
  for(var team of teamMap) {
      let oName = getOwnerName(team.primaryOwner);
      if(oName === ownerName) {
        return {
          wins: team.record.overall.wins,
          losses: team.record.overall.losses,
          ties: team.record.overall.ties,
          image: team.logo,
          teamName: team.location + ' ' + team.nickname
        };
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
        saveWeeklyPowerRanking(weeklyPowerRankingClone, powerRankingTitle, weeklyPowerRanking, generatePowerRanking, onReady);
      }, errorHandler);
  });
}

const stripLinks = (s) => {
  var div = document.createElement('div');
  div.innerHTML = s;
  var links = div.getElementsByTagName('a');
  var i = links.length;
  while (i--) {
    let innerText = links[i].innerHTML;
    links[i].parentNode.prepend(innerText);
    links[i].parentNode.removeChild(links[i]);
  }
  return div.innerHTML;
}

const stripImgs = (s) => {
  var div = document.createElement('div');
  div.innerHTML = s;
  var imgs = div.getElementsByTagName('img');
  var i = imgs.length;
  while (i--) {
    imgs[i].parentNode.removeChild(imgs[i]);
  }
  return div.innerHTML;
}

const getPlayerTable = (s) => {
  var div = document.createElement('div');
  div.innerHTML = s;
  var tables = div.getElementsByTagName('table');
  var i = tables.length;
  let tableList = [];
  while (i--) {
    if(tables[i].classList.contains('Table') && !tables[i].classList.contains('hideableGroup')) {
      tableList.push(tables[i]);
    }
  }
  return tableList;
}
