/**
 * Pure unit tests for multi-tab conflict detection (no Vite PNG asset graph).
 * Run: npm run test:conflict
 */
import assert from "node:assert/strict";
import type { TPortfolioData } from "../src/types/portfolio";
import { defaultTheme3d } from "../src/constants/theme3d";
import {
  buildTabConflict,
  conflictFromPeerDraft,
  preferPeerDraft,
  recoverySnapshotLabel,
  shouldSurfaceConflict,
} from "../src/utils/history/tabConflict";
import { portfolioFingerprint } from "../src/utils/history/fingerprint";

function sample(name = "Test User"): TPortfolioData {
  return {
    config: {
      html: {
        title: `${name} — 3D Portfolio`,
        fullName: name,
        email: "t@example.com",
      },
      hero: { name, p: ["line one", "line two"] },
      contact: {
        p: "Get in touch",
        h2: "Contact.",
        form: {
          name: { span: "Name", placeholder: "Name" },
          email: { span: "Email", placeholder: "Email" },
          message: { span: "Message", placeholder: "Message" },
        },
      },
      sections: {
        about: { p: "Intro", h2: "Overview.", content: "About me." },
        experience: { p: "Work", h2: "Experience." },
        feedbacks: { p: "Quotes", h2: "Testimonials." },
        works: { p: "Work", h2: "Projects.", content: "Projects intro." },
      },
    },
    navLinks: [{ id: "about", title: "About" }],
    services: [{ title: "Engineer", icon: "data:image/svg+xml,x" }],
    technologies: [
      { name: "TypeScript", icon: "data:image/png;base64,aaa" },
      { name: "React", icon: "data:image/png;base64,bbb" },
    ],
    experiences: [
      {
        title: "Engineer",
        companyName: "Acme",
        icon: "data:image/svg+xml,c",
        iconBg: "#000",
        date: "2020 – Present",
        points: ["Shipped things."],
      },
    ],
    testimonials: [],
    projects: [
      {
        name: "Demo",
        description: "A demo project",
        tags: [{ name: "react", color: "blue-text-gradient" }],
        image: "data:image/svg+xml,p",
        sourceCodeLink: "https://github.com/",
      },
    ],
    meta: { github: "https://github.com/test" },
    theme3d: {
      ...defaultTheme3d,
      palette: name === "RecoverMe" ? "aurora" : defaultTheme3d.palette,
      heroScene:
        name === "RecoverMe" ? "abstract_core" : defaultTheme3d.heroScene,
    },
  };
}

let passed = 0;
function ok(label: string) {
  passed++;
  console.log(`  ok  ${label}`);
}

console.log("tab-conflict");

{
  const live = sample("Live");
  const liveFp = portfolioFingerprint(live);
  assert.equal(
    shouldSurfaceConflict({
      profileId: "p1",
      localDraftFp: liveFp,
      liveFp,
      isDirty: false,
      remoteFp: portfolioFingerprint(sample("Other")),
      kind: "applied",
    }),
    false
  );
  ok("clean draft does not surface applied conflict");
}

{
  assert.equal(
    shouldSurfaceConflict({
      profileId: "p1",
      localDraftFp: portfolioFingerprint(sample("MyDraft")),
      liveFp: portfolioFingerprint(sample("Live")),
      isDirty: true,
      remoteFp: portfolioFingerprint(sample("OtherTab")),
      kind: "applied",
    }),
    true
  );
  ok("dirty + remote applied surfaces conflict");
}

{
  const draft = sample("Same");
  const fp = portfolioFingerprint(draft);
  assert.equal(
    shouldSurfaceConflict({
      profileId: "p1",
      localDraftFp: fp,
      liveFp: portfolioFingerprint(sample("Live")),
      isDirty: true,
      remoteFp: fp,
      kind: "draft",
    }),
    false
  );
  ok("identical peer draft does not surface");
}

{
  const c = buildTabConflict({
    profileId: "p1",
    localDraftFp: "a",
    liveFp: "b",
    isDirty: true,
    remoteFp: "c",
    kind: "draft",
    label: "test",
    peerDraft: sample("Peer"),
    peerDraftUpdatedAt: 100,
  });
  assert.equal(c.kind, "draft");
  assert.equal(c.fingerprint, "c");
  assert.ok(c.peerDraft);
  assert.equal(c.peerDraft!.theme3d.palette, defaultTheme3d.palette);
  ok("buildTabConflict retains peer payload + 3D settings");
}

{
  assert.equal(preferPeerDraft({ localUpdatedAt: 1, peerUpdatedAt: 2 }), true);
  assert.equal(preferPeerDraft({ localUpdatedAt: 5, peerUpdatedAt: 2 }), false);
  ok("preferPeerDraft uses timestamps");
}

{
  const peer = sample("PeerDraft");
  peer.theme3d = { ...peer.theme3d, palette: "warm", enabled: true };
  const conflict = conflictFromPeerDraft({
    profileId: "p1",
    localDraftFp: portfolioFingerprint(sample("Mine")),
    liveFp: portfolioFingerprint(sample("Live")),
    isDirty: true,
    peer: {
      v: 1,
      updatedAt: 123,
      baseFingerprint: "base",
      data: peer,
    },
  });
  assert.ok(conflict);
  assert.equal(conflict!.kind, "draft");
  assert.equal(conflict!.peerDraft!.theme3d.palette, "warm");
  assert.equal(conflict!.peerDraftUpdatedAt, 123);
  ok("conflictFromPeerDraft preserves 3D theme on peer draft");
}

{
  const none = conflictFromPeerDraft({
    profileId: "p1",
    localDraftFp: "x",
    liveFp: "y",
    isDirty: true,
    peer: null,
  });
  assert.equal(none, null);
  ok("missing peer yields no conflict");
}

{
  const label = recoverySnapshotLabel("My safety snapshot");
  assert.equal(label, "My safety snapshot");
  assert.ok(recoverySnapshotLabel().includes("Recovered draft"));
  ok("recoverySnapshotLabel formats safety snapshot titles");
}

console.log(`\n${passed} passed`);
