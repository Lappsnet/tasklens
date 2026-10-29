# Play Data safety — draft answers (mirror `/privacy`)

| Data type | Collected? | Purpose | Shared? |
|---|---|---|---|
| Camera / photos | Yes | App functionality (quote, verification) | Assigned pro + review team (disputes only), via short-lived links |
| Microphone / voice | Yes | App functionality (notes, commands; transcribed) | Same as photos; transcripts only |
| Approximate location | Yes | App functionality (nearby pros) | Pros see job zone, never live tracking |
| Financial info (card) | No — handled by PayPal | Payments | PayPal (processor) |
| Personal info (name, email) | Yes | Account + booking | Assigned pro (job coordination) |

- Data is encrypted in transit; photos/bucket are private server-side.
- Deletion: privacy@tasklens.example, within 30 days.
- No ads, no sale of personal data, no tracking SDKs in the store build
  (no Wearables SDK — glasses builds ship separately via the Meta
  Wearables Developer Center).
