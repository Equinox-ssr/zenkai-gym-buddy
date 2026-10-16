# Zenkai Gym Buddy

Build a mobile-first gym tracker web app called "Zenkai" (tagline: "Level up every rep") using Supabase with email login. Theme: black background, gold (#F5C518) accents, bold condensed headings, minimal UI.

AUTH: Email signup/login. Each user only sees their own data (Row Level Security).

DATA
- exercises: id, user_id, name
- routines: id, user_id, name
- routine_exercises: routine_id, exercise_id, position
- workouts: id, user_id, routine_id (nullable), date
- sets: id, workout_id, exercise_id, weight, reps, created_at

SCREENS
1. Home: "Start workout" button, my routines, last 5 workouts.
2. Routines: create/edit routines by picking exercises (add new exercises inline).
3. Active workout: pick a routine or start empty. Quick-add sets (weight + reps, defaulting to the last set's values). Show the previous session's sets for reference. Rest timer (default 90s, adjustable) auto-starts after each logged set, with a skip button.
4. Progress:
   - PRs: per exercise, best weight and best estimated 1RM (Epley), with date.
   - Weekly volume: total volume (weight x reps) per week, last 8 weeks.

RULES
- Show a "New PR!" badge when a set beats the previous best.
- Weight in kg, with a lbs toggle in settings.
- No social features, no AI, no extra pages.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://zenkai-gym-buddy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b4ae44a0-8c3b-4f40-91f0-6ad51f1cc6ef).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
