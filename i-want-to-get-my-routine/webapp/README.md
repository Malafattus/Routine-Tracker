# Routine Atlas

A mobile-friendly routine tracker for:

- daily check-ins
- weekly planning
- weekly, monthly, 6-month, and yearly summaries
- workouts
- meal prep
- groceries
- cleaning and reset tasks

## Open locally

Serve the `webapp` folder with any simple static server, then open `index.html` in a browser.

## What this version does

- saves your entries in the browser
- can sync across devices with Firebase once configured
- builds time-based summaries from your logs
- keeps a separate grocery list with active and completed items
- works well on a phone-sized screen
- can be installed to your home screen as a lightweight app
- lets you export and import backups

## Firebase setup

1. Create a free Firebase project.
2. Enable `Authentication` and turn on `Google` sign-in.
3. Create a `Cloud Firestore` database.
4. Copy `firebase-config.example.js` to `firebase-config.js`.
5. Paste your Firebase web config into `firebase-config.js`.
6. Use the Firestore rules in `firestore.rules`.
7. Host the app on Vercel or Firebase Hosting.

## Why this is the long-term free option

- Firebase Spark has a free tier without requiring a card.
- Vercel Hobby is free for a personal project.
- This app uses Google sign-in plus one small Firestore document, so usage should stay tiny for personal use.

## Optional next step

- add a shared family or coach view later if you ever want accountability features
