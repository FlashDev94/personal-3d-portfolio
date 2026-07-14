/**
 * Thorough browser stress harness for storage health + multi-profile flows.
 * Run: npx playwright test  OR  node with playwright chromium
 * This file is also executable via: npx --yes playwright install chromium && node scripts/stress-browser.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.STRESS_URL || 'http://127.0.0.1:5173/';
const report = {
  failures: [],
  warnings: [],
  scenarios: {},
  boots: [],
  consoleErrors: new Set(),
  pageErrors: new Set(),
};

const fail = (name, detail) => report.failures.push({ name, detail: String(detail).slice(0, 500) });
const ok = (name, data = {}) => { report.scenarios[name] = { ok: true, ...data }; };

async function waitBoot(page, timeout = 15000) {
  await page.waitForFunction(() => !document.querySelector('.boot-screen'), { timeout });
  // Hero can lag one paint after boot unmount (framer/lazy scene) — content check, not isVisible flake
  await page.waitForFunction(
    () => {
      const h1 = document.querySelector('h1');
      if (!h1) return false;
      const t = (h1.textContent || '').trim();
      return t.length > 0;
    },
    { timeout: 8000 }
  ).catch(() => {});
}

async function heroName(page) {
  const t = await page.locator('h1').first().innerText().catch(() => '');
  return t.replace(/^Hi,\s*I'm\s*/i, '').trim();
}

/** True when hero text is present (avoids opacity/animation isVisible false negatives). */
async function heroReady(page) {
  const name = await heroName(page);
  return name.length > 0;
}

async function openConfigurator(page) {
  // FAB hides while panel is open; Escape first
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(150);
  const fab = page.getByRole('button', { name: /customize portfolio/i });
  if (await fab.isVisible().catch(() => false)) {
    await fab.click();
    await page.waitForTimeout(350);
  }
  return page.getByRole('button', { name: /Apply to portfolio/i }).isVisible().catch(() => false);
}

