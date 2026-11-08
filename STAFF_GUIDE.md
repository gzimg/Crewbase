# Crewbase staff guide

How Crewbase site staff and admins handle reports, privacy requests, plans and site settings. Keep this up to date when
processes change.

## Roles

| Role | Can do |
| --- | --- |
| **Site staff** | Handle reports, look up users and workspaces, suspend regular users, add staff notes, handle plan requests, assign plans and badges |
| **Site admin** | Everything staff can do, plus: manage the site team, suspend staff, lock workspaces, change site and plan settings, export user data, delete accounts, post to What’s new |

The instance owner (the person who completed setup) is always a site admin.

## Reports

Found in **Site staff → Reports**. Work through open reports regularly, starting with those marked **Priority** (from Pro
workspaces).

1. Read the report and open the reporter or reported user to see their workspaces, notes and history.
2. Take action if needed: suspend the user, lock the workspace, or add a staff note.
3. Resolve or dismiss it with a short note. The reporter can see this note on their account page, so keep it polite and
   don’t share other people’s private information.

If a report involves a risk to someone’s safety or the sexual exploitation of a minor, tell a site admin immediately.
Child sexual exploitation must be reported to NCMEC at <https://report.cybertip.org>. Don’t download or share the material.

## Privacy requests

The Privacy Policy promises a reply **within 30 days**.

### Data copy (“send me my data”)

Users can download their own data from **Your account → Download my data**. If they can’t, a site admin can open the user in
**Site staff → Users** and use **Export data**, then send the file to the email address the request came from. Only send data
to the account owner (or their parent or guardian, if they’re under 18), after checking the request is genuine.

### Account deletion

Deletion requests appear in **Site staff → Reports** with the category **Account deletion**, or arrive by email.

1. **Check the request is genuine.** Requests from the account page are already verified. For email requests, ask the person
   to send the request from their account page instead, or otherwise confirm they control the Roblox account.
2. **Workspace owners:** if they own a workspace, deletion is blocked. Ask them to transfer ownership first.
3. **Site admins** must have their admin role removed first, in **Site admin → Team**.
4. Open the user in **Site staff → Users** (site admins only).
5. Optional: **Export data** if they asked for a copy.
6. Under **Delete account and data**, decide on **Keep moderation records**:
   - Leave it **off** in almost every case.
   - Turn it **on** only if they were moderated for serious rule-breaking and a ban needs to keep working, or records are
     needed to protect others. Note why in the request.
7. Type their username and click **Permanently delete**.
8. The deletion request is marked resolved automatically, and the action is recorded in the audit log.

**What happens:** their personal data is deleted. Docs and records they wrote about others stay, credited to “Deleted user”.
This matches section 7 of the Privacy Policy. It can’t be undone. Database backups expire on their own within days.

## Suspensions and workspace locks

- **Suspend** a user for serious or repeated rule-breaking. Always give a clear reason. Suspensions apply to the whole site
  within seconds.
- **Lock** a workspace (admins) when the workspace itself breaks the rules. Members can’t open it; site staff still can.
- Appeals come by email. Review them with a different staff member where possible.

## Plans and badges

Found in **Site staff → Plans & badges**.

- **Requests:** approve or decline with a message. A decline needs a reason. You can set an end date for trial plans.
- **Assigning:** give any workspace a plan directly, optionally with an end date and an internal note.
- **Badges:** custom badges (like “Verified” or “Partner”) can go on any workspace, whatever its plan. Only give “Verified”
  when you’ve checked the workspace really belongs to that Roblox group.
- **Plan settings** (admins): **Site admin → Plans** controls names, colours, limits, included features, the default plan and
  automatic upgrades. Changing what a plan includes affects every workspace on it, so post on What’s new when you do.

## Site settings (admins)

- **Announcement banner:** short notices for every logged-in user.
- **Maintenance mode:** locks out everyone except site staff. Use it for planned work, and announce it first.
- **New sign-ups:** close them to stop new accounts, for example during an abuse wave.
- **Health:** check after every deploy. Fix anything marked Missing, and use **Encrypt stored keys** if it shows unencrypted
  keys.

## Golden rules

- Only access user data when you need it to handle a report or request.
- Never share one user’s information with another user.
- Keep notes factual and professional. Users can ask for a copy of their data.
- Never change `ENCRYPTION_KEY` or `SESSION_SECRET` in production.
- When unsure, ask a site admin before acting.
