# Voiceover

Read these lines over `demo.mp4` (2:09 long). Each line starts at the time shown; finish before the next one. The easiest way is the teleprompter: open `teleprompter.html`, press **Start**, and read.

| Starts | Line |
| --- | --- |
| 0:00 | My mom texts me “is this real?” about once a week. Usually while I’m in a meeting. |
| 0:06 | Last year, Americans over sixty reported losing almost five billion dollars to fraud. And in every family, someone is the unpaid fraud desk. |
| 0:16 | So I built Mom, Don’t Click. It’s one email address. She forwards anything sketchy, and an agent clicks the link for her. |
| 0:25 | I sign up once, as her guardian. That’s the whole setup. |
| 0:30 | This morning she forwarded this: a parcel is being held, pay a dollar ninety-nine. She never opens it. A throwaway browser does, far away from her computer. It types obviously fake details, and watches what the page asks for next. |
| 0:46 | Step two wants her card number. So the answer is one sentence she can act on. Scam. Do not click. |
| 0:54 | And I get exactly one note. “Mom was sent a parcel scam. She did not click. Handled.” |
| 1:01 | When the same scam comes back, it’s answered from memory. Instantly. |
| 1:06 | Anyone can try it from their phone. Here’s the classic: “Hi Mom, new number, send money by Zelle.” There’s no link at all, and it still catches it. |
| 1:16 | And it isn’t paranoid. A real order email gets “no red flags found,” and a nudge to use the official site. It never calls anything safe. |
| 1:28 | Every answer comes with a follow-up chat, in plain words. Could it still be real? Call them on the number you already have. |
| 1:36 | Under the hood, it’s one Mastra workflow. Read the message, check memory, then open the link, check the claims and check the address, all in parallel. Rules decide the verdict. The model only writes the sentence. |
| 1:50 | Kernel is the throwaway browser. Exa checks the claims. AgentMail is the inbox. Neon is the memory. And without the keys, every piece falls back, and it still works. |
| 2:02 | Mom forwards. It clicks. You only hear about it when it matters. |

Then merge your recording:

```bash
scripts/film/combine.sh ~/Desktop/me.mov
```
