# Task Manager — Student 73997

A responsive task manager built with HTML, CSS and JavaScript. Tasks are stored in Supabase PostgreSQL through its REST API and remain available after a page refresh.

## Links

- Repository: https://github.com/Grojob73997/vistula-task-manager
- Live app: https://grojob73997.github.io/vistula-task-manager/
- Student A's repository: https://github.com/vistula-team-project-74169/vistula-task-manager
- My PR to Student A: https://github.com/vistula-team-project-74169/vistula-task-manager/pull/1
- Student A's PR to this repository: Awaiting Student A; not merged.

The owner chose to keep the existing GitHub username `Grojob73997`. The student ID is `73997`; the account name therefore differs from the assignment's `vistula-team-project-73997` convention.

## Features

Add, view, edit, complete/uncomplete, and delete tasks; search and filter; completion progress; keyboard-accessible controls; visible request and setup errors. User-entered text is rendered as text, never as HTML. No build tools or client libraries are required.

## Supabase setup

1. Create a free Supabase project.
2. Run `setup.sql` once in the project's SQL Editor. It creates the required `public.tasks` table, enables RLS, and grants anonymous CRUD access with the assignment's policies.
3. Copy the project URL and **publishable** key into `config.json`:

   ```json
   {
     "supabaseUrl": "https://YOUR_PROJECT_ID.supabase.co",
     "supabasePublishableKey": "sb_publishable_...",
     "tableName": "tasks"
   }
   ```

Only a publishable key belongs in this public file. Never put a secret key, service_role key, database password or account token into source control. This classroom app intentionally shares one task list with every visitor: its anonymous policies permit anyone to read and change tasks. Use sample tasks only.

## Run and deploy

Serve the repository root over HTTP (for example, `python -m http.server 8000`) and open http://localhost:8000. Opening `index.html` through `file://` will not reliably load configuration.

In GitHub **Settings → Pages**, choose **Deploy from a branch**, `main`, `/(root)` and Save. No build step is needed.

## Team contribution

The `contribution-link` in `index.html` points to `contribution.html`. Student A must add `contribution.html` and `contribution.json` to this repository through a PR. They are deliberately absent until that PR is reviewed and merged by the owner. After the merge, record both actual PR URLs above.

## Verification

Add a sample task, refresh to confirm persistence, edit its title and description, complete it, mark it active again, and delete it. Check empty and filtered lists, error messages, and a narrow mobile viewport. When Student A's PR has been merged, follow Team contribution and choose Show Contributor.

Verified on 8 November 2026: live Supabase REST create/read/edit/complete/uncomplete/delete; browser add/edit/complete/uncomplete, refresh persistence, search and filters; literal rendering of HTML-like text; mobile layout without horizontal overflow. The browser automation stalled while opening the native delete confirmation, so the final browser deletion was not verified; REST deletion was verified separately. Disposable verification records were removed.
