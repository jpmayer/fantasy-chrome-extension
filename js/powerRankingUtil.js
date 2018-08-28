const generatePowerRanking = (rankingList, title, downloadImageFunction) => {
  isOverridePowerRanking = true;
  // Get trending stat
  leagueDatabase.webdb.db.transaction((tx) => {
    tx.executeSql("SELECT manager, week, year, ranking FROM rankings " +
      "WHERE week = ? AND year = ? ", [currentWeek - 1, selectedYear],
      (tx, tr) => {
        // get sacko overrides from local storage
        chrome.storage.sync.get(['league-' + leagueId], (response) => {
          const leagueDict = response['league-' + leagueId];

          let lastWeeksRanking = (tr.rows.length > 0) ? {} : null;

          for(var r = 0; r < tr.rows.length; r++) {
            lastWeeksRanking[tr.rows[r].manager] = {
              manager: tr.rows[r].manager,
              week: tr.rows[r].week,
              year: tr.rows[r].year,
              place: tr.rows[r].ranking
            };
          }

          let resultString = "<div id='powerRanking'>";
          resultString = resultString + "<table>";
          resultString = resultString + "<tr> <th colspan='5'><h3>" + title + "</h3></th> </tr>";
          resultString = resultString + "<tr> <td class='center'><b>Rank</b></td><td colspan='2' class='center'><b>Team / Record</b></td><td class='center'><b>Trending</b></td><td class='center'><b>Comments</b></td></tr>";

          rankingList.forEach((ranking) => {
            let manager = ranking.manager;
            let record = getTeamRecord(selectedYearLeagueSettings.teams, manager);
            resultString = resultString + generateHTMLRowForPowerRanking(ranking, record, lastWeeksRanking, leagueDict);
          })

          resultString = resultString + "</table></div>";
          resultString = resultString + "<style>";
          resultString = resultString + "#powerRanking {";
          resultString = resultString + "  width:100%;";
          resultString = resultString + "  position:relative;";
          resultString = resultString + "  margin-left:auto;";
          resultString = resultString + "  margin-right:auto;";
          resultString = resultString + "  border: 1px solid white;";
          resultString = resultString + "  border-radius: 3px;font:normal 10px verdana;";
          resultString = resultString + "}";
          resultString = resultString + "#powerRanking table {";
          resultString = resultString + "  border:0px solid black;";
          resultString = resultString + "  font-size:12px;";
          resultString = resultString + "  width:100%;";
          resultString = resultString + "  border-collapse: collapse;";
          resultString = resultString + "}";
          resultString = resultString + "#powerRanking table tr {";
          resultString = resultString + "  background-color:#F8F8F2;";
          resultString = resultString + "}";
          resultString = resultString + "#powerRanking table tr:nth-child(odd){";
          resultString = resultString + "  background-color:#F2F2E8;";
          resultString = resultString + "}";
          resultString = resultString + "#powerRanking table tr:nth-child(2) {";
          resultString = resultString + "  background-color:#6DBB75;";
          resultString = resultString + "}";
          resultString = resultString + "#powerRanking table tr:first-child {";
          resultString = resultString + "  width:500px;";
          resultString = resultString + "  background-color:#1D7225;";
          resultString = resultString + "  color:white;";
          resultString = resultString + "  text-align:center;";
          resultString = resultString + "}";
          resultString = resultString + "th {";
          resultString = resultString + "  border-radius: 3px 3px 0px 0px;";
          resultString = resultString + "}";
          resultString = resultString + "#powerRanking table th h3{ margin:0px; }"
          resultString = resultString + "tr.rank {";
          resultString = resultString + "  height: 60px;";
          resultString = resultString + "  vertical-align: middle;";
          resultString = resultString + "}";
          resultString = resultString + "tr.rank td:first-child {";
          resultString = resultString + "  font-size: 20px;";
          resultString = resultString + "  text-align: center;";
          resultString = resultString + "  vertical-align: middle;";
          resultString = resultString + "  width: 10%;";
          resultString = resultString + "}";
          resultString = resultString + ".ranking {";
          resultString = resultString + "  border-radius: 50px;";
          resultString = resultString + "  color: white;";
          resultString = resultString + "  padding: 0px;";
          resultString = resultString + "  margin: auto;";
          resultString = resultString + "}";
          let circleWidth = 60;
          let circleCount = 0
          let circleMid = rankingList.length / 2
          let cicleChild = 3
          rankingList.forEach((ranking) => {
            let backgroundColor = (circleCount < circleMid) ? "#1D7225;" : "firebrick;";
            resultString = resultString + "tr.rank:nth-child(" + cicleChild + ") .ranking {"
            resultString = resultString + "  background: " + backgroundColor
            resultString = resultString + "  width: " + circleWidth + "px;"
            resultString = resultString + "  height: " + circleWidth + "px;"
            resultString = resultString + "  line-height: " + circleWidth + "px;"
            resultString = resultString + "}"
            if(circleCount === circleMid - 1) {
                circleWidth = circleWidth
            } else if(circleCount < circleMid) {
              circleWidth = circleWidth - 5
            } else {
              circleWidth = circleWidth + 5
            }
            circleCount = circleCount + 1
            cicleChild = cicleChild + 1
          });
          resultString = resultString + "tr.rank td:nth-child(2) {"
          resultString = resultString + "  width: 100px;"
          resultString = resultString + "  vertical-align:middle;"
          resultString = resultString + "  text-align: center;"
          resultString = resultString + "  display: inline-block;"
          resultString = resultString + "}"
          resultString = resultString + "tr.rank td:nth-child(3) {"
          resultString = resultString + "  width: 10%;"
          resultString = resultString + "  vertical-align: middle;"
          resultString = resultString + "}"
          resultString = resultString + "tr.rank td:nth-child(4) {"
          resultString = resultString + "  width: 15%;"
          resultString = resultString + "  vertical-align: middle;"
          resultString = resultString + "}"
          resultString = resultString + "tr.rank td:nth-child(5) {"
          resultString = resultString + "  width: 55%;"
          resultString = resultString + "  vertical-align: middle;"
          resultString = resultString + "  font-size: 10px;padding-left:5px;padding-right:5px;"
          resultString = resultString + "}"
          resultString = resultString + ".teamPicture img{"
          resultString = resultString + "  position: relative;"
          resultString = resultString + "  max-width: 65px;"
          resultString = resultString + "  height: 55px;"
          resultString = resultString + "  vertical-align: middle;"
          resultString = resultString + "  object-fit: cover; border-radius: 10px;"
          resultString = resultString + "}"
          resultString = resultString + ".manager-name {"
          resultString = resultString + " font-size: 13px;white-space: nowrap;top: -5px;position: relative;";
          resultString = resultString + "}"
          resultString = resultString + ".manager-name a {"
          resultString = resultString + "  text-decoration: none !important;"
          resultString = resultString + "  color: #225DB7 !important;"
          resultString = resultString + "}"
          resultString = resultString + ".team-record {"
          resultString = resultString + "  color: #888;"
          resultString = resultString + "}"
          resultString = resultString + ".up {"
          resultString = resultString + "  border-bottom: 8px solid green;"
          resultString = resultString + "  border-left: 4px solid transparent;"
          resultString = resultString + "  border-right: 4px solid transparent;"
          resultString = resultString + "  width: 0px;"
          resultString = resultString + "  position: relative;"
          resultString = resultString + "  left: 17px;"
          resultString = resultString + "  top: 6px;"
          resultString = resultString + "}"
          resultString = resultString + ".down {"
          resultString = resultString + "  border-top: 8px solid red;"
          resultString = resultString + "  border-left: 4px solid transparent;"
          resultString = resultString + "  border-right: 4px solid transparent;"
          resultString = resultString + "  width: 0px;"
          resultString = resultString + "  position: relative;"
          resultString = resultString + "  top: 7px;"
          resultString = resultString + "  left: 17px;"
          resultString = resultString + "}"
          resultString = resultString + ".no-change {"
          resultString = resultString + "  border-top: 8px solid transparent;"
          resultString = resultString + "  border-left: 4px solid transparent;"
          resultString = resultString + "  border-right: 4px solid transparent;"
          resultString = resultString + "}"
          resultString = resultString + ".delta-div { position: relative; right: -5px; }"
          resultString = resultString + ".delta {"
          resultString = resultString + "  width: 25px;"
          resultString = resultString + "  position: relative;"
          resultString = resultString + "  font-size: 17px;"
          resultString = resultString + "  line-height: 20px;"
          resultString = resultString + "  top: -9px;"
          resultString = resultString + "  left: 26px;"
          resultString = resultString + "}"
          resultString = resultString + ".delta-up {"
          resultString = resultString + "  color: green;"
          resultString = resultString + "}"
          resultString = resultString + ".delta-down {"
          resultString = resultString + "  color: red;"
          resultString = resultString + "}"
          resultString = resultString + ".last-weeks-position {"
          resultString = resultString + "  color: #888;"
          resultString = resultString + "  font-size: 10px;"
          resultString = resultString + "  top: -5px;"
          resultString = resultString + "  position: relative;"
          resultString = resultString + "}"
          resultString = resultString + ".center{"
          resultString = resultString + "  text-align:center;"
          resultString = resultString + "}"
          resultString = resultString + ".manager-name-under-team { font-size: 10px; padding-top: 2px; padding-bottom: 2px;white-space:nowrap;}"
          resultString = resultString + ".team-name { white-space:nowrap;font-weight: bold; font-size: 11px; }"
          resultString = resultString + "</style>"
          downloadImageFunction(resultString);
        });
      }, errorHandler);
    });

}

