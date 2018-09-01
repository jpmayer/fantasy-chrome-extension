const getMostPointsGame = (db, callback) => {
  let query = "SELECT manager, score, year, week, vs FROM matchups ORDER BY score DESC LIMIT 1"
  db.transaction((tx) => {
      tx.executeSql(query, [],
        (tx, rs) => {
          if(rs.rows.length === 0) {
            callback(null);
          } else {
            callback(rs.rows[0]);
          }
        });
  });
}

const getMostPointsSeason = (db, leagueSettings, callback) => {
  let query = "SELECT manager, score, year, week FROM matchups"
  db.transaction((tx) => {
      tx.executeSql(query, [],
        (tx, rs) => {
          if(rs.rows.length === 0) {
            callback(null);
          } else {
            var scoreMap = new Map();
            for(var i=0; i<rs.rows.length; i++) {
              if(rs.rows[i].week < leagueSettings[rs.rows[i].year].finalRegularSeasonMatchupPeriodId+1){
                //var key = { manager: rs.rows[i].manager, year: rs.rows[i].year };
                var key = rs.rows[i].manager + "-" + rs.rows[i].year;
                if (scoreMap.has(key)) {
                  var old = scoreMap.get(key);
                  scoreMap.set(key, parseFloat(old) + parseFloat(rs.rows[i].score));
                } else {
                  scoreMap.set(key, parseFloat(rs.rows[i].score));
                }
              }
            }
            var maxEntry = { score: -Infinity };
            for(let [k, v] of scoreMap){
              if(maxEntry.score < parseFloat(v)){
                  maxEntry.score = parseFloat(v);
                  maxEntry.manager = k.split("-")[0];
                  maxEntry.year = k.split("-")[1];
              }
            }
            callback(maxEntry);
          }
        });
  });
}

const getMostPointsMatchup = (db, callback) => {
  let query = "SELECT manager, matchupTotal, score, year, week, vs, winLoss, isHomeGame FROM matchups ORDER BY matchupTotal DESC LIMIT 1"
  db.transaction((tx) => {
      tx.executeSql(query, [],
        (tx, rs) => {
          if(rs.rows.length === 0) {
            callback(null);
          } else {
            callback(rs.rows[0]);
          }
        });
  });
}

const getFewestPointsGame = (db, callback) => {
  let query = "SELECT manager, score, year, week, vs FROM matchups ORDER BY score ASC LIMIT 1"
  db.transaction((tx) => {
      tx.executeSql(query, [],
        (tx, rs) => {
          if(rs.rows.length === 0) {
            callback(null);
          } else {
            callback(rs.rows[0]);
          }
        });
  });
}

const getFewestPointsSeason = (db, leagueSettings, callback) => {
  let query = "SELECT manager, score, year, week FROM matchups"
  db.transaction((tx) => {
      tx.executeSql(query, [],
        (tx, rs) => {
          if(rs.rows.length === 0) {
            callback(null);
          } else {
            var scoreMap = new Map();
            for(var i=0; i<rs.rows.length; i++) {
              if(rs.rows[i].week < leagueSettings[rs.rows[i].year].finalRegularSeasonMatchupPeriodId+1){
                //var key = { manager: rs.rows[i].manager, year: rs.rows[i].year };
                var key = rs.rows[i].manager + "-" + rs.rows[i].year;
                if (scoreMap.has(key)) {
                  var old = scoreMap.get(key);
                  scoreMap.set(key, parseFloat(old) + parseFloat(rs.rows[i].score));
                } else {
                  scoreMap.set(key, parseFloat(rs.rows[i].score));
                }
              }
            }
            var minEntry = { score: Infinity };
            for(let [k, v] of scoreMap){
              if(minEntry.score > parseFloat(v)){
                  minEntry.score = parseFloat(v);
                  minEntry.manager = k.split("-")[0];
                  minEntry.year = k.split("-")[1];
              }
            }
            callback(minEntry);
          }
        });
  });
}

const getFewestPointsMatchup = (db, callback) => {
  let query = "SELECT manager, matchupTotal, score, year, week, vs, winLoss, isHomeGame FROM matchups ORDER BY matchupTotal ASC LIMIT 1"
  db.transaction((tx) => {
      tx.executeSql(query, [],
        (tx, rs) => {
          if(rs.rows.length === 0) {
            callback(null);
          } else {
            callback(rs.rows[0]);
          }
        });
  });
}

