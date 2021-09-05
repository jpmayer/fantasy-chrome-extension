const errorHandler = (transaction, error) => {
  alert("Error processing SQL: "+ error.message);
  return true;
}

const getLeagueSettings = (yearList, leagueId) => {
  const leagueSettingsMap = {};
  yearList.forEach((year) => {
    var xhr = new XMLHttpRequest();
    if(year === currentYear) {
      xhr.open("GET", `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mLiveScoring&view=mMatchupScore&view=mRoster&view=mSettings&view=mStandings&view=mStatus&view=mTeam&view=modular&view=mNav`, false);
    } else if(year < 2018) {
      xhr.open("GET", `https://fantasy.espn.com/apis/v3/games/ffl/leagueHistory/${leagueId}?view=mLiveScoring&view=mMatchupScore&view=mRoster&view=mSettings&view=mStandings&view=mStatus&view=mTeam&view=modular&view=mNav&seasonId=${year}`, false);
    } else {
      xhr.open("GET", `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mSettings&view=mTeam&view=modular&view=mNav`, false);
    }


    xhr.send();
    leagueSettingsMap[year] = (year < 2018) ? JSON.parse(xhr.responseText)[0].settings : JSON.parse(xhr.responseText).settings;
  });
  return leagueSettingsMap;
}

const getPowerRankingWeekNameDisplay = (currentWeek, finalRegSeasonGame, champGame) => {
  if(currentWeek == 1) {
    return 'Preseason';
  } else if(currentWeek <= (finalRegSeasonGame + 1)) {
    return 'Week ' + (currentWeek - 1);
  } else {
    var title = '';
    switch(champGame - currentWeek) {
      case 3: title = 'Round of 32'; break;
      case 2: title = 'Round of 16'; break;
      case 1: title = 'Quarterfinals'; break;
      case 0: title = 'Semifinal'; break;
      default: title =  'Championship';
    }
    return title;
  }
}

/*
* Retrieves the sacko holder for any given year
*/
const getSacko = (db, year, leagueSettings, callback) => {
  let query = "SELECT manager, year, week, winLoss, score FROM matchups WHERE year = ? AND week <= ? ORDER BY manager ASC, year ASC, week ASC";
  var db = leagueDatabase.webdb.db;
  // get sacko overrides from local storage
  chrome.storage.sync.get(['league-' + leagueId], (response) => {
    console.log(response)
    const leagueDict = response['league-' + leagueId];
    const sackoMap = (leagueDict.sackoMap) ? leagueDict.sackoMap : {};
    if(sackoMap[year]) {
      callback({
        'manager': sackoMap[year],
        'count': 0,
        'score': 0,
        'gamesPlayed': 17
      });
    } else {
      db.transaction((tx) => {
        tx.executeSql(query, [year, leagueSettings.scheduleSettings.matchupPeriodCount],
          (tx, rs) => {
            const ownerMap = {};
            for(var i = 0; i < rs.rows.length; i++) {
              let row = rs.rows[i];
              let count = 0; // loss
              if(row.winLoss === 1) {
                // win
                count += 1;
              } else if(row.winLoss === 3) {
                // draw
                count += .5;
              }
              if(row.manager in ownerMap) {
                ownerMap[row.manager] = {
                  'manager': row.manager,
                  'count': ownerMap[row.manager].count + count,
                  'score': ownerMap[row.manager].score + row.score,
                  'gamesPlayed': ownerMap[row.manager].gamesPlayed + 1
                }
              } else {
                ownerMap[row.manager] = {
                  'manager': row.manager,
                  'count': count,
                  'score': row.score,
                  'gamesPlayed': 1
                }
              }
            }
            let sacko = {
              'count': 9999,
              'score': 9999,
              'gamesPlayed': 13,
              'manager': 'Sacko'
            }
            for (var owner in ownerMap) {
              if (ownerMap.hasOwnProperty(owner)) {
                if(ownerMap[owner].gamesPlayed === leagueSettings.scheduleSettings.matchupPeriodCount) {
                  if(ownerMap[owner].count < sacko.count) {
                    sacko = ownerMap[owner];
                  } else if (ownerMap[owner].count === sacko.count) {
                    if(ownerMap[owner].score < sacko.score) {
                      sacko = ownerMap[owner];
                    }
                  }
                }
              }
            }
            callback(sacko);
          },
          errorHandler);
      });
    }
  });
}

