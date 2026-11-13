# Study Tracker

A small personal study tracker: log how long you studied, see it as a GitHub-style heatmap, and tick off the topics of each class.

**Live version:** https://flohanusch.github.io/study-tracker/

<img width="1914" height="1035" alt="Study Tracker with a heatmap of study time, stats and class cards" src="https://github.com/user-attachments/assets/849aa43a-6581-426e-8488-82e698194b4d" />

## Features

- **Heatmap** of the last year: one square per day, darker green means more time studied. Hover or tap a day to see the total and a breakdown per class.
- **Log time** with a date, number of minutes and (optionally) a class. Sessions can be edited and deleted.
- **Stats:** current streak, hours this week and total hours.
- **Classes and topics:** each class has a colour and a checklist of topics, with a progress bar.
- **Backup:** export all data as a JSON file and import it again, e.g. to move to another browser or device.
- **Dark mode** that follows your system setting.
- Works on phones.

## How to use it

Open the [live version](https://flohanusch.github.io/study-tracker/), nothing to install.

To run it locally, download or clone the repository and open `index.html` in your browser.

## Your data

Everything is stored in your browser's `localStorage`. Nothing is sent to a server, and there is no account.

That also means clearing your browser data deletes your study log, and each browser or device has its own separate data. Use **Export backup** now and then to keep a copy.