const getMostPointsAllowedSeason = (db, leagueSettings, callback) => {
  let query = "SELECT vs, score, year, week FROM matchups"
  db.transaction((tx) => {
      tx.executeSql(query, [],
        (tx, rs) => {
          if(rs.rows.length === 0) {
            callback(null);
          } else {
            var scoreMap = new Map();
            for(var i=0; i<rs.rows.length; i++) {
              if(rs.rows[i].week < leagueSettings[rs.rows[i].year].finalRegularSeasonMatchupPeriodId+1){
                //var key = { manager: rs.rows[i].manager, year: rs.rows[i].year };
                var key = rs.rows[i].vs + "-" + rs.rows[i].year;
                if (scoreMap.has(key)) {
                  var old = scoreMap.get(key);
                  var entry = { vs: old.vs, year: old.year, totalPoints: parseFloat(old.totalPoints) + parseFloat(rs.rows[i].score) }
                  scoreMap.set(key, entry);
                } else {
                  var entry = { vs: rs.rows[i].vs, year: rs.rows[i].year, totalPoints: parseFloat(rs.rows[i].score) }
                  scoreMap.set(key, entry);
                }
              }
            }
            var maxEntry = { totalPoints: -Infinity };
            for(let [k, v] of scoreMap){
              if(maxEntry.totalPoints < parseFloat(v.totalPoints)){
                  maxEntry.totalPoints = parseFloat(v.totalPoints);
                  maxEntry.vs = v.vs;
                  maxEntry.year = v.year;
              }
            }
            callback(maxEntry);
          }
        });
  });
}

const getFewestPointsAllowedSeason = (db, leagueSettings, callback) => {
  let query = "SELECT vs, score, year, week FROM matchups"
  db.transaction((tx) => {
      tx.executeSql(query, [],
        (tx, rs) => {
          if(rs.rows.length === 0) {
            callback(null);
          } else {
            var scoreMap = new Map();
            for(var i=0; i<rs.rows.length; i++) {
              if(rs.rows[i].week < leagueSettings[rs.rows[i].year].finalRegularSeasonMatchupPeriodId+1){
                //var key = { manager: rs.rows[i].manager, year: rs.rows[i].year };
                var key = rs.rows[i].vs + "-" + rs.rows[i].year;
                if (scoreMap.has(key)) {
                  var old = scoreMap.get(key);
                  var entry = { vs: old.vs, year: old.year, totalPoints: parseFloat(old.totalPoints)
                       + parseFloat(rs.rows[i].score), numGames: old.numGames + 1}
                  scoreMap.set(key, entry);
                } else {
                  var entry = { vs: rs.rows[i].vs, year: rs.rows[i].year, totalPoints: parseFloat(rs.rows[i].score), numGames: 1 }
                  scoreMap.set(key, entry);
                }
              }
            }
            var minEntry = { totalPoints: 9999 };
            for(let [k, v] of scoreMap){
              if (v.numGames == leagueSettings[v.year].finalRegularSeasonMatchupPeriodId){
                if(parseFloat(v.totalPoints) < parseFloat(minEntry.totalPoints)){
                  minEntry.totalPoints = parseFloat(v.totalPoints);
                  minEntry.numGames = leagueSettings[v.year].finalRegularSeasonMatchupPeriodId;
                  minEntry.vs = v.vs;
                  minEntry.year = v.year;
                }
              }
            }
            callback(minEntry);
          }
        });
  });
}

const getSmallestMarginMatchup = (db, callback) => {
  let query = "SELECT manager, matchupTotal, score, year, week, vs, winLoss, pointDiff FROM matchups WHERE winLoss = 1 ORDER BY pointDiff ASC LIMIT 1";
  db.transaction((tx) => {
      tx.executeSql(query, [],
        (tx, rs) => {
          if(rs.rows.length === 0) {
            callback(null);
          } else {
            callback(rs.rows[0]);
          }
        });
  });
}

const getBiggestBlowoutMatchup = (db, callback) => {
  let query = "SELECT manager, matchupTotal, score, year, week, vs, winLoss, pointDiff FROM matchups WHERE winLoss = 1 ORDER BY pointDiff DESC LIMIT 1";
  db.transaction((tx) => {
      tx.executeSql(query, [],
        (tx, rs) => {
          if(rs.rows.length === 0) {
            callback(null);
          } else {
            callback(rs.rows[0]);
          }
        });
  });
}


