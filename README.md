# DinosaurAI

Games & fun apps studio. Live at [dinosaurai.vercel.app](https://dinosaurai.vercel.app)

---

## Games

| Game | Path | Status |
|------|------|--------|
| DinoSoar | `/public/dinosoar.html` | Live |
| DinoCrush | `/public/dinocrush.html` | Live |
| DinoBlox | `/src/app/dinoblox` | Live |
| Rex Run | — | Coming Soon |
| Fossil Hunt | — | In Progress |

---

## Dev

```bash
npm run dev      # Next.js dev server
npm run build    # Production build
npx cap sync ios # Push web changes to Xcode
npx cap open ios # Open Xcode
```

---

## DinoSoar — iOS App Store

### Bundle ID
`com.dinosaurai.dinosoar`

### Capacitor setup (already done)
- Capacitor 7 + `@openforge/capacitor-game-connect@5`
- `public/index.html` → redirects to `dinosoar.html` (Capacitor entry point)
- After any JS changes: `npx cap sync ios`

### Game Center leaderboard
Leaderboard ID: `com.dinosaurai.dinosoar.hiscore`

**Xcode steps:**
1. Open `ios/App/App.xcworkspace` in Xcode (or `npx cap open ios`)
2. Select the App target → **Signing & Capabilities**
3. Set your Apple Developer Team
4. Click **+ Capability** → add **Game Center**

**App Store Connect steps:**
1. Create a new App with bundle ID `com.dinosaurai.dinosoar`
2. Features → Game Center → **Leaderboards** → Add Leaderboard
   - Type: Classic
   - Leaderboard ID: `com.dinosaurai.dinosoar.hiscore`
   - Score format: Integer (higher is better)
3. Enable Game Center for the app

**Before submitting:**
- Replace app icon in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Set minimum deployment target to iOS 16 (already set in Podfile)
- Test on a real device (Game Center requires a signed device)
