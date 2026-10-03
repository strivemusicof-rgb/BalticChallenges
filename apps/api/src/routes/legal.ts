import type { RoutePlugin } from '../http.js';
import { CURRENT_TERMS_VERSION } from '../services/users.js';

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

function page(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)} · Baltic Challenges</title>
<style>
  body{font:16px/1.6 system-ui,-apple-system,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#11181c}
  h1{color:#0B5C7A;line-height:1.2} h2{margin-top:2em} .draft{background:#fff4e0;border-left:4px solid #F2A541;padding:8px 12px}
  @media (prefers-color-scheme:dark){body{background:#0d1416;color:#ecedee}.draft{background:#3a2c12}}
</style></head><body>
<h1>${escape(title)}</h1>
<p class="draft">Draft version ${CURRENT_TERMS_VERSION}. This text is pending legal review before public launch.</p>
${body}
</body></html>`;
}

export const legalRoutes: RoutePlugin = (app, { config }) => {
  const contact = config.SUPPORT_EMAIL
    ? `<a href="mailto:${escape(config.SUPPORT_EMAIL)}">${escape(config.SUPPORT_EMAIL)}</a>`
    : 'the in-app support option';

  const privacy = page(
    'Privacy Policy',
    `
<p>Baltic Challenges ("we") helps you discover places in Latvia, Lithuania and Estonia. This policy explains what we
collect and why. We follow the EU General Data Protection Regulation (GDPR).</p>
<h2>What we collect</h2>
<ul>
<li><b>Account data</b>: email address or Apple/Google sign-in identifier, display name, optional bio and avatar.</li>
<li><b>Preferences</b>: interests, difficulty, countries, privacy and notification settings.</li>
<li><b>Location</b>: only while the app is open and only when you check in to a challenge or look for nearby
challenges. Check-in coordinates, accuracy and time are stored to verify completions and prevent cheating.
We do not track you in the background.</li>
<li><b>Photos and posts</b> you choose to share. Photos are re-encoded on upload, which removes EXIF metadata including
GPS coordinates.</li>
<li><b>Gameplay</b>: completed challenges, XP, achievements, follows, likes, comments, reports.</li>
<li><b>Technical data</b>: IP address and request logs kept for security for up to 30 days.</li>
</ul>
<h2>Why we use it</h2>
<p>To run the game (contract), to keep it fair and safe (legitimate interest), and — only if you allow it — to send
notifications (consent). We do not sell personal data. Precise check-in locations are never shown to other users;
posts show a place name only if you choose to.</p>
<h2>Where it is stored</h2>
<p>On servers in the European Union (OVHcloud). Photos are stored on the same infrastructure.</p>
<h2>Your rights</h2>
<p>You can view and edit your data in the app, export it on request, and delete your account at any time from
Profile → Settings → Delete account, which permanently removes your account, posts, photos and progress.
You can also contact ${contact} or your local data-protection authority.</p>
<h2>Children</h2>
<p>You must be at least 16 years old, or have consent from a parent or guardian, to create an account.</p>`,
  );

  const terms = page(
    'Terms of Use',
    `
<h2>Play safely</h2>
<p>Challenges take place in the real world. You are responsible for your own safety. Respect private property,
closures, opening hours, nature-protection rules and local laws. Never enter dangerous or restricted areas for a
challenge, check weather and conditions, and do not use the app while driving. Challenge information may be
out of date; always follow signs on site.</p>
<h2>Fair play</h2>
<p>Do not fake your location, use automation, or share accounts. Suspicious completions may be reviewed and XP removed.
Repeated cheating leads to suspension.</p>
<h2>Community rules</h2>
<p>No harassment, hate, sexual content, violence, spam, or content that shows other people without consent.
Do not post private home locations. You can report and block anyone. We may remove content and suspend accounts
that break these rules.</p>
<h2>Your content</h2>
<p>You keep ownership of what you post. You give us a licence to display it in the app for as long as it is shared.
Deleting a post or your account removes it.</p>
<h2>Subscriptions</h2>
<p>Paid features, when offered, are billed by Apple or Google and can be managed or cancelled in your store account.</p>
<h2>Liability</h2>
<p>The service is provided as is. To the extent permitted by law we are not liable for injury, loss or damage that
results from visiting places or taking part in challenges.</p>
<h2>Contact</h2>
<p>Questions: ${contact}.</p>`,
  );

  const support = page(
    'Support',
    `<p>Need help, found a wrong location, or want your data exported? Contact ${contact}.</p>
<p>To delete your account, open the app → Profile → Settings → Delete account.</p>`,
  );

  for (const [path, html] of [
    ['/legal/privacy', privacy],
    ['/legal/terms', terms],
    ['/legal/support', support],
  ] as const) {
    app.get(path, async (_request, reply) => reply.type('text/html; charset=utf-8').send(html));
  }
};
