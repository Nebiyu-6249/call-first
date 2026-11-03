These notes were written after looking at the held-out results. Nothing in the rules, the prompt, the masking or the
verdict code was changed because of them; the ideas at the end are for later, and would need a new held-out set to
measure.

### Why the AI is worth using

On the held-out set, the AI changed two things for the parent:

- **Stronger warnings on scams.** WARNING went from 18 of 40 scams with the rules only to 33 of 40 with the AI.
  The rules alone gave 22 scams only NOT SURE, across many kinds (tech support, police and court threats, job
  offers, fake fraud teams, a family emergency, a prize, a charity appeal and more). The AI lifted 15 of those 22
  to WARNING.
- **Fewer pointless doubts on normal messages.** With the rules only, all 30 normal messages got NOT SURE or
  WARNING, because the rules can never say NO WARNING SIGNS. With the AI, 14 of 30 got NO WARNING SIGNS.

It did not reduce false alarms (6 of 30 either way, see below), and it cost one miss.

### Weaknesses the held-out run showed

- **One scam missed with the AI on (h18).** "Hi Susan, are we still on for lunch on Saturday?" is the friendly
  "wrong number" opener that starts a longer scam. On its own it asks for nothing, so neither the rules nor the AI
  had anything to find, and the AI was confident it was normal. The app can only judge what it is shown: the later
  message that asks for something is the one that would be caught. A similar opener (h48) got NOT SURE.
- **6 of 30 normal messages got WARNING (20%, 95% CI 10-37%), with or without the AI.** Each one set off a
  high-severity rule, and by design the AI cannot overrule those (so a message cannot talk the AI into calling it
  fine). They fall into three groups:
  - a friend passing on a scam warning that quotes the scam's words (h06, h47);
  - a genuine small money request from family or a friend that mentions an earlier agreement (h24, h28, h61);
  - a genuine bank fraud check asking for a Y or N reply (h37), the same pattern as n16 in the original set.

  For the parent, a false alarm means checking with family before acting, which costs little. But one in five
  normal messages is often enough to make the warning feel like crying wolf.
- **6 scams got only NOT SURE with the AI on** (h13, h34, h38, h43, h45, h48): a romance message, an investment
  "club", a delivery reschedule link, a job offer, a fraud-team call and a wrong-number opener. The parent is still
  told not to reply and to check with family, but the message is weaker than WARNING.
- **The gap between the sets is real.** On the original set, written alongside the rules, the false-alarm rate was
  1 of 16 and every scam got WARNING or NOT SURE. The held-out set is the more honest measure.

### Ideas for later (not done)

- Tell a message that quotes a scam in order to warn about it apart from the scam itself.
- Let a confident AI "likely normal" lower a payment request to NOT SURE when it comes from a known person and
  refers to an agreed amount, weighed against the prompt-injection protection the current order gives.
- Treat a bank's "reply Y or N" fraud check as a normal bank pattern when it asks for nothing else.
- Write a new held-out set before measuring any of these, since this one has now been seen.
