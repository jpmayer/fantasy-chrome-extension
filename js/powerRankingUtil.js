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
            resultString = resultString + generateHTMLRowForPowerRanking(ranking, record, lastWeeksRanking[manager], leagueDict);
          })
          resultString = resultString + "</table></div><style>";
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
          resultString = resultString + "</style>";

          downloadImageFunction(resultString);
        });
      }, errorHandler);
    });

}

const generateHTMLRowForPowerRanking = (ranking, record, lastWeeksRanking, leagueDict) => {
  let delta = (lastWeeksRanking) ? parseInt(ranking.place) - parseInt(lastWeeksRanking.place) : 0;
  let lastWeekPositionString = (lastWeeksRanking) ? 'Last Week: ' + lastWeeksRanking.place : '';
  let managerName = (leagueDict && leagueDict.managerMap && leagueDict.managerMap[ranking.manager]) ? leagueDict.managerMap[ranking.manager] : ranking.manager;
  let resultString = "";
  let teamName = "<div class='manager-name'>" + managerName + "</div>";
  if(leagueDict && !leagueDict.hideTeamNames) {
    teamName = "<div class='team-name'>" + record.teamName + "</div><div class='manager-name-under-team'>" + managerName + "</div>";
  }
  if(leagueDict && leagueDict.showTeamPictures) {
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
