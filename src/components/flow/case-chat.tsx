"use client";

// Follow-up questions about one case, built from assistant-ui primitives.
// Runtime: useLocalRuntime + a ChatModelAdapter that asks our own API.
import { useEffect, useMemo, useState } from "react";
import {
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useLocalRuntime,
  type ChatModelAdapter,
  type EmptyMessagePartComponent,
  type TextMessagePartComponent,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { ArrowUp, Mail } from "lucide-react";
import { api } from "@/lib/client";
import type { CaseMessage } from "@/lib/types";
import { Mark, cx } from "@/components/ui/kit";
import { cardClass, eyebrowClass } from "./bits";

const SUGGESTIONS = [
  "But it has my name on it?",
  "What if I already clicked?",
  "How do I report this?",
  "Could it still be real?",
];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function toThreadMessage(m: CaseMessage): ThreadMessageLike {
  return {
    id: m.id,
    role: m.role,
    content: [{ type: "text", text: m.text }],
    createdAt: new Date(m.at),
    metadata: { custom: { via: m.via } },
  };
}

export function CaseChat({
  caseId,
  messages,
  className,
}: {
  caseId: string;
  /** follow-up messages already stored for this case (and any that arrive later by email) */
  messages: CaseMessage[];
  className?: string;
}) {
  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages: thread }) {
        const lastUser = [...thread].reverse().find((m) => m.role === "user");
        const question = (lastUser?.content ?? [])
          .map((part) => (part.type === "text" ? part.text : ""))
          .join("\n")
          .trim();
        // A failed request becomes a calm sentence in the thread, never a thrown error.
        const sorry = (text: string) => ({
          content: [{ type: "text" as const, text }],
          metadata: { custom: { failed: true } },
        });
        if (!question) {
          yield sorry("I did not catch a question there. Type it in the box below and I will answer.");
          return;
        }

        let answer = "";
        try {
          const res = await api<{ answer: string; message?: CaseMessage }>(
            `/api/cases/${encodeURIComponent(caseId)}/chat`,
            { body: { question } },
          );
          answer = (res.answer ?? res.message?.text ?? "").trim();
        } catch (err) {
          // api() throws the server's own sentence (403/409/429); only a network failure means "could not reach"
          const said = err instanceof Error && !(err instanceof TypeError) && !/^Request failed/.test(err.message) ? err.message : "";
          yield sorry(said || "I could not reach the checker just now. Please ask again in a moment.");
          return;
        }
        if (!answer) {
          yield sorry("I did not get an answer back that time. Please ask again.");
          return;
        }

        // One update while the run is still open lets assistant-ui reveal the text smoothly.
        yield { content: [{ type: "text" as const, text: answer }] };
        await sleep(160);
      },
    }),
    [caseId],
  );

  // The thread is seeded once, when the chat first appears.
  const [initialMessages] = useState(() => messages.map(toThreadMessage));
  const [seen] = useState(() => new Set(messages.map((m) => m.id)));
  const runtime = useLocalRuntime(adapter, { initialMessages });

  // Questions asked by email reply land in the same thread while the page is open.
  useEffect(() => {
    for (const m of messages) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      if (m.via !== "email") continue; // this page already shows its own web messages
      runtime.thread.append({
        role: m.role,
        content: [{ type: "text", text: m.text }],
        metadata: { custom: { via: "email" } },
        startRun: false,
      });
    }
  }, [messages, runtime, seen]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <section className={cx(cardClass, "overflow-hidden", className)} aria-label="Ask a follow-up question">
        <header className="flex items-end justify-between gap-3 border-b border-line/70 px-5 pb-4 pt-5 sm:px-6">
          <div>
            <div className={cx(eyebrowClass, "mb-1.5")}>Still not sure?</div>
            <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.7rem]">
              Ask about this one
            </h2>
          </div>
          <span className="shrink-0 pb-1 font-mono text-[10px] uppercase tracking-widest text-ink-4">assistant-ui</span>
        </header>

        <ThreadPrimitive.Root className="flex flex-col">
          <ThreadPrimitive.Viewport className="flex max-h-[26rem] flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-2 pt-4 sm:px-6">
            <AuiIf condition={(s) => s.thread.isEmpty}>
              <div className="flex gap-3">
                <Mark size={26} className="mt-1 shrink-0" />
                <p className="text-lg leading-relaxed text-ink-2 sm:text-xl">
                  Ask me anything about this message. I will answer in plain words, and I will tell you when I do not
                  know.
                </p>
              </div>
            </AuiIf>
            <ThreadPrimitive.Messages>
              {({ message }) => (message.role === "user" ? <UserMessage /> : <AssistantMessage />)}
            </ThreadPrimitive.Messages>
          </ThreadPrimitive.Viewport>

          <div className="border-t border-line bg-paper/60 px-4 pb-4 pt-3 sm:px-5">
            <SuggestionChips />
            <ComposerPrimitive.Root className="flex items-end gap-2 rounded-[22px] border border-line bg-white p-1.5 pl-4 transition duration-150 focus-within:border-ink focus-within:ring-4 focus-within:ring-ink/10">
              <ComposerPrimitive.Input
                placeholder="Type your question"
                aria-label="Your question about this message"
                minRows={1}
                maxRows={5}
                className="min-w-0 flex-1 resize-none bg-transparent py-2.5 text-lg leading-snug text-ink outline-none placeholder:text-ink-4"
              />
              <ComposerPrimitive.Send
                aria-label="Send question"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-cream transition duration-150 hover:bg-ink-2 active:scale-95 disabled:bg-paper-3 disabled:text-ink-4"
              >
                <ArrowUp size={20} aria-hidden />
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
          </div>
        </ThreadPrimitive.Root>
      </section>
    </AssistantRuntimeProvider>
  );
}