/*
* Return League Champion for Given Year
*/
const getChampion = (db, year, leagueSettings, callback) => {
  let query = 'SELECT manager, year, week, winLoss, score, isThirdPlaceGame, isChampionship FROM matchups WHERE year = ? AND week = ? AND winLoss = 1 AND isThirdPlaceGame = "false" AND isChampionship = "true" ORDER BY manager ASC, year ASC, week ASC';
  db.transaction((tx) => {
    console.log(leagueSettings);
    let matchupPeriods = Object.keys(leagueSettings.scheduleSettings.matchupPeriods);
    console.log(matchupPeriods, leagueSettings)
    tx.executeSql(query, [year, matchupPeriods[matchupPeriods.length - 1]],
      (tx, rs) => {
        if(rs.rows.length === 0) {
          callback(null);
        } else {
          callback(rs.rows[0]);
        }
      }, errorHandler)
  })
}

/*
*
*/
const didAppearInPlayoffs = (db, manager, year, leagueSettings, callback) => {
  let query = 'SELECT DISTINCT manager, year, isLosersBacketGame FROM matchups WHERE manager = ? AND year = ? AND week > ? AND isLosersBacketGame = "false" ORDER BY year ASC, week ASC';
  db.transaction((tx) => {
    tx.executeSql(query, [manager, year, leagueSettings.scheduleSettings.matchupPeriodCount],
      (tx, rs) => {
        callback((rs.rows.length > 0));
      }, errorHandler)
  })
}

/*
* Return the Points, ppg, and point differential for a given manager
*/
const getPoints = (db, manager, callback) => {
  let query = 'SELECT sum(score) AS scoreSum, sum(pointDiff) As pointDiffSum, count(score) as numGame FROM matchups WHERE manager = ?';
  db.transaction((tx) => {
    tx.executeSql(query, [manager],
      (tx, rs) => {
        let ppg = 0;
        if(rs.rows[0].numGame > 0) {
          ppg = (rs.rows[0].scoreSum / rs.rows[0].numGame);
        }
        callback({
          total: rs.rows[0].scoreSum,
          pointDiff: rs.rows[0].pointDiffSum,
          pointsPer: ppg
        });
      }, errorHandler)
  })
}

const getManagers = (db, callback) => {
  let query = 'SELECT DISTINCT manager FROM matchups';
  db.transaction((tx) => {
    tx.executeSql(query, [],
      (tx, rs) => {
        const managerList = [];
        for(var i=0; i<rs.rows.length; i++) {
          managerList.push(rs.rows[i].manager);
        }
        callback(managerList);
      }, errorHandler);
    });
}

const getManagersForYear = (db, year, callback) => {
  let query = 'SELECT DISTINCT manager, year FROM matchups WHERE year = ?';
  db.transaction((tx) => {
    tx.executeSql(query, [year],
      (tx, rs) => {
        const managerList = [];
        for(var i=0; i<rs.rows.length; i++) {
          managerList.push(rs.rows[i].manager);
        }
        callback(managerList);
      }, errorHandler);
    });
}

/*
* Return record for given manager
*/
const getRecord = (db, manager, callback) => {
  let query = 'SELECT manager, year, week, winLoss FROM matchups WHERE manager = ? ORDER BY year ASC, week ASC';
  let wins = 0, losses = 0, ties = 0;
  db.transaction((tx) => {
    tx.executeSql(query, [manager],
      (tx, rs) => {
        for(var i=0; i<rs.rows.length; i++) {
          let game = rs.rows[i];
          if(game.winLoss === 1) {
            wins = wins + 1
          } else if(game.winLoss === 2) {
            losses = losses + 1
          } else {
            ties = ties + 1;
          }
        }
        const winPercentage = (wins + losses + ties === 0) ? 0 : ((wins + .5 * ties ) * 100 / (wins + losses + ties));
        if(callback){
          callback({
            manager: manager,
            wins: wins,
            losses: losses,
            ties: ties,
            winPercentage: winPercentage
          });
        }
        return {
          manager: manager,
          wins: wins,
          losses: losses,
          ties: ties,
          winPercentage: winPercentage
        };
      }, errorHandler)
  })
}

const getRecords = (database, managerList, callback) => {
  const records = [];
  managerList.forEach((manager, index) => {
    getRecord(database, manager, (record) => {
      records.push(record);
      if(index === managerList.length - 1) {
        records.sort((a,b) => {
          if(a.winPercentage == b.winPercentage)
            return 0;
          if(a.winPercentage > b.winPercentage)
            return -1;
          if(a.winPercentage < b.winPercentage)
            return 1;
        })
        callback(records);
      }
    });
  });
}

