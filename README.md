# fantasy-chrome-extension
Creates LM Note content for a public ESPN Fantasy Football League.

## Installation

Pull code

```sh
$ git clone https://github.com/jpmayer/fantasy-chrome-extension.git
```

Open Chrome Extensions in browser

> [chrome://extensions/](chrome://extensions/)

Choose to 'Load Unpacked' and choose the directory of the pulled code. (You may have to switch into Developer Mode first)

## Usage

Navigate to your ESPN Fantasy Football league homepage. It should have a url like so:

> http://games.espn.com/ffl/leagueoffice?leagueId={leagueId}&seasonId=2018

Once you are on this page you should see the extension icon in a clickable state. Click to launch to launch the extension as a popup

To get your league setup, simply click the "Update" button to pull your league's information into a local HTML database.

Once this completes, simply hit one of the generate actions to generate a leader board, record book or power ranking image for your league.

The power ranking action will require more input before rendering.

## Options

Once the league database has been uploaded you can visit the extension options page via the Details -> Extension Options flow in the <chrome://extensions/> page.

Here you can add in old league records, update manager display names, and set some other personal league options. These are all completely optional and are here to provide a more personal experience.
