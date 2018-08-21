let recordBook = document.getElementById('record-book');
let updateDatabase = document.getElementById('update-database');
let deleteDatabase = document.getElementById('delete-database');
let syncText = document.getElementById('database-last-update');
let url = ""
const html5rocks = {};
let lastSync = null;
let firstYear = null;

chrome.storage.sync.get('lastSync', function(data) {
    lastSync = data.lastSync;
    syncText.innerHTML = (lastSync) ? lastSync : 'Never';
  });

chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    url = tabs[0].url;
    chrome.tabs.executeScript(
        tabs[0].id,
        {code: 'document.getElementById("seasonHistoryMenu").lastChild.value;'},
      function (results) {
        firstYear = results[0];
      });
    const leagueId = url.split('leagueId=')[1].split('&')[0];
    const dbName = 'league-' + leagueId;

    html5rocks.webdb = {};
    html5rocks.webdb.db = null;

    html5rocks.webdb.open = function() {
      var dbSize = 5 * 1024 * 1024; // 5MB
      html5rocks.webdb.db = openDatabase(dbName, "1", "League Database", dbSize);
    }

    html5rocks.webdb.onError = function(tx, e) {
      alert("There has been an error: " + e.message);
    }

    html5rocks.webdb.onSuccess = function(tx, e) {
      alert("success");
    }

    html5rocks.webdb.createTable = function() {
      var db = html5rocks.webdb.db;
      db.transaction(function(tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS " +
                      "history(manager TEXT, week INTEGER, year INTEGER, vs TEXT, player TEXT, playerPosition TEXT, score FLOAT, isHomeGame BOOLEAN)", []);
      });
      db.transaction(function(tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS " +
                      "matchups(manager TEXT, week INTEGER, year INTEGER, vs TEXT, winLoss BOOLEAN, score FLOAT, matchupTotal Float, pointDiff FLOAT)", []);
      });
      db.transaction(function(tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS " +
                      "rankings(manager TEXT, week INTEGER, year INTEGER, ranking INTEGER, description TEXT)", []);
      });
    }

    html5rocks.webdb.open();
    html5rocks.webdb.createTable();
});

updateDatabase.onclick = function(element) {
  // update from last sync to present - if no last sync, then from firstYear
  alert("Update lastSync = " + lastSync + " and firstYear = " + firstYear);

  var db = html5rocks.webdb.db;
  db.transaction(function(tx){
    tx.executeSql("INSERT INTO history(manager, week, year, vs, player, playerPosition, score, isHomeGame) VALUES (?,?,?,?,?,?,?,?)",
        ['Joshua Mayer', 1, 2017, 'Kevin McNeill', 'Drew Brees', 'QB', '15.6', '0'],
        html5rocks.webdb.onSuccess,
        html5rocks.webdb.onError);
   });
};

deleteDatabase.onclick = function(element) {
  let shouldDelete = confirm('Are you sure you want to delete the data from your database?');

  if(shouldDelete) {
    var db = html5rocks.webdb.db;
    db.transaction(function(tx){
      tx.executeSql("DELETE * FROM TABLE rankings");
      tx.executeSql("DELETE * FROM TABLE matchups");
      tx.executeSql("DELETE * FROM TABLE history", [], html5rocks.webdb.onSuccess,
      html5rocks.webdb.onError);
    });
  }
};

