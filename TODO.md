For any new UI elements, try to use Material You or Material You Expressive elements.

# Version 1.0.1

- Update TabBar from expo-router to use Material Design You size/behavior.
- Persist seen status for articles
- Add a FAB action to mark all articles as seen

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

- Clicking on `Seen`:
  - Display only entries not seen yet
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
- I don't think the list of seen articles is persisted
- Some images are not loading in Reader mode
- Font seems different in Reader mode vs Regular mode
- Fix issue with MIT News always being at the top
- Seen button doesn't change icon when toggled
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
- By default, make sure all articles from more than 6 month ago are seen
- Don't load all the data from the DB, just load the last 200 items + fetch 100 whenever you reach the limit
- "All sources" chip should have a caret down
- Share sheet

# Version 1.0.10

- How to get the correct RSS feed from a url
- How to save articles that are not part of a feed
- Update FAB to adapt to scrolling (scroll position 0 -> full, scroll position > 0 -> compact)
- Make a prod release, using GH actions

# Version 1.0.11

- Add ability to create folder
- Add a Filter action
- Export to OPML

# Version 1.0.12

- Better css around codeblocks
- Article Header should be clickable -> and goes to real page
- Make sure we don't have twice the same image (srcset)
- Cleaner swipe actions

# Version 1.1.0

- Check performance - probably swipable is not performantac
- Design landing page
- Tweak UI
