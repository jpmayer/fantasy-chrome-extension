// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.sync.set({lastSync: null, QBG: null, QBS: null, RBG: null, RBS: null,
    WRG: null, WRS: null, TEG: null, TES: null, DSTG: null, DSTS: null, KG: null, KS: null}, function() {
  });

  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {hostEquals: 'games.espn.com', pathEquals: '/ffl/leagueoffice'},
      })
      ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});