const html = "<div id='recordBook'><table><tr><th colspan='3' class='header'><h3>League Record Book</h3></th></tr><tr> <td class='column1'><b>Category</b></td><td class='column2'><b>Record</b></td><td class='column3'><b>Holder</b></td></tr><tr> <td class='recordType odd'>Most Points (Game) </td><td class='center odd'>197</td><td class='center odd' title='2014 - Week 10'>Chandos Culleen</td></tr><tr> <td class='recordType even'>Most Points (Season) </td><td class='center even'>1491</td><td class='center even' >Brandon Adams - 2013</td></tr><tr> <td class='recordType odd'>Most Points (Matchup) </td><td class='center odd'>310</td><td class='center odd' title='2013 - Week 9'>Stephen Strigle (145) vs. Chris Jones (165)</td></tr><tr> <td class='recordType even'>Fewest Points (G) </td><td class='center even'>15.8</td><td class='center even' title='2017 - Week 5'>Stephen Strigle</td></tr><tr> <td class='recordType odd'>Fewest Points (S) </td><td class='center odd'>1009.4</td><td class='center odd' >Stephen Strigle - 2017</td></tr><tr> <td class='recordType even'>Fewest Points (M) </td><td class='center even'>93.6</td><td class='center even' title='2017 - Week 5'>Stephen Strigle (15.8) vs. Max Culleen (77.8)</td></tr><tr> <td class='recordType odd'>Most Points Allowed (S) </td><td class='center even'>1484</td><td class='center even' >Chris Jones - 2013</td></tr><tr> <td class='recordType even'>Fewest Points Allowed (S) </td><td class='center even'>1061.2</td><td class='center even' >Chris Livia - 2017</td></tr><tr> <td class='recordType odd'>Longest Win Streak </td><td class='center odd'>10</td><td class='center odd' title='2015 Week 13 to 2016 Week 6 '>Joshua Mayer</td></tr><tr> <td class='recordType even'>Longest Losing Streak </td><td class='center even'>10</td><td class='center even' title='2017 Week 4 to 2017 Week 13 '>Stephen Strigle</td></tr><tr> <td class='recordType odd'>Most Points-QB (G) </td><td class='center odd'>51</td><td class='center odd' title='2013 - Week 1; Owner: Chandos Culleen'>Peyton Manning</td></tr><tr> <td class='recordType even'>Most Points-QB (S) </td><td class='center even'>320</td><td class='center even'>Peyton Manning - 2013</td></tr><tr> <td class='recordType odd'>Most Points-RB (G) </td><td class='center odd'>46</td><td class='center odd' title='2017 - Week 15; Owner: Larry Hernandez'>Todd Gurley II</td></tr><tr> <td class='recordType even'>Most Points-RB (S) </td><td class='center even'>255</td><td class='center even'>David Johnson - 2016</td></tr><tr> <td class='recordType odd'>Most Points-WR (G) </td><td class='center odd'>46</td><td class='center odd' title='2013 - Week 9; Owner: Heather the Terrible'>Andre Johnson</td></tr><tr> <td class='recordType even'>Most Points-WR (S) </td><td class='center even'>213</td><td class='center even'>Antonio Brown - 2014</td></tr><tr> <td class='recordType odd'>Most Points-TE (G) </td><td class='center odd'>34</td><td class='center odd' title='2014 - Week 8; Owner: Stephen Strigle'>Rob Gronkowski</td></tr><tr> <td class='recordType even'>Most Points-TE (S) </td><td class='center even'>180</td><td class='center even'>Jimmy Graham - 2013</td></tr><tr> <td class='recordType odd'>Most Points-D/ST (G) </td><td class='center odd'>52.3</td><td class='center odd' title='2017 - Week 6; Owner: Kevin McNeill'>Ravens D/ST</td></tr><tr> <td class='recordType even'>Most Points-D/ST (S) </td><td class='center even'>221</td><td class='center even'>Seahawks D/ST - 2013</td></tr><tr> <td class='recordType odd'>Most Points-K (G) </td><td class='center odd'>27</td><td class='center odd' title='2017 - Week 4; Owner: Joshua Mayer'>Greg Zuerlein</td></tr><tr> <td class='recordType even'>Most Points-K (S) </td><td class='center even'>138</td><td class='center even'>Greg Zuerlein - 2017</td></tr></table></div><style>.header {  width:500px;  background-color:#1D7225;  color:white;  text-align:center;  border-radius: 3px 3px 0px 0px;}.column1 {width:250px;padding-left:5px;background-color:#6DBB75;text-align:left;}.column2 {  background-color:#6DBB75;  text-align:center;  width:75px}.column3 {  background-color:#6DBB75;  text-align:center;  padding-left:5px}.odd{background-color:#F2F2E8;}.even{background-color:#F8F8F2;}.center{text-align:center;}.recordType{width:250px;padding-left:5px;padding-top:5px;}#recordBook{width:100%;position:relative;margin-left:auto;margin-right:auto;}#recordBook table {border:0px solid black;font-size:12px;width:100%;}</style>";

recordBook.onclick = function(element) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.executeScript(
        tabs[0].id,
        {code: 'document.getElementById("lm-note").innerHTML = "' + html + '";'});
  });
};