const generateHTMLRowForPowerRanking = (ranking, record, lastWeeksRanking, leagueDict) => {
  let delta = (lastWeeksRanking) ? parseInt(ranking.place) - parseInt(lastWeeksRanking.place) : 0;
  let lastWeekPositionString = (lastWeeksRanking) ? 'Last Week: ' + lastWeeksRanking.place : '';
  let managerName = (leagueDict.managerMap[ranking.manager]) ? leagueDict.managerMap[ranking.manager] : ranking.manager;
  let resultString = "";
  let teamName = "<div class='manager-name'>" + managerName + "</div>";
  if(!leagueDict.hideTeamNames) {
    teamName = "<div class='team-name'>" + record.teamName + "</div><div class='manager-name-under-team'>" + managerName + "</div>";
  }
  if(leagueDict.showTeamPictures) {
    let teamPicture = (leagueDict.managerImageMap[ranking.manager]) ? leagueDict.managerImageMap[ranking.manager]: record.image;
    resultString = "<tr class='rank'> <td><div class='ranking'>" + ranking.place + "</div></td><td class='teamPicture'><img src='" + teamPicture + "'></img></td><td>" + teamName + "<div class='team-record'>" + record.wins + '-' + record.losses + '-' + record.ties + "</div></td><td class='center'><div class='delta-div'><div class='" + getDeltaSymbolClass(delta) + "'></div><div class='delta " + getDeltaClass(delta) + "'>" + getDeltaString(delta) + "</div></div><div class='last-weeks-position'>" + lastWeekPositionString + "</div></td><td class='center'>" + ranking.description + "</td></tr>";
  } else {
    resultString = "<tr class='rank'> <td><div class='ranking'>" + ranking.place + "</div></td><td class='teamPicture' style='width:25px'></td><td style='width:20%;'>" + teamName + "<div class='team-record'>" + record.wins + '-' + record.losses + '-' + record.ties + "</div></td><td class='center'><div class='delta-div'><div class='" + getDeltaSymbolClass(delta) + "'></div><div class='delta " + getDeltaClass(delta) + "'>" + getDeltaString(delta) + "</div></div><div class='last-weeks-position'>" + lastWeekPositionString + "</div></td><td class='center' style='width: 50%';>" + ranking.description + "</td></tr>";
  }
  return resultString;
}

const getDeltaSymbolClass = (delta) => {
  if(delta < 0) {
    return "up";
  } else if(delta > 0) {
    return "down";
  } else {
    return "no-change";
  }
}

const getDeltaClass = (delta) => {
  if(delta < 0) {
    return "delta-up";
  } else if(delta > 0) {
    return "delta-down";
  } else {
    return "";
  }
}

const getDeltaString = (delta) => {
  if(delta === 0) {
    return "---";
  } else if (delta < 0){
    return -delta;
  } else {
    return delta;
  }
}
