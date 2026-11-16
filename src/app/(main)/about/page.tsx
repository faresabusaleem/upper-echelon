import Link from "next/link";
import type { Metadata } from "next";
import { Document } from "@/components/legal/document";
import { TIERS } from "@/lib/tiers";
import { GAME_LIST } from "@/lib/games/catalog";

export const metadata: Metadata = {
  title: "About",
  description: "What Upper Echelon is, how the Arena measures, how the Directory is curated, and how the ranks work.",
};

export default function AboutPage() {
  return (
    <Document title="About the society" lede="A quiet place for people who enjoy thinking hard and being measured honestly.">
      <p>
        Upper Echelon is open to anyone aged thirteen or older. There is no entrance exam and no fee. The feeling of
        exclusivity is earned, not bought: your standing rises with what you do here.
      </p>

      <h2>The Arena</h2>
      <p>
        Eight standard tasks from cognitive psychology: {GAME_LIST.map((g) => g.name).join(", ")}. Each is timed with
        your browser’s high-resolution clock (<code>performance.now()</code>). When a member finishes a trial, the raw
        observations are sent to the server, which recalculates the score, checks it against the rules of the task and
        against the time that actually passed, and only then stores it. Results that are physically implausible are
        flagged, kept off the leaderboards and reviewed by a moderator.
      </p>
      <p>
        Percentiles compare your best result with the best results of every member who has played that trial. They are
        not population norms, and none of these trials is an intelligence test.
      </p>

      <h2>The Directory</h2>
      <p>
        A catalogue of renowned intelligence tests, beginning with Mensa Norway and the tests listed by other authors on
        iq-tests-for-the-high-range.com. We host no test questions. Every entry links to its official source, and facts
        are taken from that source; where an author does not state something, we say so. Difficulty is an editorial
        estimate. Results logged by members are self-reported and marked as such.
      </p>

      <h2>The Forum</h2>
      <p>
        Rooms for psychometrics, test discussions, puzzles, mathematics, philosophy, science, books, advice,
        introductions and everything else, plus the Inner Room for members of the third tier and above. The only seeded
        posts are a few welcome threads from the official staff account, clearly labelled as such.
      </p>

      <h2 id="ranks">How the ranks work</h2>
      <p>Your Echelon score runs from 0 to 1,000 and has three parts:</p>
      <ul>
        <li>
          <strong>Mind, up to 500.</strong> Each trial converts your best result into a rating from 0 to 100 using a
          fixed reference scale. Mind is five times the average of your eight ratings; a trial you have not played counts
          as zero.
        </li>
        <li>
          <strong>Practice, up to 250.</strong> 2.5 points for every distinct day (UTC) on which you saved at least one
          result, up to 100 days.
        </li>
        <li>
          <strong>Voice, up to 250.</strong> Your reputation: 2 for each upvote your threads and replies receive, 15 for
          each reply marked as the answer in an advice thread.
        </li>
      </ul>
      <p>Tiers follow the score. A tier, once reached, is kept.</p>
      <table>
        <thead>
          <tr>
            <th>Tier</th>
            <th>Name</th>
            <th>From</th>
            <th>Opens</th>
          </tr>
        </thead>
        <tbody>
          {TIERS.map((t) => (
            <tr key={t.tier}>
              <td>{t.numeral}</td>
              <td>{t.name}</td>
              <td>{t.threshold}</td>
              <td>
                {t.theme.charAt(0).toUpperCase() + t.theme.slice(1)} profile theme
                {t.tier === 3 ? "; the Inner Room" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Marks (achievements) are awarded for milestones such as a first trial, a seven-day streak, ten personal bests, a
        first thread, fifty upvotes or an accepted answer. Choose which to show on your profile in{" "}
        <Link href="/settings/profile">settings</Link>.
      </p>

      <h2>The mark</h2>
      <p>
        Our emblem is an engraving of a head divided by the three planes of anatomy: sagittal, coronal and transverse.
        It stands for looking at the mind from more than one side.
      </p>

      <h2>Contact</h2>
      <p>
        See the <Link href="/contact">contact page</Link>. To raise a concern about content or a member, use the report
        tools; they reach the moderators directly.
      </p>
    </Document>
  );
}
