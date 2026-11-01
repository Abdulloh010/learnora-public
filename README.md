# Learnora

**Learnora** is an interactive learning platform for students in Uzbekistan — live at **[learnora.uz](https://learnora.uz)**.

Created by **Abdulloh Makhammatov**.

## What it does

- **Quizzes** — subject quizzes with XP, levels, streaks and leaderboards
- **Live quiz games** — host a game with a PIN; the host can play along or spectate; Kahoot-style speed scoring (faster correct answers earn more points)
- **Community quizzes** — students create and share their own quizzes
- **Flashcards** — create decks, study with flip cards, track what you know
- **Pomodoro timer** — focus sessions that earn XP
- **Study groups** — groups with real-time group chat
- **Community feed & messaging** — posts, comments, votes, direct messages, connections
- **Courses & live sessions** — verified teachers run multi-session courses with video calls (Jitsi / JaaS)
- **Guest mode** — try quizzes and games without an account
- Works as an installable **PWA**, on phones, tablets and desktop

## Tech stack

- **Backend:** PHP 8.4 (plain PHP + PDO), MySQL / MariaDB
- **Frontend:** vanilla JavaScript, HTML, CSS (no framework), service worker for offline support
- **Integrations:** Google & Telegram sign-in, Jitsi as a Service for video, Uploadcare for files, SMTP email
- **Deployment:** GitHub Actions → FTP to shared hosting (ISPmanager), Apache/nginx

## Project structure

```
index.html            app shell + landing page
js/learnora-app.js    single-page app (routing, pages, live games, ...)
css/learnora.css      design system and page styles
api/*.php             JSON API (auth, quizzes, games, flashcards, groups, ...)
db/*.sql              schema and seed data
tests/                zero-dependency JS unit tests (open tests/runner.html or run with Node)
```

## Running it yourself

1. Create a MySQL database and import `db/schema.sql` (the API also creates newer tables on first use).
2. Copy `api/secrets.example.php` to `api/secrets.php` and fill in your database credentials and API keys.
3. Serve the folder with PHP 8.1+ (e.g. `php -S localhost:8000`) and open it in a browser.

## How it was built

Learnora was designed, built and launched by Abdulloh Makhammatov, who also runs its hosting, domain and deployment. Development was done with the help of AI coding tools (Claude by Anthropic).

## License

Copyright © 2024–2026 Abdulloh Makhammatov. **All rights reserved.** The source is published for viewing only — see [LICENSE](LICENSE).
