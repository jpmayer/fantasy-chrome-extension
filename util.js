/*
* Retrieves the sacko holder for any given year
*/
const getSacko = (db, year, callback) => {
  let query = "SELECT manager, year, week, winLoss, score FROM matchups WHERE year = ? AND week < 14 ORDER BY manager ASC, year ASC, week ASC";
  var db = html5rocks.webdb.db;
  db.transaction((tx) => {
    tx.executeSql(query, [year],
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
            if(ownerMap[owner].gamesPlayed === 13) {
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
      (tx, err) => {
        console.log("ERROR IN SQL GETSACKO", err);
      });
  });
}

/*
* Return League Champion for Given Year
*/
const getChampion = (db, year, callback) => {
  let query = 'SELECT manager, year, week, winLoss, score FROM matchups WHERE year = ? AND week = 16 AND winLoss = 1 ORDER BY manager ASC, year ASC, week ASC';
  db.transaction((tx) => {
    tx.executeSql(query, [year],
      (tx, rs) => {
        console.log(rs);
        if(rs.rows.length === 0) {
          callback(null);
        } else {
          callback(rs.rows[0]);
        }
      })
  })
}

/*
* Return the Number of Playoff Appearences for a given Manager
*/
const getPlayoffAppearences = (db, manager, callback) => {
  let query = 'SELECT DISTINCT manager, year FROM matchups WHERE manager = ? AND week > 13 ORDER BY year ASC, week ASC';
  db.transaction((tx) => {
    tx.executeSql(query, [manager],
      (tx, rs) => {
        callback(rs.rows.length);
      })
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
      })
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
      });
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
      })
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

const getSackos = (database, yearsActive, callback) => {
  const sackos = [];
  yearsActive.forEach((year, index) => {
    getSacko(database, year, (sacko) => {
      sackos.push(sacko);
      if(index === yearsActive.length - 1) {
        callback(sackos);
      }
    });
  });
}

const getChampionships = (database, yearsActive, callback) => {
  const champions = [];
  yearsActive.forEach((year, index) => {
    getChampion(database, year, (champ) => {
      champions.push(champ);
      if(index === yearsActive.length - 1) {
        callback(champions);
      }
    });
  });
}

const getAllManagersPlayoffAppearences = (database, managerList, callback) => {
  const playoffApps = {};
  managerList.forEach((manager, index) => {
    getPlayoffAppearences(database, manager, (numPlayoffApp) => {
      playoffApps[manager] = numPlayoffApp;
      if(index === managerList.length - 1) {
        callback(playoffApps);
      }
    });
  });
}

const getAllManagersPoints = (database, managerList, callback) => {
  const pointsScored = {};
  managerList.forEach((manager, index) => {
    getPoints(database, manager, (pointsObject) => {
      console.log(pointsObject);
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

const getAllTimeLeaderBoard = (recordArray, callback) => {
  let thresholdReached = false;
  let resultString = "<div id='winLeaders'>";
  resultString = resultString + "<table class='win-leader-table'>";
  resultString = resultString + "<tr><th colspan='12'><h3>All Time Leader Board</h3></th></tr>";
  resultString = resultString + "<tr class='leader-header'><td><b></b></td><td><b>Holder</b></td><td><b>Wins</b></td><td><b>Losses</b></td><td><b>Ties</b></td><td><b>Win %</b></td><td><b>Points</b></td><td><b>PPG</b></td><td><b>Diff</b></td><td><b>Titles</b></td><td><b>Sackos</b></td><td><b>Pl App</b></td></tr>";
  for(var i = 0; i < recordArray.length; i++){
    let trophyString = '', sackoString = '';
    let pointDiff = (recordArray[i].pointDiff > 0) ? "+" + recordArray[i].pointDiff.toFixed(1) : recordArray[i].pointDiff.toFixed(1);
    if(recordArray[i].sackos > 0) {
      let poopURL = chrome.extension.getURL("images/poop.png");
      for(var s = 0; s < recordArray[i].sackos; s++) {
        sackoString = sackoString + "<img src='"+ poopURL +"' height='16px' style='position:relative;top:3px'/>";
      }
    }
    if(recordArray[i].championships > 0) {
      let trophyURL = chrome.extension.getURL("images/trophy.png");
      for(var c = 0; c < recordArray[i].championships; c++) {
        trophyString = trophyString + "<img src='"+ trophyURL +"' height='16px' style='position:relative;top:3px'/>";
      }
    }
    if(recordArray[i].winPercentage < 50 && !thresholdReached) {
      resultString = resultString + "<tr class='acunaRow' title='The Threshold to Measure How Good Your Team Truly is.'> <td colspan='12' class='acuna'><b>The Acuna Line<b></td></tr>";
      thresholdReached = true;
    }
    resultString = resultString + "<tr class='row'> <td class='place'>" + (i + 1) + ". </td><td>" + recordArray[i].manager + "</td><td>" + recordArray[i].wins + "</td><td>" + recordArray[i].losses + "</td><td>" + recordArray[i].ties + "</td><td>" + recordArray[i].winPercentage.toFixed(1) + "%</td><td>" + recordArray[i].pointsScored.toFixed(1) + "</td><td>" + recordArray[i].pointsPer.toFixed(1) + "</td><td>" + pointDiff + "</td><td>" + trophyString + "</td><td>" + sackoString + "</td><td>" + recordArray[i].playoffApps + "</td></tr>"
  }
  resultString = resultString + "</table></div>"
  resultString = resultString + "<style>"
  resultString = resultString + "#winLeaders{position:relative;margin-left:auto;margin-right:auto;}"
  resultString = resultString + ".win-leader-table{width:100%;border:0px solid black; font-size:12px;position:relative;text-align:center;}"
  resultString = resultString + ".win-leader-table th{width:500px;background-color:#1D7225;color:white;}"
  resultString = resultString + ".place{width:20px;padding-left:5px;padding-top:5px}"
  resultString = resultString + ".row:nth-child(odd) {background-color:#F2F2E8;}"
  resultString = resultString + ".row:nth-child(even) {background-color:#F8F8F2;}"
  resultString = resultString + ".leader-header{background-color:#6DBB75;}"
  resultString = resultString + ".acunaRow{background-color:#e35e52;}"
  resultString = resultString + ".acuna{font-size: 7px;line-height: 7px;color: white;}"
  resultString = resultString + "#winLeader td b{padding-left:4px;padding-right:4px;}"
  resultString = resultString + "</style>"
  console.log(resultString);
  callback(resultString);
}
