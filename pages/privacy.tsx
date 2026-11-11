import Link from "next/link";
import LegalLayout, { ContactEmail } from "@/components/legallayout";
import { LEGAL } from "@/utils/legal";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This Privacy Policy explains what information Crewbase collects, how it’s used and the choices you have. Crewbase (<a href={LEGAL.siteUrl}>crewbase.dev</a>) is a
        free, non-commercial hobby project run from {LEGAL.governingState}, United States. If you have questions, email{" "}
        <ContactEmail />.
      </p>
      <p>
        <strong>The short version:</strong> we collect what’s needed to run staff workspaces for Roblox groups. We don’t sell your
        information, we don’t show ads, and we don’t use tracking or advertising cookies.
      </p>

      <h2>1. Information we collect</h2>
      <h3>Your account</h3>
      <ul>
        <li>Your Roblox user ID, username, display name and avatar image, which are public on Roblox.</li>
        <li>Your Crewbase password, stored only as a secure one-way hash. We can’t see your actual password.</li>
        <li>If you choose to add it, your birthday as a day and month only (never the year).</li>
        <li>
          Optional workspace profile details you choose to add, such as your timezone, Discord ID, an email address, an intro
          message and a favourite song.
        </li>
      </ul>

      <h3>Reports and support</h3>
      <ul>
        <li>Reports you send to Crewbase site staff, and requests like account deletion.</li>
        <li>Private notes site staff keep about accounts when handling reports or rule-breaking.</li>
        <li>A log of actions site staff and admins take, such as suspensions.</li>
      </ul>

      <h3>Information inside workspaces</h3>
      <p>Workspace members, admins and connected Roblox games may add information about you, such as:</p>
      <ul>
        <li>In-game activity: when you joined and left the game, idle time and message counts, sent by the group’s Roblox game.</li>
        <li>Sessions you host or join, inactivity notices and the reasons you give, and quota progress.</li>
        <li>Userbook entries like warnings, promotions, demotions and notes, plus recommendations, votes and comments.</li>
        <li>Moderation cases about you, including evidence files such as screenshots or videos.</li>
        <li>Wall posts, docs, application answers, policy sign-offs and anything else you post.</li>
        <li>
          Team tab content: announcements and whether you confirmed reading them, team chat messages, event RSVPs, training
          certifications, performance reviews, poll votes, kudos, feedback, tasks, ideas and votes, onboarding checklists and
          Staff of the Month nominations. Anonymous feedback is saved without your name.
        </li>
      </ul>

      <h3>Integrations a workspace connects</h3>
      <ul>
        <li>Discord: the server and channel settings used to post announcements, and encrypted bot credentials.</li>
        <li>Bloxlink: lookups that match Discord accounts to Roblox accounts, using an encrypted key.</li>
        <li>
          The Crewbase Discord bot: which Discord servers are linked to which workspace, and, when someone uses a command, their
          Discord user ID and the command they used. The bot doesn’t read or store your server’s messages.
        </li>
        <li>Roblox Open Cloud: an API key the workspace owner provides so Crewbase can read group ranks.</li>
      </ul>

      <h3>Plans and badges</h3>
      <ul>
        <li>
          Each workspace’s plan, how it got it, any end date, plan requests and the reason given, staff replies, and any badges
          Crewbase staff add. This is about the workspace, but a request also records which admin sent it.
        </li>
      </ul>

      <h3>Technical information</h3>
      <ul>
        <li>A login cookie that keeps you signed in. It’s essential for the site to work.</li>
        <li>Preferences stored in your browser, like light or dark mode and your last workspace.</li>
        <li>Basic request logs kept by our hosting provider, such as IP address, browser type and the pages requested, used for security and fixing problems.</li>
        <li>Temporary records of failed login attempts, used to stop password guessing.</li>
      </ul>

      <h2>2. How we use information</h2>
      <ul>
        <li>To run Crewbase: create your account, show your workspaces and keep records your group asks Crewbase to keep.</li>
        <li>To keep Crewbase safe: prevent abuse, investigate reports and enforce our <Link href="/terms">Terms of Service</Link>.</li>
        <li>To fix bugs and keep the service working.</li>
        <li>To reply when you contact us.</li>
      </ul>
      <p>
        We don’t sell or rent personal information, we don’t share it for advertising, and we don’t build advertising profiles.
      </p>
      <p>
        Our homepage may show overall totals, such as the number of workspaces, staff members or hours tracked across Crewbase.
        These are added up across everyone and never name or identify a person, group or workspace. We don’t show the names or
        logos of groups that use Crewbase without their permission.
      </p>

      <h2>3. Who can see your information</h2>
      <ul>
        <li><strong>People in your workspace</strong>, based on the roles and permissions the workspace owner sets up.</li>
        <li><strong>Crewbase site staff and admins</strong>, a small group of volunteers who can look up accounts and workspaces to provide support and keep the site safe.</li>
        <li><strong>Service providers</strong> that help run Crewbase: Vercel (hosting and file storage), Neon (database), Roblox (public profile and group information), Discord and Bloxlink (only when a workspace connects them), and Google Fonts (loads fonts on our public pages, which shares your IP address with Google).</li>
        <li>
          <strong>Our support Discord server</strong>, if you ask for help there. Messages you send in Discord are handled under
          Discord’s own privacy policy, and Crewbase staff there can see them.
        </li>
        <li><strong>When required by law</strong>, or when needed to protect someone’s safety, prevent fraud or respond to a valid legal request.</li>
      </ul>

      <h2>4. Children and teens</h2>
      <p>
        Crewbase is only for people aged 13 and older. We don’t knowingly collect personal information from children under 13.
        If we learn that a child under 13 has created an account, we’ll delete it. If you believe this has happened, contact us
        at <ContactEmail />.
      </p>
      <p>
        Many Roblox staff team members are teenagers. For users under 18, we only process personal information that’s strictly
        needed to provide the features they and their workspace use, and we never sell it or use it for advertising. Parents and
        guardians can contact us to review or delete their teen’s information.
      </p>

      <h2>5. How long we keep information</h2>
      <ul>
        <li>Account information is kept while your account exists.</li>
        <li>Workspace records are kept until the workspace’s admins delete them or the workspace is deleted.</li>
        <li>Moderation evidence is deleted when it, or its case, is deleted.</li>
        <li>Hosting logs are kept for a limited time by our hosting provider.</li>
        <li>Reports you send are kept while they’re needed to handle them and for our records of how we kept Crewbase safe.</li>
        <li>The log of actions taken by Crewbase site staff is kept to show how decisions were made.</li>
        <li>Deleted information may stay in our database provider’s backups for a short time (usually days) before it’s overwritten.</li>
      </ul>

      <h2>6. Your choices and rights</h2>
      <p>
        You can download a copy of your data at any time from <Link href="/account">your account page</Link>, and request account
        deletion there too. You can also ask to see, correct, export or delete your personal information by emailing{" "}
        <ContactEmail />. We’ll respond within 30 days. Parents and guardians can make these requests for their teen.
      </p>

      <h2>7. Deleting your account</h2>
      <p>When we complete a deletion request:</p>
      <ul>
        <li>
          <strong>We delete</strong> your login details, workspace profiles (including birthday, timezone, Discord ID, email, intro
          and favourite song), roles, in-game activity, inactivity notices, policy sign-offs, quota records, session sign-ups,
          applications, votes and comments, wall posts and reactions, chat messages, kudos, named feedback, event RSVPs, poll
          votes, notifications, staff notes about you, and workspace records about you such as warnings, promotions,
          recommendations, reviews and certifications.
        </li>
        <li>
          <strong>We keep, without your name,</strong> things you made that belong to a workspace and that others rely on, like docs,
          session notes and records you wrote about other members. These are credited to “Deleted user”.
        </li>
        <li>
          <strong>Moderation records about you</strong>, such as moderation cases, evidence and in-game bans, are deleted too. The
          only exception is where we need to keep them to protect others or enforce a ban for serious rule-breaking. Then we keep
          them linked only to your Roblox user ID, with your name and other details removed.
        </li>
        <li>
          <strong>We keep a short note</strong> that an account deletion happened, including your Roblox user ID, in our staff action
          log, so we can show the request was completed. Reports you sent are kept with your identity removed.
        </li>
        <li>Copies in backups disappear on their own within a short time.</li>
      </ul>
      <p>
        You can’t delete an account that owns a workspace until ownership is moved to someone else. Your public Roblox profile
        isn’t affected, because Roblox, not Crewbase, controls it. If you use Crewbase again later, a new account is created.
      </p>

      <h2>8. Security</h2>
      <p>
        We use reasonable safeguards to protect your information, including HTTPS encryption, hashed passwords, encrypted
        Discord and Bloxlink credentials, private storage for evidence files with short-lived access links, and limits on who can access
        data. No system is perfectly secure. If a data breach affects your personal information, we’ll notify affected people as
        required by law, including New York’s data breach notification law.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Crewbase uses one essential cookie to keep you logged in, and your browser’s local storage for preferences. We don’t use
        analytics, advertising or tracking cookies.
      </p>

      <h2>10. Where information is stored</h2>
      <p>
        Crewbase is run from the United States, and information is stored and processed in the United States. If you use
        Crewbase from somewhere else, your information will be transferred to the United States.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy. If we make important changes, we’ll let you know on the site before they take effect.
        The date at the top shows when it last changed.
      </p>

      <h2>12. Contact</h2>
      <p>
        For privacy questions or requests, email <ContactEmail />.
      </p>
    </LegalLayout>
  );
}