const getLongestWinStreak = (db, callback) => {
  let query = "SELECT manager, year, week, winLoss FROM matchups ORDER BY manager ASC, year ASC, week ASC";
  db.transaction((tx) => {
    tx.executeSql(query, [],
      (tx, rs) => {
        if(rs.rows.length === 0) {
          callback(null);
        } else {
          var topWinStreak = [];
          var currWinStreak = [];
          var allWinStreaks = { manager: "", years: "", games: [] };
          var isWinning = -1;
          var currManager = rs.rows[0].manager;
          for(var i=0; i<rs.rows.length; i++){
            if(currManager !== rs.rows[i].manager){
              currWinStreak = [];
              isWinning = -1;
              currManager = rs.rows[i].manager;
            }
            if(rs.rows[i].winLoss === 1){
              if(isWinning === 1){
                currWinStreak.push(rs.rows[i])
              } else {
                currWinStreak = [rs.rows[i]];
                isWinning = 1;
              }
            } else if(rs.rows[i].winLoss === 2){
              isWinning = 0;
              currWinStreak = [];
            } else {
              isWinning = 2
              currWinStreak = []
            }
            if(currWinStreak.length === topWinStreak.length){
              if(!allWinStreaks.games === currWinStreak) {
                allWinStreaks.games = currWinStreak
              }
            } else if(currWinStreak.length > topWinStreak.length){
              topWinStreak = currWinStreak;
              allWinStreaks.games = topWinStreak;
            }
          }
          allWinStreaks.years = allWinStreaks.games[0].year + "-" + allWinStreaks.games[allWinStreaks.games.length-1].year;
          allWinStreaks.manager = allWinStreaks.games[0].manager;
          callback(allWinStreaks);
        }
      });
  });
}

const getLongestLosingStreak = (db, callback) => {
  let query = "SELECT manager, year, week, winLoss FROM matchups ORDER BY manager ASC, year ASC, week ASC";
  db.transaction((tx) => {
    tx.executeSql(query, [],
      (tx, rs) => {
        if(rs.rows.length === 0) {
          callback(null);
        } else {
          var topLoseStreak = [];
          var currLoseStreak = [];
          var allLoseStreaks = { manager: "", years: "", games: [] };
          var isLosing = -1;
          var currManager = rs.rows[0].manager;
          for(var i=0; i<rs.rows.length; i++){
            if(currManager !== rs.rows[i].manager){
              currLoseStreak = [];
              islosing = -1;
              currManager = rs.rows[i].manager;
            }
            if(rs.rows[i].winLoss === 2){
              if(isLosing === 1){
                currLoseStreak.push(rs.rows[i])
              } else {
                currLoseStreak = [rs.rows[i]];
                isLosing = 1;
              }
            } else if(rs.rows[i].winLoss === 1){
              isLosing = 0;
              currLoseStreak = [];
            } else {
              isLosing = 2
              currLoseStreak = []
            }
            if(currLoseStreak.length === topLoseStreak.length){
              if(!allLoseStreaks.games === currLoseStreak) {
                allLoseStreaks.games = currLoseStreak
              }
            } else if(currLoseStreak.length > topLoseStreak.length){
              topLoseStreak = currLoseStreak;
              allLoseStreaks.games = topLoseStreak;
            }
          }
          allLoseStreaks.years = allLoseStreaks.games[0].year + "-" + allLoseStreaks.games[allLoseStreaks.games.length-1].year;
          allLoseStreaks.manager = allLoseStreaks.games[0].manager;
          callback(allLoseStreaks);
        }
      });
  });
}

const mapPositionAndTypeToKey = (position, type) => {
  let returnString = positionsByESPNValue[position];
  if (type === "game") {
    returnString  += "G";
  } else {
    returnString  += "S";
  }
  return returnString;
}

const getMostPointsPlayerGame = (db, playerPosition, leagueDict, callback) => {
  let query = "SELECT player, playerPosition, score, year, week, manager FROM history WHERE playerPosition='"+playerPosition+"' AND score<>'undefined' ORDER BY score DESC LIMIT 1";
  db.transaction((tx) => {
      tx.executeSql(query, [],
        (tx, rs) => {
          if(rs.rows.length === 0) {
            callback(null);
          } else {
            let localStorageRecord = leagueDict[mapPositionAndTypeToKey(playerPosition, 'game')];
            if(localStorageRecord && parseFloat(localStorageRecord.score) > rs.rows[0].score) {
              callback({
                score: localStorageRecord.score,
                player: localStorageRecord.name,
                year: localStorageRecord.date,
              });
            } else {
              callback(rs.rows[0]);
            }
          }
        });
  });
}