const getSackos = (database, yearsActive, leagueSettingsMap, callback) => {
  const sackos = [];
  yearsActive.forEach((year, index) => {
    getSacko(database, year, leagueSettingsMap[year], (sacko) => {
      sackos.push(sacko);
      if(index === yearsActive.length - 1) {
        callback(sackos);
      }
    });
  });
}

const getChampionships = (database, yearsActive, leagueSettingsMap, callback) => {
  const champions = [];
  yearsActive.forEach((year, index) => {
    getChampion(database, year, leagueSettingsMap[year], (champ) => {
      champions.push(champ);
      if(index === yearsActive.length - 1) {
        callback(champions);
      }
    });
  });
}

const getAllManagersPlayoffAppearences = (database, managerList, yearsActive, leagueSettingsMap, callback) => {
  const playoffApps = {};
  managerList.forEach((manager, index) => {
    playoffApps[manager] = 0;
    yearsActive.forEach((year, yearIndex) => {
      didAppearInPlayoffs(database, manager, year, leagueSettingsMap[year], (yearPlayoffCount) => { // 1 or 0
        playoffApps[manager] = playoffApps[manager] + yearPlayoffCount;
        if(index === managerList.length - 1 && yearIndex === yearsActive.length - 1) {
          callback(playoffApps);
        }
      });
    });
  });
}

const getAllManagersPoints = (database, managerList, callback) => {
  const pointsScored = {};
  managerList.forEach((manager, index) => {
    getPoints(database, manager, (pointsObject) => {
      pointsScored[manager] = pointsObject;
      if(index === managerList.length - 1) {
        callback(pointsScored);
      }
    });
  });
}

const yearRangeGenerator = (start, end) => {
  return [...Array(1+end-start).keys()].map(v => start+v)
}

const getSackoNumber = (manager, sackos) => {
  let numSackos = 0;
  sackos.forEach((sacko) => {
    if(sacko.manager === manager) { numSackos++; }
  });
  return numSackos;
}

const getChampionshipNumber = (manager, championships) => {
  let numChamps = 0;
  championships.forEach((champ) => {
    if(champ && champ.manager === manager) { numChamps++; }
  });
  return numChamps;
}

const mergeDataIntoRecords = (records, sackos, champions, playoffApps, points) => {
  records.forEach((record) => {
    let manager = record.manager;
    record['sackos'] = getSackoNumber(manager, sackos);
    record['championships'] = getChampionshipNumber(manager, champions);
    record['playoffApps'] = playoffApps[manager];
    record['pointsScored'] = points[manager].total;
    record['pointsPer'] = points[manager].pointsPer;
    record['pointDiff'] = points[manager].pointDiff;
  });
  return records;
}

