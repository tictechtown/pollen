# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Description

This React Native app is a RSS reader. It has the following pages:
- A Newsfeed: a list of all articles, sorted by updated timestamp dec. The user can add/remove a newsfeed from this page. It can also filter per source/seen/unseen flag and saved for later.
   Each article is a card. Each card has:
   - a thumbnail image 
   - a title, with a max of 2 lines (if there's a description) or 3 lines if no description
   - a description (if available) with a max of 1 line 
   - a source and relative timestamp
   The card is faded if their article has been opened.
   When the user swaps left on a card, the article is marked as saved for later
   When the user swaps right on a card, the seen/unseen flag is toggled

- An Article View: an HTML rendered view of the RSS article. When the user clicks on a card from the Newsfeed, they are redirected to this Article View. They also marked the article as viewed
- A Saved for Later Feed: a list of articles that the user has manually saved


This app is also offline first. Meaning all the contents is saved on disk, and the thumbnail image is cached as well. When the user requests to clear the cache, only the image cache is cleared.




## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
