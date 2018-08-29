# LM Note Generator For ESPN Fantasy Football
Creates LM Note content for a public ESPN Fantasy Football League.

## Documentation

[Wiki](https://github.com/jpmayer/fantasy-chrome-extension/wiki)

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

![Extension Popup](https://i.imgur.com/qHqL35t.png)


## Options

Right click the extension icon in the browser toolbar and click 'Options'

Or

Navigate to

> [chrome://extensions/](chrome://extensions/)

Find the ESPN LM Note Builder extension in the list.

Click "Details". Then find and select "Extension options"

Here you can add in old league records, update manager display names, and set some other personal league options. These are all completely optional and are here to provide a more personal experience. The options are per league and can only be set on leagues who have a database stored in local storage (see the Usage section)

![Options](https://i.imgur.com/u47UAUU.png)
