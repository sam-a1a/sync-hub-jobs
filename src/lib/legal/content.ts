/**
 * The terms and the privacy policy, as local content.
 *
 * The reference fetches these from an API — a legal document that can be
 * amended without a deploy is worth having once there is a dashboard behind
 * it. There is none here yet, so the same shape is kept (title, an effective
 * date, a Markdown body) as plain constants; swapping this file for a fetch
 * later changes nothing that reads it.
 */
export interface LegalDocument {
  title: string
  effectiveAt: string
  body: string
}

export const TERMS: LegalDocument = {
  title: 'Terms & Conditions',
  effectiveAt: '2026-09-01',
  body: `
## Agreement to these terms

Welcome to SYNC Hub. These terms govern your use of the SYNC Hub website, mobile experience and the matching service we call SYNC — collectively, "the Service". By creating an account or otherwise using the Service, you agree to be bound by these terms. If you do not agree, please do not use the Service.

SYNC Hub is provided by the SYNC NGO. We may update these terms from time to time; the date at the top of this page tells you which version you are reading.

## Who can use SYNC Hub

You must be at least 16 years old to create an account. If you are creating an account on behalf of an organisation — to post roles, for instance — you confirm that you are authorised to accept these terms on that organisation's behalf.

The Service is, and is intended to remain, free for people looking for work. We reserve the right to introduce paid tiers for employer-facing features in the future; nothing here should be read as a promise that every future feature will be free.

## Your account

You are responsible for the accuracy of the information you give us, and for keeping your password confidential. Let us know immediately if you believe your account has been accessed without your permission.

- One person, one account. Accounts are not transferable between individuals.
- You may close your account at any time from your account settings.
- We may suspend or close an account that we reasonably believe is being used fraudulently, abusively, or in a way that puts other users at risk.

## What SYNC does with your information

SYNC — our matching system — reads what you tell us about your experience and preferences in order to surface roles and connect you with employers. It does not sell your data, and it does not make hiring decisions on an employer's behalf; it narrows and ranks, and the people on the other end still decide.

You can find the fuller account of what we collect, why, and for how long in our [Privacy Policy](/privacy).

## Acceptable use

You agree not to:

1. Post a job listing, profile, or message that is false, misleading, or discriminatory in a way prohibited by applicable law.
2. Use the Service to collect other users' information for any purpose unrelated to a genuine hiring process.
3. Attempt to access accounts or data that are not yours, or to interfere with the normal operation of the Service.
4. Use automated means to scrape or bulk-download content from the Service without our written permission.

We may remove content or restrict access for anyone who breaches these terms.

## Content you provide

Anything you post — a profile, a job listing, a message — remains yours. By posting it, you grant SYNC Hub a licence to display, store and process it for the purpose of operating the Service, including showing it to the people it is meant to reach.

You are responsible for making sure you have the right to post what you post, and that it does not infringe anyone else's rights.

## Third parties

The Service may link to, or integrate with, third-party websites and tools — an employer's own application page, for instance. We do not control those third parties and are not responsible for their content or practices. Using a third-party service you reach through SYNC Hub is subject to that service's own terms.

## Disclaimers

The Service is provided "as is". We work to keep matching relevant and the platform reliable, but we do not guarantee that any particular role will be a good fit, that any listing is accurate, or that the Service will be uninterrupted or error-free.

## Limitation of liability

To the extent permitted by law, SYNC Hub and the SYNC NGO are not liable for indirect, incidental or consequential damages arising from your use of the Service. Nothing in these terms limits liability that cannot be limited under applicable law.

## Changes to these terms

We may revise these terms as the Service changes. If a revision is material, we will let registered users know before it takes effect. Continuing to use the Service after a change takes effect means you accept the revised terms.

## Contact

Questions about these terms can be sent to [legal@sync.ngo](mailto:legal@sync.ngo).
`.trim(),
}

export const PRIVACY: LegalDocument = {
  title: 'Privacy Policy',
  effectiveAt: '2026-09-01',
  body: `
## What this policy covers

This policy explains what personal information SYNC Hub collects, why we collect it, and the choices you have about it. It applies to the SYNC Hub website and to SYNC, the matching service that runs on top of it.

## What we collect

**Information you give us.** Your name, email address and password when you register; the details of your experience, skills and preferences when you build a profile; anything you write in a message to an employer or to us.

**Information SYNC derives.** SYNC reads what you have told it in order to produce a ranking of roles it believes fit you. That ranking, and the reasoning behind it, is derived data — it exists because of what you gave us, and it is treated with the same care.

**Information collected automatically.** Standard technical information — your device, browser, and how you interact with the Service — collected to keep it working and secure, not to build a profile of you beyond what you have told us directly.

## Why we collect it

We use your information to:

- Operate your account and the profile you build on it.
- Run SYNC's matching, so the roles you see are the ones worth your time.
- Communicate with you about your account, applications, and material changes to the Service.
- Keep the Service secure and address abuse.

We do not use your information to train models for purposes unrelated to SYNC Hub, and we do not sell it to third parties.

## Who we share it with

**Employers**, when you choose to apply to a role or make your profile visible to them — never before that choice.

**Service providers** who help us run the Service — hosting, email delivery, and similar — under contracts that limit them to using your data for that purpose only.

**Legal authorities**, only where we are required to by law, and only to the extent required.

## Your choices

You can review and correct the information on your profile at any time. You can:

1. Download a copy of your data from your account settings.
2. Ask us to delete your account, which removes your profile and the data SYNC derived from it.
3. Control which employers can see your profile, and withdraw that visibility at any time.

## How long we keep it

We keep your account information for as long as your account is active. If you delete your account, we remove your profile and derived data within 30 days, except where we are required to retain limited records for legal or security reasons.

## Security

We use industry-standard measures to protect your information, including encryption in transit and at rest. No system is perfectly secure, and we will tell you promptly if we become aware of a breach that affects your data.

## Children

SYNC Hub is not directed at anyone under 16, and we do not knowingly collect information from anyone under that age.

## Changes to this policy

We may update this policy as the Service changes. Material changes will be announced to registered users before they take effect; the date at the top of this page tells you which version is current.

## Contact

Questions about this policy, or requests relating to your data, can be sent to [privacy@sync.ngo](mailto:privacy@sync.ngo).
`.trim(),
}
