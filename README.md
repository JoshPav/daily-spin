# DailySpin

DailySpin is a web app that automatically tracks the albums you listen to on Spotify and turns your listening habits into a daily music journal.

By monitoring your recent listening activity, DailySpin detects when you’ve completed an album and records it in a calendar-style view. You can also build an album backlog, schedule future listens, and let DailySpin generate Spotify playlists for each day—so deciding what to listen to is effortless.

Over time, your favourite track from each day is collected into an automatically managed yearly playlist, creating a personal soundtrack to your year.

👉 **Check it out:** [https://dailyspin.app](https://dailyspin.app)

## Automation

DailySpin is designed to work quietly in the background, with minimal manual input:

- **Hourly listening checks**  
  Spotify’s Recently Played Tracks API is polled hourly to detect completed album listens and update your calendar automatically.

- **Daily backlog processing**  
  At midnight, scheduled backlog albums are processed and daily Spotify playlists are generated for upcoming listens.

## Tech

DailySpin is built with a modern, automation-friendly stack:

- **Nuxt 4** for the web application
- **Spotify Web API** for listening history, playlists, and playback data
- **Server-side scheduled jobs** for polling, scheduling, and playlist automation
- **OAuth authentication** via Spotify