const getMostPointsPlayerSeason = (db, playerPosition, leagueSettings, leagueDict, callback) => {
  let query = "SELECT player, playerPosition, score, year, week, manager FROM history WHERE playerPosition='"+playerPosition+"' AND score<>'undefined' ORDER BY score DESC";
  db.transaction((tx) => {
      tx.executeSql(query, [],
        (tx, rs) => {
          if(rs.rows.length === 0) {
            callback(null);
          } else {
              var scoreMap = new Map();
              for(var i=0; i<rs.rows.length; i++) {
                if(rs.rows[i].week < leagueSettings[rs.rows[i].year].finalRegularSeasonMatchupPeriodId+1){
                  //var key = { manager: rs.rows[i].manager, year: rs.rows[i].year };
                  var key = rs.rows[i].player + "-" + rs.rows[i].year;
                  if(scoreMap.has(key)) {
                    var old = scoreMap.get(key);
                    scoreMap.set(key, parseFloat(old) + parseFloat(rs.rows[i].score));
                  } else {
                    scoreMap.set(key, parseFloat(rs.rows[i].score));
                  }
                }
              }
              var maxEntry = { score: 0 };
              for(let [k, v] of scoreMap){
                if(parseFloat(maxEntry.score) < parseFloat(v)){
                    maxEntry.score = parseFloat(v);
                    maxEntry.player = k.split("-")[0];
                    maxEntry.year = k.split("-")[1];
                }
              }
              let localStorageRecord = leagueDict[mapPositionAndTypeToKey(playerPosition, 'season')];
              if(localStorageRecord && localStorageRecord.score > maxEntry.score) {
                callback({
                  score: localStorageRecord.score,
                  player: localStorageRecord.name,
                  year: localStorageRecord.date,
                });
              } else {
                callback(maxEntry);
              }
          }
        });
  });
}

