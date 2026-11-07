import Link from "next/link";
import LegalLayout, { ContactEmail } from "@/components/legallayout";
import { LEGAL } from "@/utils/legal";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These Terms of Service (“Terms”) are an agreement between you and the operator of Crewbase (“Crewbase”, “we”, “us”),
        a free, non-commercial hobby project run from {LEGAL.governingState}, United States. By creating an account or using
        Crewbase, you agree to these Terms and to our <Link href="/privacy">Privacy Policy</Link>. If you don’t agree, please
        don’t use Crewbase.
      </p>

      <h2>1. Who can use Crewbase</h2>
      <ul>
        <li>You must be at least 13 years old. Crewbase is not meant for children under 13, and we don’t knowingly allow them to make accounts.</li>
        <li>If you’re under 18, you confirm that a parent or guardian has read these Terms and the Privacy Policy and is okay with you using Crewbase.</li>
        <li>You must follow the Roblox Terms of Use and, if you use Discord features, the Discord Terms of Service.</li>
        <li>You can’t use Crewbase if we’ve suspended you, or if the law where you live doesn’t allow it.</li>
      </ul>

      <h2>2. Your account</h2>
      <p>
        Your Crewbase account is linked to your Roblox account. Keep your password private, don’t use your Roblox password for
        Crewbase, and don’t share your account. You’re responsible for what happens on your account. Tell us at <ContactEmail />{" "}
        if you think someone else has accessed it.
      </p>

      <h2>3. Workspaces</h2>
      <p>
        A workspace belongs to a Roblox group and is run by that group’s workspace owner and admins. They decide who can join,
        what roles and permissions people have, and what records are kept, such as activity, warnings, promotions and moderation
        cases. Crewbase provides the tools but doesn’t run your group. Disputes inside a group, including about ranks, warnings
        or removals, are between the members and the group’s leadership.
      </p>
      <p>
        If you run a workspace, you’re responsible for using it fairly, for only recording information your team actually needs,
        and for following these Terms and the Roblox Terms of Use.
      </p>

      <h2>4. Rules for using Crewbase</h2>
      <p>You agree not to use Crewbase to:</p>
      <ul>
        <li>Harass, bully, threaten or discriminate against anyone.</li>
        <li>Share anyone’s personal information without their permission, such as real names, addresses, phone numbers, photos or school details.</li>
        <li>Post sexual content, or any content that sexualises or endangers minors. We report child sexual exploitation to the National Center for Missing &amp; Exploited Children (NCMEC) and to law enforcement.</li>
        <li>Post hateful, violent, illegal or extremist content, or content that promotes self-harm.</li>
        <li>Upload malware, try to break into accounts or systems, or test our security without permission.</li>
        <li>Scrape, overload or disrupt Crewbase, or get around rate limits, suspensions or other restrictions.</li>
        <li>Impersonate another person, group or Crewbase staff.</li>
        <li>Upload content you don’t have the right to share, including other people’s copyrighted work.</li>
        <li>Break the Roblox Terms of Use or Discord Terms of Service, or any law.</li>
      </ul>

      <h2>5. Your content</h2>
      <p>
        You keep ownership of what you post on Crewbase, like docs, wall posts, notes and uploaded evidence. You give us
        permission to store, display and process it only so we can run Crewbase for you and the workspaces you belong to. This
        permission ends when the content is deleted, except for copies kept briefly in backups or where the law requires us to
        keep them. You confirm you have the right to post what you upload.
      </p>

      <h2>6. Moderation and enforcement</h2>
      <p>
        Crewbase site staff may review reported content and accounts to keep the service safe. We may remove content, limit
        features, or suspend or close accounts and workspaces that break these Terms or put others at risk, sometimes without
        notice. If you think we’ve made a mistake, contact us at <ContactEmail />.
      </p>

      <h2>7. Copyright complaints</h2>
      <p>
        If you believe content on Crewbase infringes your copyright, send a notice to <ContactEmail /> with: your name and contact
        details; a description of the copyrighted work; the link or location of the content on Crewbase; a statement that you
        believe in good faith the use isn’t authorised by the owner, its agent or the law; a statement, under penalty of perjury,
        that your notice is accurate and you’re the owner or authorised to act for them; and your physical or electronic
        signature. If your content was removed and you believe that was a mistake, you can send a counter-notice to the same
        address. We close the accounts of people who repeatedly infringe copyright.
      </p>

      <h2>8. Other services</h2>
      <p>
        Crewbase works with Roblox, and optionally with Discord and Bloxlink. Those services have their own terms and privacy
        policies, and we’re not responsible for them. Crewbase is an independent project and is not affiliated with, endorsed by
        or sponsored by Roblox Corporation, Discord Inc. or Bloxlink. Roblox is a trademark of Roblox Corporation.
      </p>

      <h2>9. Open source</h2>
      <p>
        Crewbase is built on Firefli, Orbit and Tovy, and its code is licensed under the GNU General Public License v3.0. You can
        find the source code at <a href={LEGAL.sourceUrl} target="_blank" rel="noopener noreferrer">{LEGAL.sourceUrl}</a>.
        Nothing in these Terms limits the rights the GPL gives you over the code itself. These Terms cover your use of this hosted
        Crewbase site.
      </p>

      <h2>10. A free hobby service</h2>
      <p>
        Crewbase is free and run as a hobby. We may change features, have downtime, or stop running Crewbase at any time. If we
        plan to shut it down, we’ll try to give reasonable notice so workspaces can save what they need. Please keep your own
        copies of anything important.
      </p>

      <h2>11. Disclaimers</h2>
      <p className="uppercase text-zinc-400">
        Crewbase is provided “as is” and “as available”, without warranties of any kind, whether express or implied, including
        warranties of merchantability, fitness for a particular purpose, non-infringement, or that the service will be accurate,
        secure, uninterrupted or error-free. Activity tracking, rank syncing and other automated features may be wrong or
        incomplete, so check anything important before relying on it.
      </p>

      <h2>12. Limitation of liability</h2>
      <p className="uppercase text-zinc-400">
        To the fullest extent allowed by law, Crewbase and its operator and volunteers won’t be liable for any indirect,
        incidental, special, consequential or punitive damages, or for any loss of data, ranks, game progress, revenue or
        goodwill, arising from your use of Crewbase. Our total liability for any claim relating to Crewbase is limited to fifty
        U.S. dollars (US$50). Some places don’t allow these limits, so they may not fully apply to you.
      </p>

      <h2>13. Ending your use</h2>
      <p>
        You can stop using Crewbase at any time and ask us to delete your account at <ContactEmail />. Sections of these Terms
        that by their nature should continue after your account ends (such as sections 5, 7, 11, 12 and 14) will continue.
      </p>

      <h2>14. Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of {LEGAL.governingState} and applicable U.S. federal law, without
        regard to conflict-of-law rules. Any dispute will be handled in the state or federal courts located in{" "}
        {LEGAL.governingState}, unless the law where you live gives you the right to bring a claim somewhere else. Before filing
        any claim, please contact us first so we can try to sort it out informally.
      </p>

      <h2>15. Changes to these Terms</h2>
      <p>
        We may update these Terms. If we make important changes, we’ll let you know on the site before they take effect. If you
        keep using Crewbase after the changes take effect, you accept the updated Terms.
      </p>

      <h2>16. Contact</h2>
      <p>
        Questions about these Terms? Email <ContactEmail />.
      </p>
    </LegalLayout>
  );
}