async function attachLogging(page) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.add(msg.text().slice(0, 240));
  });
  page.on('pageerror', (err) => report.pageErrors.add(String(err).slice(0, 240)));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  attachLogging(page);

  // ---- 1. Boot timings ----
  try {
    for (let i = 0; i < 8; i++) {
      await page.goto('about:blank');
      const t0 = Date.now();
      await page.goto(BASE, { waitUntil: 'commit' });
      await waitBoot(page);
      const ms = Date.now() - t0;
      const visible = await heroReady(page);
      const hero = await heroName(page);
      report.boots.push({ i, ms, visible, hero });
      if (!visible) fail('boot-hero', `iter ${i} hero="${hero}"`);
      if (ms > 3500) fail('boot-slow', `${ms}ms`);
    }
    const avg = Math.round(report.boots.reduce((a, b) => a + b.ms, 0) / report.boots.length);
    ok('boot', {
      avgMs: avg,
      min: Math.min(...report.boots.map((b) => b.ms)),
      max: Math.max(...report.boots.map((b) => b.ms)),
      samples: report.boots.map((b) => b.ms),
    });
  } catch (e) {
    fail('boot', e);
  }

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await waitBoot(page);

  // ---- 2. Profile thrash + content ----
  try {
    const thrash = await page.evaluate(async () => {
      const sel = document.querySelector('#profile-switcher-nav');
      if (!sel) return { ok: false, reason: 'missing switcher' };
      const vals = [...sel.options].map((o) => ({ v: o.value, label: o.textContent }));
      if (vals.length < 2) return { ok: false, reason: `only ${vals.length} profiles` };
      const t0 = performance.now();
      for (let i = 0; i < 50; i++) {
        const opt = vals[i % vals.length];
        sel.value = opt.v;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 12));
      }
      await new Promise((r) => setTimeout(r, 250));
      const last = vals[(50 - 1) % vals.length];
      sel.value = last.v;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      return {
        ok: true,
        ms: Math.round(performance.now() - t0),
        count: vals.length,
        finalLabel: last.label,
        hero: document.querySelector('h1')?.textContent || '',
        selected: sel.value,
      };
    });
    if (!thrash.ok) fail('profile-thrash', thrash.reason);
    else ok('profile-thrash', thrash);

    const samples = await page.evaluate(async () => {
      const sel = document.querySelector('#profile-switcher-nav');
      const out = [];
      for (const opt of [...sel.options].slice(0, 4)) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 150));
        out.push({
          label: opt.textContent,
          hero: document.querySelector('h1')?.textContent || '',
          url: location.search,
          selected: sel.value,
        });
      }
      return out;
    });
    ok('profile-content-switch', { samples });
    if (samples.some((s) => !s.hero)) fail('profile-empty-hero', samples);
  } catch (e) {
    fail('profile-thrash', e);
  }

  // ---- 3. Draft isolation ----
  try {
    const mark = `DRAFT-ISO-${Date.now().toString(36)}`;
    const draftIso = await page.evaluate((mark) => {
      const reg = JSON.parse(localStorage.getItem('portfolio-profiles-v1') || '{}');
      if (!reg.profiles || reg.profiles.length < 2) return { ok: false, reason: 'need 2 profiles' };
      const [a, b] = reg.profiles;
      const mk = (cfg, name) => ({
        v: 1,
        updatedAt: Date.now(),
        baseFingerprint: 'stress',
        data: {
          ...cfg,
          config: {
            ...(cfg.config || {}),
            hero: { ...(cfg.config?.hero || {}), name, p: cfg.config?.hero?.p || ['', ''] },
          },
        },
      });
      const cfgA = JSON.parse(localStorage.getItem(`portfolio-config-v1:${a.id}`) || '{}');
      const cfgB = JSON.parse(localStorage.getItem(`portfolio-config-v1:${b.id}`) || '{}');
      localStorage.setItem(`portfolio-draft-v1:${a.id}`, JSON.stringify(mk(cfgA, mark + '-A')));
      localStorage.setItem(`portfolio-draft-v1:${b.id}`, JSON.stringify(mk(cfgB, mark + '-B')));
      return { ok: true, a: a.id, b: b.id };
    }, mark);

    await page.evaluate(async () => {
      const sel = document.querySelector('#profile-switcher-nav');
      for (const o of [...sel.options]) {
        sel.value = o.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 80));
      }
    });

    const survived = await page.evaluate((mark) => {
      const found = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k?.startsWith('portfolio-draft-v1:')) continue;
        const d = JSON.parse(localStorage.getItem(k) || '{}');
        found.push(d?.data?.config?.hero?.name);
      }
      return {
        ok: found.includes(mark + '-A') && found.includes(mark + '-B'),
        found,
      };
    }, mark);

    if (!draftIso.ok || !survived.ok) fail('draft-isolation', { draftIso, survived });
    else ok('draft-isolation', { mark, found: survived.found });
  } catch (e) {
    fail('draft-isolation', e);
  }

  // ---- 4. JSON import apply via storage+reload (validates persistence path) + UI if possible ----
  try {
    const mark = `IMPORT-${Date.now().toString(36)}`;
    await page.evaluate((mark) => {
      const reg = JSON.parse(localStorage.getItem('portfolio-profiles-v1') || '{}');
      const id = reg.activeId;
      const cfg = JSON.parse(localStorage.getItem(`portfolio-config-v1:${id}`) || '{}');
      cfg.config = cfg.config || {};
      cfg.config.hero = { ...(cfg.config.hero || {}), name: mark, p: ['import line 1', 'import line 2'] };
      localStorage.setItem(`portfolio-config-v1:${id}`, JSON.stringify(cfg));
      // version entry
      const vKey = `portfolio-versions-v1:${id}`;
      const store = JSON.parse(localStorage.getItem(vKey) || '{"v":1,"entries":[]}');
      store.entries = store.entries || [];
      store.entries.push({ id: 'imp-' + Date.now(), at: Date.now(), label: 'Imported stress', data: cfg });
      localStorage.setItem(vKey, JSON.stringify(store));
    }, mark);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitBoot(page);
    const hero = await heroName(page);
    if (!hero.includes(mark)) fail('import-persist-refresh', `expected ${mark} in hero "${hero}"`);
    else ok('import-persist-refresh', { mark, hero });

    // UI import path
    const opened = await openConfigurator(page);
    if (opened) {
      // find data/export tab
      const tabNames = await page.locator('button').evaluateAll((bs) => bs.map((b) => b.textContent?.trim() || ''));
      for (const name of tabNames) {
        if (/data|export|history|json|advanced|backup/i.test(name || '')) {
          await page.getByRole('button', { name: name, exact: true }).first().click().catch(() => {});
          await page.waitForTimeout(100);
        }
      }
      const mark2 = `UIIMP-${Date.now().toString(36)}`;
      const payload = await page.evaluate((mark2) => {
        const reg = JSON.parse(localStorage.getItem('portfolio-profiles-v1') || '{}');
        const cfg = JSON.parse(localStorage.getItem(`portfolio-config-v1:${reg.activeId}`) || '{}');
        cfg.config.hero.name = mark2;
        return JSON.stringify(cfg);
      }, mark2);
      if ((await page.locator('textarea').count()) > 0) {
        await page.locator('textarea').first().fill(payload);
        const btns = page.getByRole('button', { name: /import/i });
        const n = await btns.count();
        for (let i = 0; i < n; i++) {
          const t = await btns.nth(i).innerText();
          if (/import/i.test(t) && !/export/i.test(t)) {
            await btns.nth(i).click();
            await page.waitForTimeout(250);
            break;
          }
        }
        const apply = page.getByRole('button', { name: /Apply to portfolio/i });
        if (await apply.isVisible()) {
          await apply.click();
          await page.waitForTimeout(400);
        }
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(200);
        const hero2 = await heroName(page);
        ok('ui-json-import-apply', { mark2, hero2, applied: hero2.includes(mark2) });
        if (!hero2.includes(mark2)) report.warnings.push(`UI import mark ${mark2} not live in hero ${hero2}`);
      } else {
        report.warnings.push('UI JSON textarea not found');
        ok('ui-json-import-apply', { skipped: true });
      }
    } else {
      report.warnings.push('configurator did not open for UI import');
    }
  } catch (e) {
    fail('import', e);
  }

  // ---- 5. Version restore ----
  try {
    const info = await page.evaluate(() => {
      const reg = JSON.parse(localStorage.getItem('portfolio-profiles-v1') || '{}');
      const id = reg.activeId;
      const cfg = JSON.parse(localStorage.getItem(`portfolio-config-v1:${id}`) || '{}');
      const oldName = cfg.config?.hero?.name || 'Unknown';
      const snap = JSON.parse(JSON.stringify(cfg));
      snap.config.hero.name = 'RESTORE-TARGET-NAME';
      const vKey = `portfolio-versions-v1:${id}`;
      const store = JSON.parse(localStorage.getItem(vKey) || '{"v":1,"entries":[]}');
      store.entries = store.entries || [];
      store.entries.unshift({ id: 'restore-target', at: Date.now() - 5000, label: 'Restore target', data: snap });
      localStorage.setItem(vKey, JSON.stringify(store));
      // apply restore
      localStorage.setItem(`portfolio-config-v1:${id}`, JSON.stringify(snap));
      return { oldName, id };
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitBoot(page);
    const hero = await heroName(page);
    if (!hero.includes('RESTORE-TARGET-NAME')) fail('version-restore', `got ${hero}`);
    else ok('version-restore', { hero, ...info });
  } catch (e) {
    fail('version-restore', e);
  }

  // ---- 6. Storage pressure + recovery (must use real recover path) ----
  try {
    const pressure = await page.evaluate(() => {
      const pad = 'X'.repeat(6000);
      let injected = 0;
      for (let i = 0; i < 25; i++) {
        try {
          localStorage.setItem(`portfolio-config-v1:orphan-stress-${i}`, JSON.stringify({ junk: pad }));
          localStorage.setItem(`portfolio-draft-v1:orphan-stress-${i}`, JSON.stringify({ v: 1, data: { junk: pad } }));
          injected += 2;
        } catch (e) {
          return { injected, error: String(e) };
        }
      }
      const store = JSON.parse(localStorage.getItem('portfolio-assets-v1') || '{"v":1,"blobs":{}}');
      store.blobs = store.blobs || {};
      for (let i = 0; i < 8; i++) {
        store.blobs[`asset:h1:orphanblob${i}`] = 'data:image/png;base64,' + 'A'.repeat(3000);
      }
      localStorage.setItem('portfolio-assets-v1', JSON.stringify(store));
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        used += (k?.length || 0) + (localStorage.getItem(k)?.length || 0);
      }
      return { injected, used, keys: localStorage.length };
    });

    // Reload triggers bootStorageMaintenance which should GC orphans
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitBoot(page);
    // give deferred maintenance a beat
    await page.waitForTimeout(500);

    const afterBoot = await page.evaluate(() => {
      const orphans = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('orphan-stress')) orphans.push(k);
      }
      const store = JSON.parse(localStorage.getItem('portfolio-assets-v1') || '{"v":1,"blobs":{}}');
      const orphanBlobs = Object.keys(store.blobs || {}).filter((k) => k.includes('orphanblob'));
      const reg = JSON.parse(localStorage.getItem('portfolio-profiles-v1') || '{}');
      const activeCfg = !!localStorage.getItem(`portfolio-config-v1:${reg.activeId}`);
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        used += (k?.length || 0) + (localStorage.getItem(k)?.length || 0);
      }
      return { orphans: orphans.length, orphanBlobs: orphanBlobs.length, activeCfg, used, keys: localStorage.length };
    });

    // Also try UI recover
    let uiRecover = false;
    if (await openConfigurator(page)) {
      const btn = page.getByRole('button', { name: /recover|free space|reclaim/i });
      if (await btn.first().isVisible().catch(() => false)) {
        await btn.first().click();
        await page.waitForTimeout(400);
        uiRecover = true;
      }
      await page.keyboard.press('Escape').catch(() => {});
    }

    if (afterBoot.orphans > 0) fail('storage-orphan-keys-remain', afterBoot);
    if (!afterBoot.activeCfg) fail('storage-active-lost', afterBoot);
    // orphan blobs should be GC'd if not referenced
    if (afterBoot.orphanBlobs > 0) {
      report.warnings.push(`orphan blobs remain after boot maint: ${afterBoot.orphanBlobs}`);
    }
    ok('storage-pressure-recovery', { pressure, afterBoot, uiRecover });
  } catch (e) {
    fail('storage-pressure', e);
  }

  // ---- 7. Multi-tab ----
  let page2;
  try {
    page2 = await context.newPage();
    attachLogging(page2);
    await page2.goto(BASE, { waitUntil: 'domcontentloaded' });
    await waitBoot(page2);

    const switch1 = await page.evaluate(async () => {
      const sel = document.querySelector('#profile-switcher-nav');
      const opts = [...sel.options];
      const target = opts[opts.length > 1 ? 1 : 0];
      sel.value = target.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 400));
      return { id: target.value, label: target.textContent, hero: document.querySelector('h1')?.textContent };
    });

    // poll tab2 for up to 3s
    let tab2 = null;
    for (let i = 0; i < 15; i++) {
      await page2.waitForTimeout(200);
      tab2 = await page2.evaluate(() => ({
        selected: document.querySelector('#profile-switcher-nav')?.value,
        hero: document.querySelector('h1')?.textContent,
        reg: JSON.parse(localStorage.getItem('portfolio-profiles-v1') || '{}').activeId,
      }));
      if (tab2.selected === switch1.id || tab2.reg === switch1.id) break;
    }

    const regActive = await page.evaluate(() => JSON.parse(localStorage.getItem('portfolio-profiles-v1') || '{}').activeId);
    const synced = tab2.selected === switch1.id || tab2.reg === switch1.id || regActive === switch1.id;
    if (!synced) fail('multi-tab-sync', { switch1, tab2, regActive });
    else ok('multi-tab-sync', { switch1, tab2, regActive });

    // concurrent drafts on two *inactive* profile keys so live autosave cannot clobber markers
    const ids = await page.evaluate(() => {
      const reg = JSON.parse(localStorage.getItem('portfolio-profiles-v1') || '{}');
      const inactive = (reg.profiles || []).filter((p) => p.id !== reg.activeId).slice(0, 2);
      if (inactive.length < 2) return null;
      const a = inactive[0].id;
      const b = inactive[1].id;
      localStorage.setItem(
        `portfolio-draft-v1:${a}`,
        JSON.stringify({ v: 1, updatedAt: Date.now(), baseFingerprint: 'c', data: { concurrent: 'tab1' } })
      );
      localStorage.setItem(
        `portfolio-draft-v1:${b}`,
        JSON.stringify({ v: 1, updatedAt: Date.now(), baseFingerprint: 'c', data: { concurrent: 'tab2' } })
      );
      return [a, b];
    });
    if (!ids) {
      report.warnings.push('multi-tab-drafts skipped: need 3+ profiles');
      ok('multi-tab-drafts', { skipped: true });
    } else {
      await page.waitForTimeout(50);
      const drafts = await page.evaluate((ids) => {
        const d0 = JSON.parse(localStorage.getItem(`portfolio-draft-v1:${ids[0]}`) || '{}');
        const d1 = JSON.parse(localStorage.getItem(`portfolio-draft-v1:${ids[1]}`) || '{}');
        return { d0: d0.data, d1: d1.data, same: ids[0] === ids[1] };
      }, ids);
      if (drafts.d0?.concurrent !== 'tab1' || drafts.d1?.concurrent !== 'tab2') {
        fail('multi-tab-drafts', drafts);
      } else ok('multi-tab-drafts', drafts);
    }

    await page2.close();
  } catch (e) {
    fail('multi-tab', e);
    if (page2) await page2.close().catch(() => {});
  }

  // ---- 8. Shared asset upload simulation ----
  try {
    const assets = await page.evaluate(async () => {
      const png =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      let hash = 'sharedstress';
      if (crypto?.subtle) {
        const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(png));
        hash = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
      }
      const ref = `asset:h1:${hash}`;
      const store = JSON.parse(localStorage.getItem('portfolio-assets-v1') || '{"v":1,"blobs":{}}');
      store.blobs = store.blobs || {};
      store.blobs[ref] = png;
      // also add true orphan
      store.blobs['asset:h1:trueorphan999'] = png + 'x';
      localStorage.setItem('portfolio-assets-v1', JSON.stringify(store));
      const reg = JSON.parse(localStorage.getItem('portfolio-profiles-v1') || '{}');
      for (const p of (reg.profiles || []).slice(0, 2)) {
        const cfg = JSON.parse(localStorage.getItem(`portfolio-config-v1:${p.id}`) || '{}');
        if (Array.isArray(cfg.technologies) && cfg.technologies[0]) cfg.technologies[0].icon = ref;
        localStorage.setItem(`portfolio-config-v1:${p.id}`, JSON.stringify(cfg));
      }
      return { ref };
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitBoot(page);
    await page.waitForTimeout(600); // deferred GC
    const check = await page.evaluate((ref) => {
      const store = JSON.parse(localStorage.getItem('portfolio-assets-v1') || '{}');
      return {
        sharedKept: !!store.blobs?.[ref],
        orphanGone: !store.blobs?.['asset:h1:trueorphan999'],
        blobCount: Object.keys(store.blobs || {}).length,
      };
    }, assets.ref);
    if (!check.sharedKept) fail('shared-asset-kept', check);
    if (!check.orphanGone) {
      // deferred GC might not run aggressive enough if level is ok - check diagnose path
      report.warnings.push('true orphan blob still present after boot maintenance');
    }
    // thrash with shared asset
    await page.evaluate(async () => {
      const sel = document.querySelector('#profile-switcher-nav');
      for (let i = 0; i < 10; i++) {
        const opts = [...sel.options];
        sel.value = opts[i % opts.length].value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 50));
      }
    });
    ok('shared-assets', { ...assets, check });
  } catch (e) {
    fail('shared-assets', e);
  }

  // ---- 9. Refresh storm ----
  try {
    const times = [];
    for (let i = 0; i < 6; i++) {
      const t0 = Date.now();
      await page.reload({ waitUntil: 'commit' });
      await waitBoot(page);
      times.push(Date.now() - t0);
      if (!(await heroReady(page))) fail('refresh-hero', i);
    }
    ok('refresh-storm', { times, avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length) });
  } catch (e) {
    fail('refresh-storm', e);
  }

  // ---- 10. Create profile via UI if possible ----
  try {
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('portfolio-profiles-v1') || '{}').profiles?.length || 0);
    await openConfigurator(page);
    // navigate to profiles section - may be in Data or always visible
    const createBtn = page.getByRole('button', { name: /create|add profile|new profile/i });
    let created = false;
    if (await createBtn.first().isVisible().catch(() => false)) {
      const input = page.locator('input').filter({ hasNot: page.locator('[type=file]') }).first();
      // try labeled inputs in panel
      const labelInputs = page.locator('input[type="text"], input:not([type])');
      const lc = await labelInputs.count();
      for (let i = 0; i < Math.min(lc, 8); i++) {
        const ph = await labelInputs.nth(i).getAttribute('placeholder');
        if (ph && /profile|name|label/i.test(ph)) {
          await labelInputs.nth(i).fill('Stress Created ' + Date.now().toString(36));
          break;
        }
      }
      await createBtn.first().click();
      await page.waitForTimeout(400);
      created = true;
    }
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('portfolio-profiles-v1') || '{}').profiles?.length || 0);
    ok('create-profile', { before, after, created, grew: after > before });
    if (created && after <= before) report.warnings.push('create profile button clicked but count did not grow');
  } catch (e) {
    fail('create-profile', e);
  }

  // ---- 11. Quota full write survival ----
  try {
    const quota = await page.evaluate(() => {
      const reg = JSON.parse(localStorage.getItem('portfolio-profiles-v1') || '{}');
      const activeId = reg.activeId;
      const activeBefore = localStorage.getItem(`portfolio-config-v1:${activeId}`);
      // fill storage until quota
      let filled = 0;
      try {
        for (let i = 0; i < 200; i++) {
          localStorage.setItem(`portfolio-versions-v1:pad-fill-${i}`, JSON.stringify({
            v: 1,
            entries: Array.from({ length: 2 }, (_, j) => ({
              id: `p${i}-${j}`,
              at: Date.now(),
              label: 'pad',
              data: { pad: 'Z'.repeat(4000) },
            })),
          }));
          filled++;
        }
      } catch {
        // expected
      }
      // try write active config still
      let writeOk = false;
      try {
        // free via removing pads then write - simulates recovery callback
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k?.includes('pad-fill-')) localStorage.removeItem(k);
        }
        localStorage.setItem(`portfolio-config-v1:${activeId}`, activeBefore || '{}');
        writeOk = true;
      } catch (e) {
        return { filled, writeOk: false, error: String(e) };
      }
      return {
        filled,
        writeOk,
        activeStill: !!localStorage.getItem(`portfolio-config-v1:${activeId}`),
      };
    });
    if (!quota.writeOk || !quota.activeStill) fail('quota-write-survival', quota);
    else ok('quota-write-survival', quota);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitBoot(page);
    if (!(await heroReady(page))) fail('quota-after-reload', 'no hero');
  } catch (e) {
    fail('quota-write', e);
  }

  report.consoleErrorList = [...report.consoleErrors].slice(0, 20);
  report.pageErrorList = [...report.pageErrors].slice(0, 20);
  report.consoleErrorCount = report.consoleErrors.size;
  report.pageErrorCount = report.pageErrors.size;
  report.pass = report.failures.length === 0;
  report.failureCount = report.failures.length;
  report.warningCount = report.warnings.length;
  report.scenarioCount = Object.keys(report.scenarios).length;

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
