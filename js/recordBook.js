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
                    scoreMap.set(key, parseInt(old) + parseInt(rs.rows[i].score));
                  } else {
                    scoreMap.set(key, parseInt(rs.rows[i].score));
                  }
                }
              }
              var maxEntry = { score: -Infinity };
              for(let [k, v] of scoreMap){
                if(maxEntry.score < parseInt(v)){ 
                    maxEntry.score = parseInt(v);
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
                    scoreMap.set(key, parseInt(old) + parseInt(rs.rows[i].score));
                  } else {
                    scoreMap.set(key, parseInt(rs.rows[i].score));
                  }
                }
              }
              var minEntry = { score: Infinity };
              for(let [k, v] of scoreMap){
                if(minEntry.score > parseInt(v)){ 
                    minEntry.score = parseInt(v);
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
                    var entry = { vs: old.vs, year: old.year, totalPoints: parseInt(old.totalPoints) + parseInt(rs.rows[i].score) }
                    scoreMap.set(key, entry);
                  } else {
                    var entry = { vs: rs.rows[i].vs, year: rs.rows[i].year, totalPoints: parseInt(rs.rows[i].score) }
                    scoreMap.set(key, entry);
                  }
                }
              }
              var maxEntry = { totalPoints: -Infinity };
              for(let [k, v] of scoreMap){
                if(maxEntry.totalPoints < parseInt(v.totalPoints)){ 
                    maxEntry.totalPoints = parseInt(v.totalPoints);
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
                    var entry = { vs: old.vs, year: old.year, totalPoints: parseInt(old.totalPoints)
                         + parseInt(rs.rows[i].score), numGames: parseInt(old.numGames) + 1}
                    scoreMap.set(key, entry);
                  } else {
                    var entry = { vs: rs.rows[i].vs, year: rs.rows[i].year, totalPoints: parseInt(rs.rows[i].score), numGames: 1 }
                    scoreMap.set(key, entry);
                  }
                }
              }
              var minEntry = { totalPoints: 9999 };
              for(let [k, v] of scoreMap){
                if (v.numGames == leagueSettings[v.year].finalRegularSeasonMatchupPeriodId){
                  if(parseInt(v.totalPoints) < parseInt(minEntry.totalPoints)){
                    minEntry.totalPoints = parseInt(v.totalPoints);
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
  
  const getMostPointsPlayerGame = (db, playerPosition, callback) => {
    let query = "SELECT player, playerPosition, score, year, week, manager FROM history WHERE playerPosition='"+playerPosition+"' AND score<>'undefined' ORDER BY score DESC LIMIT 1";
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
  
  const getMostPointsPlayerSeason = (db, playerPosition, leagueSettings, callback) => {
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
                      scoreMap.set(key, parseInt(old) + parseInt(rs.rows[i].score));
                    } else {
                      scoreMap.set(key, parseInt(rs.rows[i].score));
                    }
                  }
                }
                var maxEntry = { score: 0 };
                for(let [k, v] of scoreMap){
                  if(parseInt(maxEntry.score) < parseInt(v)){ 
                      maxEntry.score = parseInt(v);
                      maxEntry.player = k.split("-")[0];
                      maxEntry.year = k.split("-")[1];
                  }
                }
                callback(maxEntry);
            }
          });
    });
  }

  const mergeDataIntoRecordBook = (db, playerPositions, leagueSettings, leagueLocalStorage, callback) => {
    var records = {};
    
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
                getMostPointsAllowedSeason(db, leagueSettings, function(resultMPAS){
                  records["mostPointsAllowedSeason"] = resultMPAS;
                  getFewestPointsAllowedSeason(db, leagueSettings, function(resultFPAS){
                    records["fewestPointsAllowedSeason"] = resultFPAS;
                    getLongestWinStreak(db, function(resultLWS){
                      records["winStreak"] = resultLWS;
                      getLongestLosingStreak(db, function(resultLLS){
                        records["loseStreak"] = resultLLS;
                        Object.keys(playerPositions).forEach(pos => {
                          getMostPointsPlayerGame(db, playerPositions[pos], function(resultMPPG){
                            records["mostPointsPlayerGame-"+pos] = resultMPPG;
                          });
                          getMostPointsPlayerSeason(db, playerPositions[pos], leagueSettings, function(resultMPPS){
                            records["mostPointsPlayerSeason-"+pos] = resultMPPS;
                            if (pos === "K"){ console.log(records);callback(generateRecordBookHTML(records)); }
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
  
  const generateRecordBookHTML = (records) => {

    mostMatchupString = records["mostPointsMatchup"].manager + " ("+records["mostPointsMatchup"].score+") vs " + records["mostPointsMatchup"].vs +" ("+parseInt(records["mostPointsMatchup"].matchupTotal-records["mostPointsMatchup"].score)+")";
    fewestMatchupString = records["fewestPointsMatchup"].manager + " ("+records["fewestPointsMatchup"].score+") vs " + records["fewestPointsMatchup"].vs +" ("+parseInt(records["fewestPointsMatchup"].matchupTotal-records["fewestPointsMatchup"].score)+")";
    
    resultString = "<div id='recordBook'>"
    resultString = resultString + "<table>"
    resultString = resultString + "<tr>"
    resultString = resultString + "<th colspan='3' class='header'><h3>League Record Book</h3></th>"
    resultString = resultString + "</tr>"
    resultString = resultString + "<tr> <td class='column1'><b>Category</b></td><td class='column2'><b>Record</b></td><td class='column3'><b>Holder</b></td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points (Game) </td><td class='center odd'>" + records["mostPointsGame"].score + "</td><td class='center odd'>" + records["mostPointsGame"].manager + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Most Points (Season) </td><td class='center even'>" + records["mostPointsSeason"].score + "</td><td class='center even'>" + records["mostPointsSeason"].manager + " - " + records["mostPointsSeason"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points (Matchup) </td><td class='center odd'>" + records["mostPointsMatchup"].score + "</td><td class='center odd'>" + mostMatchupString + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Fewest Points (G) </td><td class='center even'>" + records["fewestPointsGame"].score + "</td><td class='center even'>" + records["fewestPointsGame"].manager + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Fewest Points (S) </td><td class='center odd'>" + records["fewestPointsSeason"].score + "</td><td class='center odd'>" + records["fewestPointsSeason"].manager + " - " + records["fewestPointsSeason"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Fewest Points (M) </td><td class='center even'>" + records["fewestPointsMatchup"].matchupTotal + "</td><td class='center even'>" + fewestMatchupString + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points Allowed (S) </td><td class='center even'>" + records["mostPointsAllowedSeason"].totalPoints + "</td><td class='center even'>" + records["mostPointsAllowedSeason"].vs + " - " + records["mostPointsAllowedSeason"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Fewest Points Allowed (S) </td><td class='center even'>" + records["fewestPointsAllowedSeason"].totalPoints + "</td><td class='center even'>" + records["fewestPointsAllowedSeason"].vs + " - " + records["fewestPointsAllowedSeason"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Longest Win Streak </td><td class='center odd'>" + records["winStreak"].games.length + "</td><td class='center odd'>" + records["winStreak"].manager + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Longest Losing Streak </td><td class='center even'>" + records["winStreak"].games.length + "</td><td class='center even'>" + records["loseStreak"].manager + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points-QB (G) </td><td class='center odd'>" + records["mostPointsPlayerGame-QB"].score + "</td><td class='center odd'>" + records["mostPointsPlayerGame-QB"].player + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Most Points-QB (S) </td><td class='center even'>" + records["mostPointsPlayerSeason-QB"].score + "</td><td class='center even'>" + records["mostPointsPlayerSeason-QB"].player + " - " + records["mostPointsPlayerSeason-QB"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points-RB (G) </td><td class='center odd'>" + records["mostPointsPlayerGame-RB"].score + "</td><td class='center odd'>" + records["mostPointsPlayerGame-RB"].player + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Most Points-RB (S) </td><td class='center even'>" + records["mostPointsPlayerSeason-RB"].score + "</td><td class='center even'>" + records["mostPointsPlayerSeason-RB"].player + " - " + records["mostPointsPlayerSeason-RB"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points-WR (G) </td><td class='center odd'>" + records["mostPointsPlayerGame-WR"].score + "</td><td class='center odd'>" + records["mostPointsPlayerGame-WR"].player + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Most Points-WR (S) </td><td class='center even'>" + records["mostPointsPlayerSeason-WR"].score + "</td><td class='center even'>" + records["mostPointsPlayerSeason-WR"].player + " - " + records["mostPointsPlayerSeason-WR"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points-TE (G) </td><td class='center odd'>" + records["mostPointsPlayerGame-TE"].score + "</td><td class='center odd'>" + records["mostPointsPlayerGame-TE"].player + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Most Points-TE (S) </td><td class='center even'>" + records["mostPointsPlayerSeason-TE"].score + "</td><td class='center even'>" + records["mostPointsPlayerSeason-TE"].player + " - " + records["mostPointsPlayerSeason-TE"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points-D/ST (G) </td><td class='center odd'>" + records["mostPointsPlayerGame-DST"].score + "</td><td class='center odd'>" + records["mostPointsPlayerGame-DST"].player + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Most Points-D/ST (S) </td><td class='center even'>" + records["mostPointsPlayerSeason-DST"].score + "</td><td class='center even'>" + records["mostPointsPlayerSeason-DST"].player + " - " + records["mostPointsPlayerSeason-DST"].year + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType odd'>Most Points-K (G) </td><td class='center odd'>" + records["mostPointsPlayerGame-K"].score + "</td><td class='center odd'>" + records["mostPointsPlayerGame-K"].player + "</td></tr>"
    resultString = resultString + "<tr> <td class='recordType even'>Most Points-K (S) </td><td class='center even'>" + records["mostPointsPlayerSeason-K"].score + "</td><td class='center even'>" + records["mostPointsPlayerSeason-K"].player + " - " + records["mostPointsPlayerSeason-K"].year + "</td></tr>"
    resultString = resultString + "</table></div>"
    resultString = resultString + "<style>"
    resultString = resultString + ".header {"
    resultString = resultString + "  width:500px;"
    resultString = resultString + "  background-color:#1D7225;"
    resultString = resultString + "  color:white;"
    resultString = resultString + "  text-align:center;"
    resultString = resultString + "  border-radius: 3px 3px 0px 0px;"
    resultString = resultString + "}"
    resultString = resultString + ".column1 {"
    resultString = resultString + "width:250px;"
    resultString = resultString + "padding-left:5px;"
    resultString = resultString + "background-color:#6DBB75;"
    resultString = resultString + "text-align:left;"
    resultString = resultString + "}"
    resultString = resultString + ".column2 {"
    resultString = resultString + "  background-color:#6DBB75;"
    resultString = resultString + "  text-align:center;"
    resultString = resultString + "  width:75px"
    resultString = resultString + "}"
    resultString = resultString + ".column3 {"
    resultString = resultString + "  background-color:#6DBB75;"
    resultString = resultString + "  text-align:center;"
    resultString = resultString + "  padding-left:5px"
    resultString = resultString + "}"
    resultString = resultString + ".odd{"
    resultString = resultString + "background-color:#F2F2E8;"
    resultString = resultString + "}"
    resultString = resultString + ".even{"
    resultString = resultString + "background-color:#F8F8F2;"
    resultString = resultString + "}"
    resultString = resultString + ".center{"
    resultString = resultString + "text-align:center;"
    resultString = resultString + "}"
    resultString = resultString + ".recordType{"
    resultString = resultString + "width:250px;"
    resultString = resultString + "padding-left:5px;"
    resultString = resultString + "padding-top:5px;"
    resultString = resultString + "}"
    resultString = resultString + "#recordBook{"
    resultString = resultString + "width:100%;"
    resultString = resultString + "position:relative;"
    resultString = resultString + "margin-left:auto;"
    resultString = resultString + "margin-right:auto;"
    resultString = resultString + "}"
    resultString = resultString + "#recordBook table {"
    resultString = resultString + "border:0px solid black;"
    resultString = resultString + "font-size:12px;"
    resultString = resultString + "width:100%;"
    resultString = resultString + "}"
    resultString = resultString + "</style>"

    return resultString;
  }