const mergeDataIntoRecordBook = (db, playerPositions, leagueSettings, leagueLocalStorage, callback) => {
  var records = {};
  chrome.storage.sync.get(['league-' + leagueId], (response) => {
    const leagueDict = (response['league-' + leagueId]) ? response['league-' + leagueId] : {};
    getMostPointsGame(db, function(resultMPG){
      records["mostPointsGame"] = resultMPG;
      getMostPointsSeason(db, leagueSettings, function(resultMPS){
        records["mostPointsSeason"] = resultMPS;
        getMostPointsMatchup(db, function(resultMPM){
          records["mostPointsMatchup"] = resultMPM;
          getFewestPointsGame(db, function(resultFPG){
            records["fewestPointsGame"] = resultFPG;
            getFewestPointsSeason(db, leagueSettings, function(resultFPS){
              records["fewestPointsSeason"] = resultFPS;
              getFewestPointsMatchup(db, function(resultFPM){
                records["fewestPointsMatchup"] = resultFPM;
                getSmallestMarginMatchup(db, function(resultSMM){
                  records["smallestMarginMatchup"] = resultSMM;
                  getBiggestBlowoutMatchup(db, function(resultBBM){
                    records["biggestBlowoutMatchup"] = resultBBM;
                    getMostPointsAllowedSeason(db, leagueSettings, function(resultMPAS){
                      records["mostPointsAllowedSeason"] = resultMPAS;
                      getFewestPointsAllowedSeason(db, leagueSettings, function(resultFPAS){
                        records["fewestPointsAllowedSeason"] = resultFPAS;
                        getLongestWinStreak(db, function(resultLWS){
                          records["winStreak"] = resultLWS;
                          getLongestLosingStreak(db, function(resultLLS){
                            records["loseStreak"] = resultLLS;
                            Object.keys(playerPositions).forEach(pos => {
                              getMostPointsPlayerGame(db, playerPositions[pos], leagueDict, function(resultMPPG){
                                if(!resultMPPG && !leagueDict.hidePlayerRecords) {
                                  alert("Detected Irregular Roster Settings. Please turn off Individual player records via the extension options to generate a record book.")
                                  return;
                                }
                                records["mostPointsPlayerGame-"+pos] = resultMPPG;
                              });
                              getMostPointsPlayerSeason(db, playerPositions[pos], leagueSettings, leagueDict, function(resultMPPS){
                                records["mostPointsPlayerSeason-"+pos] = resultMPPS;
                                if (pos === "K"){
                                  callback(generateRecordBookHTML(records, leagueDict));
                                }
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

const getManagerName = (manager, managerMap) => {
  return (managerMap && managerMap[manager]) ? managerMap[manager] : manager;
}

const roundScore = (score) => {
  if(score % 1 === 0) {
    return score;
  } else {
    return score.toFixed(2);
  }
}

const generateRecordBookHTML = (records, leagueDict) => {

  mostMatchupString = getManagerName(records["mostPointsMatchup"].manager, leagueDict.managerMap) + " ("+roundScore(records["mostPointsMatchup"].score)+") vs " + getManagerName(records["mostPointsMatchup"].vs, leagueDict.managerMap) +" ("+roundScore(parseFloat(records["mostPointsMatchup"].matchupTotal-records["mostPointsMatchup"].score))+")";
  fewestMatchupString = getManagerName(records["fewestPointsMatchup"].manager, leagueDict.managerMap) + " ("+roundScore(records["fewestPointsMatchup"].score)+") vs " + getManagerName(records["fewestPointsMatchup"].vs, leagueDict.managerMap) +" ("+roundScore(parseFloat(records["fewestPointsMatchup"].matchupTotal-records["fewestPointsMatchup"].score))+")";
  smallestMarginString = getManagerName(records["smallestMarginMatchup"].manager, leagueDict.managerMap) + " ("+roundScore(records["smallestMarginMatchup"].score)+") vs " + getManagerName(records["smallestMarginMatchup"].vs, leagueDict.managerMap) +" ("+roundScore(parseFloat(records["smallestMarginMatchup"].matchupTotal-records["smallestMarginMatchup"].score))+")";
  biggestBlowoutString = getManagerName(records["biggestBlowoutMatchup"].manager, leagueDict.managerMap) + " ("+roundScore(records["biggestBlowoutMatchup"].score)+") vs " + getManagerName(records["biggestBlowoutMatchup"].vs, leagueDict.managerMap) +" ("+roundScore(parseFloat(records["biggestBlowoutMatchup"].matchupTotal-records["biggestBlowoutMatchup"].score))+")";

  resultString = "<div id='recordBook'>"
  resultString = resultString + "<table>"
  resultString = resultString + "<tr>"
  resultString = resultString + "<th colspan='3'><h3>League Record Book</h3></th>"
  resultString = resultString + "</tr>"
  resultString = resultString + "<tr> <td class='column1'><b>Category</b></td><td class='column2'><b>Record</b></td><td class='column3'><b>Holder</b></td></tr>"
  resultString = resultString + "<tr> <td class='recordType odd'>Most Points (Game) </td><td class='center odd'>" + roundScore(records["mostPointsGame"].score) + "</td><td class='center odd'>" + getManagerName(records["mostPointsGame"].manager, leagueDict.managerMap) + "</td></tr>"
  resultString = resultString + "<tr> <td class='recordType even'>Most Points (Season) </td><td class='center even'>" + roundScore(records["mostPointsSeason"].score) + "</td><td class='center even'>" + getManagerName(records["mostPointsSeason"].manager, leagueDict.managerMap) + " - " + records["mostPointsSeason"].year + "</td></tr>"
  resultString = resultString + "<tr> <td class='recordType odd'>Most Points (Matchup) </td><td class='center odd'>" + roundScore(records["mostPointsMatchup"].matchupTotal) + "</td><td class='center odd'>" + mostMatchupString + "</td></tr>"
  resultString = resultString + "<tr> <td class='recordType even'>Fewest Points (G) </td><td class='center even'>" + roundScore(records["fewestPointsGame"].score) + "</td><td class='center even'>" + getManagerName(records["fewestPointsGame"].manager, leagueDict.managerMap) + "</td></tr>"
  resultString = resultString + "<tr> <td class='recordType odd'>Fewest Points (S) </td><td class='center odd'>" + roundScore(records["fewestPointsSeason"].score) + "</td><td class='center odd'>" + getManagerName(records["fewestPointsSeason"].manager, leagueDict.managerMap) + " - " + records["fewestPointsSeason"].year + "</td></tr>"
  resultString = resultString + "<tr> <td class='recordType even'>Fewest Points (M) </td><td class='center even'>" + roundScore(records["fewestPointsMatchup"].matchupTotal) + "</td><td class='center even'>" + fewestMatchupString + "</td></tr>"
  resultString = resultString + "<tr> <td class='recordType odd'>Smallest Margin of Victory (M) </td><td class='center odd'>" + roundScore(records["smallestMarginMatchup"].pointDiff) + "</td><td class='center odd'>" + smallestMarginString + "</td></tr>"
  resultString = resultString + "<tr> <td class='recordType even'>Biggest Blowout (M) </td><td class='center even'>" + roundScore(records["biggestBlowoutMatchup"].pointDiff) + "</td><td class='center even'>" + biggestBlowoutString + "</td></tr>"
  resultString = resultString + "<tr> <td class='recordType odd'>Most Points Allowed (S) </td><td class='center odd'>" + roundScore(records["mostPointsAllowedSeason"].totalPoints) + "</td><td class='center odd'>" + getManagerName(records["mostPointsAllowedSeason"].vs, leagueDict.managerMap) + " - " + records["mostPointsAllowedSeason"].year + "</td></tr>"
  resultString = resultString + "<tr> <td class='recordType even'>Fewest Points Allowed (S) </td><td class='center even'>" + roundScore(records["fewestPointsAllowedSeason"].totalPoints) + "</td><td class='center even'>" + getManagerName(records["fewestPointsAllowedSeason"].vs, leagueDict.managerMap) + " - " + records["fewestPointsAllowedSeason"].year + "</td></tr>"
  resultString = resultString + "<tr> <td class='recordType odd'>Longest Win Streak </td><td class='center odd'>" + records["winStreak"].games.length + "</td><td class='center odd'>" + getManagerName(records["winStreak"].manager, leagueDict.managerMap) + "</td></tr>"
  resultString = resultString + "<tr> <td class='recordType even'>Longest Losing Streak </td><td class='center even'>" + records["loseStreak"].games.length + "</td><td class='center even'>" + getManagerName(records["loseStreak"].manager, leagueDict.managerMap) + "</td></tr>";
  if(leagueDict && !leagueDict.hidePlayerRecords) {
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points-QB (G) </td><td class='center odd'>" + roundScore(records["mostPointsPlayerGame-QB"].score) + "</td><td class='center odd'>" + records["mostPointsPlayerGame-QB"].player + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Most Points-QB (S) </td><td class='center even'>" + roundScore(records["mostPointsPlayerSeason-QB"].score) + "</td><td class='center even'>" + records["mostPointsPlayerSeason-QB"].player + " - " + records["mostPointsPlayerSeason-QB"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points-RB (G) </td><td class='center odd'>" + roundScore(records["mostPointsPlayerGame-RB"].score) + "</td><td class='center odd'>" + records["mostPointsPlayerGame-RB"].player + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Most Points-RB (S) </td><td class='center even'>" + roundScore(records["mostPointsPlayerSeason-RB"].score) + "</td><td class='center even'>" + records["mostPointsPlayerSeason-RB"].player + " - " + records["mostPointsPlayerSeason-RB"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points-WR (G) </td><td class='center odd'>" + roundScore(records["mostPointsPlayerGame-WR"].score) + "</td><td class='center odd'>" + records["mostPointsPlayerGame-WR"].player + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Most Points-WR (S) </td><td class='center even'>" + roundScore(records["mostPointsPlayerSeason-WR"].score) + "</td><td class='center even'>" + records["mostPointsPlayerSeason-WR"].player + " - " + records["mostPointsPlayerSeason-WR"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points-TE (G) </td><td class='center odd'>" + roundScore(records["mostPointsPlayerGame-TE"].score) + "</td><td class='center odd'>" + records["mostPointsPlayerGame-TE"].player + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Most Points-TE (S) </td><td class='center even'>" + roundScore(records["mostPointsPlayerSeason-TE"].score) + "</td><td class='center even'>" + records["mostPointsPlayerSeason-TE"].player + " - " + records["mostPointsPlayerSeason-TE"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points-D/ST (G) </td><td class='center odd'>" + roundScore(records["mostPointsPlayerGame-DST"].score) + "</td><td class='center odd'>" + records["mostPointsPlayerGame-DST"].player + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Most Points-D/ST (S) </td><td class='center even'>" + roundScore(records["mostPointsPlayerSeason-DST"].score) + "</td><td class='center even'>" + records["mostPointsPlayerSeason-DST"].player + " - " + records["mostPointsPlayerSeason-DST"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points-K (G) </td><td class='center odd'>" + roundScore(records["mostPointsPlayerGame-K"].score) + "</td><td class='center odd'>" + records["mostPointsPlayerGame-K"].player + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Most Points-K (S) </td><td class='center even'>" + roundScore(records["mostPointsPlayerSeason-K"].score) + "</td><td class='center even'>" + records["mostPointsPlayerSeason-K"].player + " - " + records["mostPointsPlayerSeason-K"].year + "</td></tr>"
  }
  resultString = resultString + "</table></div>"

  return resultString;
}
