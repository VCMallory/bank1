# Design QA

## Comparison target

User-supplied screenshot set, especially accounts (`codex-clipboard-f38e4229-5314-49f5-91c3-aa4b244fea80.png`), detail (`codex-clipboard-d6500047-5c37-4599-9b4a-02d9fed5b81c.jpg`), and profile (`codex-clipboard-cbce4887-b6db-42fb-9897-fe2ae5274f1d.jpg`) under C:/Users/cpp/AppData/Local/Temp/.

Implementation: browser-rendered http://localhost:4173/, with device screen measured at 393 × 852 CSS pixels, density 1. The browser viewport was 1400 × 1100 for unscaled capture; screenshot clip was the device screen only. Source images were normalized from 1290 × 2796 or 1280 × 2774 pixels to 393 × 852. The source is an iOS screenshot without a hardware cutout; the template preserves its device chrome, live clock and home indicator.

Evidence is in artifacts/qa/: accounts-final.jpg, detail-final.jpg, mine-final.jpg, home-final.jpg, finance-final.jpg. Full-view side-by-side comparisons: accounts-comparison-final.jpg, detail-comparison-final.jpg, mine-comparison-final.jpg. Native full-screen entry: native-home.jpg and native-loan.jpg at approximately 393 × 852 CSS pixels (browser reports 394 px after viewport rounding). No horizontal document overflow or broken images in tested native routes.

## Findings and fixes

1. P1, preview only: focusing bottom navigation could scroll the outer device screen and reveal a translated closed keyboard. Fixed by clipping transformed overflow in prototype.css without modifying protected runtime files. Rechecked device screen scrollTop=0 and runtime integrity passed.
2. P2, account cards: account typography and row heights were too large. Reduced bank and number text, balance padding, action-row padding; replaced two service icons with extracted matching assets. Post-fix comparison: accounts-comparison-final.jpg.
3. P2, transaction detail: hero amount and detail-row rhythm were too large. Reduced amount from 32 to 28px and detail-row text/padding; rechecked detail-comparison-final.jpg.
4. P1, preview only: simulated keyboard remained after demo login. Added an app-owned navigation callback to hide it before route/tab/login changes. Reloaded, logged in, switched routes and verified keyboard=false. The native entry does not use the simulated keyboard.
5. P2, data robustness: guarded login storage access; included transaction months in filter choices; image edits now share one account-image source. Type checking and data tests passed.

## Required fidelity surfaces

- Typography: Chinese system font stack, matched hierarchy and amount formatting. Windows and iOS font rendering differ slightly; source screenshots are not a guarantee of pixel-identical text rendering.
- Spacing/layout: main five-tab order, white cards, gold/red/blue headers, account actions, loan expansion and detail rows compared at normalized density. The device shell is intentionally retained.
- Colors/tokens: gold #bd9d59, red #db2b26, teal transaction outflow and blue liability styling follow the references. Source raster assets are reused.
- Image quality: 70 supplied-source assets, crops recorded in app/public/assets/reference/assets-manifest.json. No red annotations rendered. File upload replacement and restoration verified, including persistence after reload.
- Copy/content: private names/phone replaced with demo values; persistent demo badge and help entry are intentional. Core account/loan/transaction labels follow the references.

P3 follow-up: some decorative payment-card illustrations, header controls and minor spacing are simplified; security icons obscured in the source are represented with library icons. This is a usable demonstration replica, not a claim of literal pixel-for-pixel identity.

## Browser interaction evidence

- Home → loan → my loans → expand/collapse → borrowing records → repay demonstration.
- Saved loan principal 1,234,500.00, reloaded and verified persistence, then restored defaults.
- My → asset/bill visibility toggles → accounts → account details → transaction detail.
- October two records, November empty, added test transaction 88.88, edited and deleted through the confirmation UI.
- Held an account balance for 850ms; account edit dialog appeared.
- Selected local image through file chooser, saved, reloaded, verified data URL persisted, restored original.
- Demo login form and consent control completed; no password stored.
- Native entry account editing 0.06 → 0.08 → 0.06 verified.
- Browser error logs checked: no errors in final tested routes.

## Checks

- TypeScript: passed.
- Data validation tests: 12 passed.
- Protected mobile runtime integrity: 28 files passed.
- Native web build: passed.
- Android APK: built and signature/content verified; no Android emulator or real-device run available.
- iOS: macOS GitHub Actions built iphoneos arm64 unsigned IPA; package and binary validation passed; no iPhone installation test.

