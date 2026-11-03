// Sample messages for the demo. Every sender, number and link is made up: numbers are in UK
// ranges set aside for fiction, and every link is on a reserved .example domain.

export interface DemoSample {
  id: string;
  // Button text in the demo.
  label: string;
  // What a careful person would call it, shown so judges can compare with the result.
  kind: "scam" | "normal";
  text: string;
}

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: "new-number",
    label: "Hi Mum, new number",
    kind: "scam",
    text: "Hi Mum, it's Omar. I dropped my phone in the sink so this is my new number. Can you send £450 to my friend's account today? I'll pay you back. Don't tell Dad yet x",
  },
  {
    id: "bank-code",
    label: "Bank asks for a code",
    kind: "scam",
    text: "Gulf Example Bank: We have stopped a payment of £950.00 from your account. If this was not you, reply with the 6-digit code we just sent to your phone so we can cancel it.",
  },
  {
    id: "account-frozen",
    label: "Account frozen, with a link",
    kind: "scam",
    text: "Your Gulf Example Bank account has been frozen because of unusual activity. Verify your details within 24 hours to avoid permanent closure: http://gulf-example-bank.secure-login.example/verify",
  },
  {
    id: "traffic-fine",
    label: "Traffic fine to pay",
    kind: "scam",
    text: "CITY TRAFFIC OFFICE: You have an unpaid speeding fine of £85. Pay today at https://pay-fines.example/ref/88213 or the amount will double and court action will begin.",
  },
  {
    id: "parcel-fee",
    label: "Parcel held for a fee",
    kind: "scam",
    text: "Swift Example Parcels: Your parcel could not be delivered because of an unpaid fee of £1.99. Pay now to arrange delivery: https://sxp.example/Rp8Kq2",
  },
  {
    id: "police-secret",
    label: "Police threat, keep it secret",
    kind: "scam",
    text: "This is Detective Harris from the Metro Example Police. Your bank account is linked to a fraud case. Do not tell your family or your bank about this. Call me back on 07700 900456 today or you will be arrested.",
  },
  {
    id: "prize",
    label: "You won a prize",
    kind: "scam",
    text: "Congratulations! You have won £5,000 in the Example Lottery Draw. To claim your prize, call 0808 157 0456 and pay a small release fee of £25 in gift cards.",
  },
  {
    id: "appointment",
    label: "Doctor's appointment",
    kind: "normal",
    text: "Riverside Example Surgery: Reminder of your appointment with Dr Patel on Thursday 14 November at 10:30. If you cannot come, please let the surgery know.",
  },
  {
    id: "login-code",
    label: "Sign-in code you asked for",
    kind: "normal",
    text: "Your Gulf Example Bank sign-in code is 482913. It expires in 10 minutes. We will never ask you for this code. Do not share it with anyone.",
  },
];