const getAllTimeLeaderBoard = (recordArray, leagueSettings, callback) => {
  // get sacko overrides from local storage
  chrome.storage.sync.get(['league-' + leagueId], (response) => {
    const leagueDict = response['league-' + leagueId];
    let thresholdReached = leagueDict.hideAverageLine;
    const lastPlaceName = (leagueDict.lastPlaceName) ? leagueDict.lastPlaceName : 'Sackos';
    let resultString = "<div id='winLeaders'>";
    resultString = resultString + "<table class='win-leader-table' cellspacing='2'>";
    resultString = resultString + "<tr><th colspan='12'><h3>All Time Leader Board</h3></th></tr>";
    resultString = resultString + `<tr class='leader-header'><td><b></b></td><td><b>Holder</b></td><td><b>Wins</b></td><td><b>Losses</b></td><td><b>Ties</b></td><td><b>Win %</b></td><td><b>Points</b></td><td><b>PPG</b></td><td><b>Diff</b></td><td><b>Titles</b></td><td><b>${lastPlaceName}</b></td><td><b>Pl App</b></td></tr>`;
    for(var i = 0; i < recordArray.length; i++){
      let trophyString = '', sackoString = '';
      let managerName = (leagueDict.managerMap && leagueDict.managerMap[recordArray[i].manager]) ? leagueDict.managerMap[recordArray[i].manager] : recordArray[i].manager;
      let pointDiff = (recordArray[i].pointDiff > 0) ? "+" + recordArray[i].pointDiff.toFixed(1) : recordArray[i].pointDiff.toFixed(1);
      if(recordArray[i].sackos > 0) {
        if(leagueDict.areIconsCollapsed) {
          if (recordArray[i].sackos === 1) {
            sackoString = sackoString + '<svg aria-hidden="true" data-prefix="fas" data-icon="poo" height="12px" class="svg-inline--fa fa-poo fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#8b4513" d="M451.4 369.1C468.7 356 480 335.4 480 312c0-39.8-32.2-72-72-72h-14.1c13.4-11.7 22.1-28.8 22.1-48 0-35.3-28.7-64-64-64h-5.9c3.6-10.1 5.9-20.7 5.9-32 0-53-43-96-96-96-5.2 0-10.2.7-15.1 1.5C250.3 14.6 256 30.6 256 48c0 44.2-35.8 80-80 80h-16c-35.3 0-64 28.7-64 64 0 19.2 8.7 36.3 22.1 48H104c-39.8 0-72 32.2-72 72 0 23.4 11.3 44 28.6 57.1C26.3 374.6 0 404.1 0 440c0 39.8 32.2 72 72 72h368c39.8 0 72-32.2 72-72 0-35.9-26.3-65.4-60.6-70.9zM192 256c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32zm159.5 139C341 422.9 293 448 256 448s-85-25.1-95.5-53c-2-5.3 2-11 7.8-11h175.4c5.8 0 9.8 5.7 7.8 11zM320 320c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"></path></svg>'
          } else {
            sackoString = sackoString + '<svg aria-hidden="true" data-prefix="fas" data-icon="poo" height="12px" class="svg-inline--fa fa-poo fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#8b4513" d="M451.4 369.1C468.7 356 480 335.4 480 312c0-39.8-32.2-72-72-72h-14.1c13.4-11.7 22.1-28.8 22.1-48 0-35.3-28.7-64-64-64h-5.9c3.6-10.1 5.9-20.7 5.9-32 0-53-43-96-96-96-5.2 0-10.2.7-15.1 1.5C250.3 14.6 256 30.6 256 48c0 44.2-35.8 80-80 80h-16c-35.3 0-64 28.7-64 64 0 19.2 8.7 36.3 22.1 48H104c-39.8 0-72 32.2-72 72 0 23.4 11.3 44 28.6 57.1C26.3 374.6 0 404.1 0 440c0 39.8 32.2 72 72 72h368c39.8 0 72-32.2 72-72 0-35.9-26.3-65.4-60.6-70.9zM192 256c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32zm159.5 139C341 422.9 293 448 256 448s-85-25.1-95.5-53c-2-5.3 2-11 7.8-11h175.4c5.8 0 9.8 5.7 7.8 11zM320 320c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"></path></svg>'+'<span class="icon-number" style="left: 2px;">x'+(recordArray[i].sackos)+"</span>";
          }
        } else {
          for(var s = 0; s < recordArray[i].sackos; s++) {
            sackoString = sackoString + '<svg aria-hidden="true" data-prefix="fas" data-icon="poo" height="12px" class="svg-inline--fa fa-poo fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#8b4513" d="M451.4 369.1C468.7 356 480 335.4 480 312c0-39.8-32.2-72-72-72h-14.1c13.4-11.7 22.1-28.8 22.1-48 0-35.3-28.7-64-64-64h-5.9c3.6-10.1 5.9-20.7 5.9-32 0-53-43-96-96-96-5.2 0-10.2.7-15.1 1.5C250.3 14.6 256 30.6 256 48c0 44.2-35.8 80-80 80h-16c-35.3 0-64 28.7-64 64 0 19.2 8.7 36.3 22.1 48H104c-39.8 0-72 32.2-72 72 0 23.4 11.3 44 28.6 57.1C26.3 374.6 0 404.1 0 440c0 39.8 32.2 72 72 72h368c39.8 0 72-32.2 72-72 0-35.9-26.3-65.4-60.6-70.9zM192 256c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32zm159.5 139C341 422.9 293 448 256 448s-85-25.1-95.5-53c-2-5.3 2-11 7.8-11h175.4c5.8 0 9.8 5.7 7.8 11zM320 320c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"></path></svg>';
          }
        }

      }
      if(recordArray[i].championships > 0) {
        if(leagueDict.areIconsCollapsed) {
          if (recordArray[i].championships === 1) {
            trophyString = trophyString + '<svg aria-hidden="true" data-prefix="fas" data-icon="trophy" height="12px" width="12px" class="svg-inline--fa fa-trophy fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="#d0b107" d="M552 64H448V24c0-13.3-10.7-24-24-24H152c-13.3 0-24 10.7-24 24v40H24C10.7 64 0 74.7 0 88v56c0 35.7 22.5 72.4 61.9 100.7 31.5 22.7 69.8 37.1 110 41.7C203.3 338.5 240 360 240 360v72h-48c-35.3 0-64 20.7-64 56v12c0 6.6 5.4 12 12 12h296c6.6 0 12-5.4 12-12v-12c0-35.3-28.7-56-64-56h-48v-72s36.7-21.5 68.1-73.6c40.3-4.6 78.6-19 110-41.7 39.3-28.3 61.9-65 61.9-100.7V88c0-13.3-10.7-24-24-24zM99.3 192.8C74.9 175.2 64 155.6 64 144v-16h64.2c1 32.6 5.8 61.2 12.8 86.2-15.1-5.2-29.2-12.4-41.7-21.4zM512 144c0 16.1-17.7 36.1-35.3 48.8-12.5 9-26.7 16.2-41.8 21.4 7-25 11.8-53.6 12.8-86.2H512v16z"></path></svg>';
          } else {
            trophyString = trophyString + '<svg aria-hidden="true" data-prefix="fas" data-icon="trophy" height="12px" width="12px" class="svg-inline--fa fa-trophy fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="#d0b107" d="M552 64H448V24c0-13.3-10.7-24-24-24H152c-13.3 0-24 10.7-24 24v40H24C10.7 64 0 74.7 0 88v56c0 35.7 22.5 72.4 61.9 100.7 31.5 22.7 69.8 37.1 110 41.7C203.3 338.5 240 360 240 360v72h-48c-35.3 0-64 20.7-64 56v12c0 6.6 5.4 12 12 12h296c6.6 0 12-5.4 12-12v-12c0-35.3-28.7-56-64-56h-48v-72s36.7-21.5 68.1-73.6c40.3-4.6 78.6-19 110-41.7 39.3-28.3 61.9-65 61.9-100.7V88c0-13.3-10.7-24-24-24zM99.3 192.8C74.9 175.2 64 155.6 64 144v-16h64.2c1 32.6 5.8 61.2 12.8 86.2-15.1-5.2-29.2-12.4-41.7-21.4zM512 144c0 16.1-17.7 36.1-35.3 48.8-12.5 9-26.7 16.2-41.8 21.4 7-25 11.8-53.6 12.8-86.2H512v16z"></path></svg>'+'<span class="icon-number">x'+recordArray[i].championships+"</span>";
          }
        } else {
          for(var c = 0; c < recordArray[i].championships; c++) {
            trophyString = trophyString + '<svg aria-hidden="true" data-prefix="fas" data-icon="trophy" height="12px" width="12px" class="svg-inline--fa fa-trophy fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="#d0b107" d="M552 64H448V24c0-13.3-10.7-24-24-24H152c-13.3 0-24 10.7-24 24v40H24C10.7 64 0 74.7 0 88v56c0 35.7 22.5 72.4 61.9 100.7 31.5 22.7 69.8 37.1 110 41.7C203.3 338.5 240 360 240 360v72h-48c-35.3 0-64 20.7-64 56v12c0 6.6 5.4 12 12 12h296c6.6 0 12-5.4 12-12v-12c0-35.3-28.7-56-64-56h-48v-72s36.7-21.5 68.1-73.6c40.3-4.6 78.6-19 110-41.7 39.3-28.3 61.9-65 61.9-100.7V88c0-13.3-10.7-24-24-24zM99.3 192.8C74.9 175.2 64 155.6 64 144v-16h64.2c1 32.6 5.8 61.2 12.8 86.2-15.1-5.2-29.2-12.4-41.7-21.4zM512 144c0 16.1-17.7 36.1-35.3 48.8-12.5 9-26.7 16.2-41.8 21.4 7-25 11.8-53.6 12.8-86.2H512v16z"></path></svg>';
          }
        }

      }

      if(recordArray[i].winPercentage < 50 && !thresholdReached) {
        const lineName = (leagueDict.averageLineName) ? leagueDict.averageLineName : 'The Threshold of Mediocrity';
        resultString = resultString + `<tr class='acunaRow' title='The Threshold to Measure How Good Your Team Truly is.'> <td colspan='12' class='acuna'><b>${lineName}<b></td></tr>`;
        thresholdReached = true;
      }
      resultString = resultString + "<tr class='row'> <td class='place'>" + (i + 1) + ". </td><td>" + managerName + "</td><td>" + recordArray[i].wins + "</td><td>" + recordArray[i].losses + "</td><td>" + recordArray[i].ties + "</td><td>" + recordArray[i].winPercentage.toFixed(1) + "%</td><td>" + recordArray[i].pointsScored.toFixed(1) + "</td><td>" + recordArray[i].pointsPer.toFixed(1) + "</td><td>" + pointDiff + "</td><td>" + trophyString + "</td><td>" + sackoString + "</td><td>" + recordArray[i].playoffApps + "</td></tr>"
    }
    resultString = resultString + "</table></div>";
    callback(resultString);
  });
}