All identified P1/P2 functional and layout defects above were fixed. P3 differences and deliberate demonstration constraints are recorded, so this pass accepts the local demonstration scope, not strict pixel identity.

## 2026-11-15 login-gate revision

- Renamed the identifiable demonstration app to 丰收互联（演示）, with an original blue/green river icon carrying a large permanent 演示 label. Official indistinguishable branding and removal of all demonstration identity were not implemented.
- Removed the permanent long-press hint button and empty-image/empty-loan long-press text; the gesture and data manager remain available after login.
- Centralized navigation, all tab destinations, editing via long press/context menu/F2, and editor mounting behind the local demo session gate. Only home/login are public; unknown routes are private.
- Login resumes the exact requested route or image editor. Logout clears protected page history, editor, pending action, form fields and visible-balance state, then returns home. Cross-tab logout is handled.
- Browser checks: logged out then opened finance/loan/life/mine; each showed login, with zero account/loan/transaction/asset nodes. Cancelled login returns home. Home transfer required login then resumed transfer. Home hero context-menu edit required login then resumed the matching image editor. No browser error logs.
- Evidence: artifacts/qa/login-gate-home.jpg and login-gate-required.jpg; normalized 393×852 device screen at 1400×1100 browser viewport. No page layout changes beyond the removed hint.
- TypeScript passed; model 12 + session 8 = 20 tests passed; all 28 protected runtime hashes passed.
- This remains local demonstration access control, without banking authentication or claims of data encryption.

final result: passed


## v1.4 video home comparison

Source: user-supplied video(31).mp4, 592×1280 / 30fps / 13.17s. Reference frames 0.00s and 3.29s were normalized to430×930. Implementation captures use the real native.tsx entry through a test-only fixture at430×930 with the recording's50px top and34px bottom insets. The production entry uses the actual env(safe-area-inset-*) values. Actual OS clock, signal and camera chrome are excluded from the50px comparison crop and never recreated as app markup.

Evidence (same-scale paired inputs inspected): artifacts/home-video-comparison-top-v1.4.jpg and artifacts/home-video-comparison-mid-v1.4.jpg. Initial mismatch evidence: artifacts/home-video-comparison-before.jpg. Focused surfaces: fixed top toolbar and quick icons, service grid, hero/promotion imagery and civic/life card spacing.

Earlier P2 findings and post-fix verification:
- Old light-blue shortcut assets left boxes against the deeper source blue. Replaced with video-native crops; verified in final top pair.
- Hero/menu/civic spacing and undersized service icons drifted. The hero now starts at190px and ends near337px; civic card starts near724px versus approximately725px in the reference; service icons/menu typography were aligned without changing region height.
- Native vertical scrolling stopped when the pointer was over the horizontal promotion rail. Restored vertical scroll chaining in app-owned native.css, verified by in-app browser scroll, dedicated wheel/CDP touch regression, and compact toolbar state.

Five required fidelity surfaces:
- Typography: native -apple-system/PingFang with existing Windows fallback, source-sized service labels and section headings; CJK rasterization differs in the Windows preview (P3).
- Spacing/layout: full-width hero, fixed safe-area toolbar, matching top/mid card positions, persistent five-tab labels. Header remains at y=0 while scroll changes; controls stay below the safe inset.
- Colors/tokens: source-sampled blue #2d78f6 covers the topmost pixel; native iOS SystemBarsStyle.Dark selects light real status-bar content, other pages restore dark content.
- Images: original video crops and labels retained; existing public graphic assets reused where appropriate; all25 video asset dimensions/bounds/hashes checked. The occluded third news thumbnail uses an unobscured crop of the same video's double11 art (P3).
- Copy/content: video sections and service labels reproduced as editable/interactive UI where appropriate, with existing route behavior. The rotating source headline uses a fixed seed item in this implementation (P3).

Accepted P3 differences: source recording's time/signal are OS-owned and not drawn in the browser; existing selected bottom-tab logo size is preserved; the partially visible gold civic neighbor and transient floating promotion are omitted; small icon-library/header-spacing differences remain. These do not block the requested full-bleed status background or homepage navigation/scroll behavior.

Verification: browser meaningful-content/identity checks, no framework overlay, no console warnings/errors; service navigation and return, top-to-compact state and scroll position checked. Local native suite10 tests plus the new rail-gesture test passed. Protected runtime28 files unchanged. CI WebKit runs the same supported layout/hold suite; trusted mobile pan injection is Chromium-only and iPhone hardware is not covered.

No unresolved P0/P1/P2 findings in the requested app-owned top and compact home states.
final result: passed
