# RELEASE.md — how a human ships Poker Golf

## 0. What you're shipping

A fully offline, single-bundle web game wrapped with Capacitor. No servers, no
accounts, no analytics, no ads, no IAP wired yet (business model D9: free +
single unlock — the store-side IAP is created at submission time and gated in
`src/ui/store.ts` where tier > 1 runs start).

## 1. Build the web bundle

```bash
npm install
npm test                 # 438 tests must be green
npm run build            # → dist/index.html (single file, ~1 MB)
```

## 2. iOS

```bash
npm install -D @capacitor/ios
npx cap add ios          # generates ios/ (needs Xcode + CocoaPods)
npx cap sync ios
npx capacitor-assets generate --ios   # icons/splash from resources/*.svg
npx cap open ios
```

In Xcode: set the team, bundle id `com.flushdraw.pokergolf`, portrait-only
(all orientations off except Portrait), background modes off. Archive →
App Store Connect.

App Store Connect: copy from `STORE.md`; privacy questionnaire answers are all
"No data collected" (see `PRIVACY.md`); age rating: simulated gambling = NO
(no wagering, no currency, poker hands are a movement mechanic — precedent:
Balatro's rating appeal; declare "Infrequent/Mild Simulated Gambling" if the
reviewer pushes back).

## 3. Android

```bash
npm install -D @capacitor/android
npx cap add android
npx cap sync android
npx capacitor-assets generate --android
cd android && ./gradlew bundleRelease
```

Sign with your upload key, upload the AAB to Play Console, copy from
`STORE.md`, Data Safety form: no data collected/shared.

## 4. Store listing

Everything a listing needs — name, subtitle, description, keywords,
screenshot plan — is in `STORE.md`.

## 5. Post-submit smoke checklist

- [ ] Cold start < 2 s to the title screen on an iPhone 11 / Pixel 5a
- [ ] Airplane mode: full run start-to-finish works
- [ ] Kill the app mid-stroke → relaunch → CONTINUE RUN resumes exactly
- [ ] The 90-Yard Lesson plays for a fresh install
- [ ] Daily locks after one attempt; date rolls at UTC midnight
- [ ] Reduced motion + text scaling + four-color deck all apply

## 6. Known gaps at submission (be honest with yourself)

Tracked in DECISIONS D34: four of six courses, modifier cards, the four
interactive-declaration caddies, the Green Fees cosmetic shop, and the
achievement-gated unlock system are post-launch content on existing hooks.
Clubs are currently all unlocked. None of these block a submission; all are
listed so nobody "discovers" them in review.
