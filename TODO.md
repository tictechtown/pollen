For any new UI elements, try to use Material You or Material You Expressive elements.

# Version 1.0.1

- Update TabBar from expo-router to use Material Design You size/behavior.
- Persist read status for articles
- Add a FAB action to mark all articles as read

# Version 1.0.2

- Clicking on `Sources`;

  - Brings you to a dedicated page.
  - Page has a list of items:
  - All
  - One entry per feed
  - When selecting one entry, you go back to the Newsfeed, and only display entries for that feed.
  - (Later on, supports for Folder/Tags selection)
  - You can swipe to delete an entry
  - There's an FAB Add button to add a new entry. A textInput appears and the user can enter a feed url.
  - The `Sources` chip updates to display: `Sources: <feed>`

- Clicking on `Read`:
  - Display only entries not read yet
- Remove `Saved` chip

# Version 1.0.3

- In the article page:
  - if the user scrolls to the top (like a pull to refresh), we load the article in READER mode
  - if the user scrolls to be bottom (like a pull to refresh, but inverted), we load the linked html page

# Version 1.0.4

- Redo database completely

# Version 1.0.5

- Reader mode. Get a android/node js version to convert the html page to reader mode
- Redo sources page. Take a look at the image https://raw.githubusercontent.com/ReadYouApp/ReadYou/main/fastlane/metadata/android/en-US/images/phoneScreenshots/feeds.png for inspiration
- Webview: add bottom padding
- Article header, redo actions so it's a Toggle Button Group
- I don't think the list of read articles is persisted
- Some images are not loading in Reader mode
- Font seems different in Reader mode vs Regular mode
- Fix issue with MIT News always being at the top
- Read button doesn't change icon when toggled
- Add more tests to reader mode

# Version 1.0.6

- Pull interval: every 30 minutes, do a background tasks to refresh the list of articles. If new articles were fetched, the next time the user opens the app, they should see a toast saying "xx new articles"

# Version 1.0.7

- For Android, create 2 new share actions. When the user browse a link on the web and opens the share sheet, it should see this app appears, and have the option to:
  - add this url to the list of feed
  - add this url to the list of saved articles

# Version 1.0.8

- Fix saved tab: It's currenly throwing an error (maxmium update depth exceeded).

# Version 1.0.9

- Clean up + tests
- By default, make sure all articles from more than 6 month ago are read
- Don't load all the data from the DB, just load the last 200 items + fetch 100 whenever you reach the limit
- "All sources" chip should have a caret down
- Share sheet

# Version 1.0.10

- How to get the correct RSS feed from a url
- How to save articles that are not part of a feed
- Update FAB to adapt to scrolling (scroll position 0 -> full, scroll position > 0 -> compact)
- Make a prod release, using GH actions
- Fix typescript
- Fix Share intent - it's currently not working

# Version 1.0.11

- Better css around codeblocks when reading articles
- Lone article: Better "Site Title" override. Same with og picture?
- summary/description -> should be text only no markdown

# Version 1.0.12

- Redesign fetch feeds/articles, the current state (loading/error/loaded) and last refresh timestamp. This should have a global state, powered by a zustand store. And each tab or other actions within the app triggering a refresh should use this shared state. Maybe use a Context for that? and have one single useEffect that is global to the app?
- Article Header should be clickable -> and goes to real page
- override link colors (maybe with important!). For instance: My Favorite Investment Writing of 2025 -> Of Dollors and Data. Or maybe strip `a` link of their styles?

# Version 1.0.13

- Rename status field to `read`
- When fetching feeds, look at headers to figure out minimum time before next fetch
- Default theme should be green-based

- If metadata already parsed, don't try to get it again
- If feed has an issue (5xx or 4xx) -> display it to the user
- Add ability to create/manage folders for feeds
- Export to OPML
- Add a FAB to add a lone link
- Update tab icons to be outlined/fill for default/selected
- Why Mark As read is disabled when there are clearly other items visible
- Revise navigation when going to source. Should come from the left:
  - Maybe the navigation stack should be: [souces, tabs, share | article | settings], with the first route being tabs
- Redo data structure and fetch logic

# Version 1.1.0

- Check performance
  - probably swipable is not performant
  - Selecting one feed is slow
- Check uniqueness generation from AtomFeed and RSSFeed. It's not stable at the moment
- Review Database schema - make sure all non-nullable fields are correctly marked