/** Tap-to-ask chips. Each one disappears once it has been asked. */
function SuggestionChips() {
  const messages = useAuiState((s) => s.thread.messages);
  const remaining = useMemo(() => {
    const asked = new Set(
      messages
        .filter((m) => m.role === "user")
        .map((m) => m.content.map((part) => (part.type === "text" ? part.text : "")).join("").trim()),
    );
    return SUGGESTIONS.filter((q) => !asked.has(q));
  }, [messages]);

  if (remaining.length === 0) return null;
  return (
    <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
      {remaining.map((q) => (
        <ThreadPrimitive.Suggestion
          key={q}
          prompt={q}
          send
          className="h-10 shrink-0 rounded-full border border-line bg-white px-4 text-[15px] font-semibold text-ink transition duration-150 hover:border-ink-4 active:scale-[0.97] disabled:opacity-50"
        >
          {q}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}

function ViaEmailTag() {
  const viaEmail = useAuiState((s) => s.message.metadata.custom.via === "email");
  if (!viaEmail) return null;
  return (
    <span className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-ink-4">
      <Mail size={11} aria-hidden />
      by email
    </span>
  );
}

const UserText: TextMessagePartComponent = ({ text }) => <p className="whitespace-pre-wrap">{text}</p>;

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex flex-col items-end animate-rise">
      <div className="max-w-[88%] rounded-[22px] rounded-br-lg border border-line bg-paper-2 px-4 py-2.5 text-lg leading-snug text-ink">
        <MessagePrimitive.Parts components={{ Text: UserText }} />
      </div>
      <ViaEmailTag />
    </MessagePrimitive.Root>
  );
}

const AssistantText: TextMessagePartComponent = () => (
  <MessagePartPrimitive.Text
    component="p"
    smooth={{ drainMs: 1100, maxCharIntervalMs: 14 }}
    className="whitespace-pre-wrap"
  />
);

/** Three quiet dots while the answer is on its way. */
const Thinking: EmptyMessagePartComponent = ({ status }) => {
  if (status.type !== "running") return null;
  return (
    <span className="inline-flex h-8 items-center gap-1.5" role="status" aria-label="Thinking about your question">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 rounded-full bg-ink-4 animate-pulse-dot"
          style={{ animationDelay: `${i * 180}ms` }}
        />
      ))}
    </span>
  );
};

function AssistantMessage() {
  const failed = useAuiState((s) => s.message.metadata.custom.failed === true);
  return (
    <MessagePrimitive.Root className="flex gap-3 animate-rise">
      <Mark size={26} className="mt-1 shrink-0" />
      <div
        className={cx(
          "min-w-0 flex-1",
          failed
            ? "rounded-2xl border border-line bg-paper-2 px-4 py-2.5 text-base text-ink-2"
            : "text-lg leading-relaxed text-ink sm:text-xl sm:leading-relaxed",
        )}
      >
        <MessagePrimitive.Parts components={{ Text: AssistantText, Empty: Thinking }} />
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="mt-1 rounded-2xl border border-line bg-paper-2 px-4 py-2.5 text-base text-ink-2">
            <ErrorPrimitive.Message>Something went wrong on our side. Please ask again.</ErrorPrimitive.Message>
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
        <ViaEmailTag />
      </div>
    </MessagePrimitive.Root>
  );
}
