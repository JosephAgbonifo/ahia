import { MessageCircle } from "lucide-react";

export default function MessagesIndexPage() {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div className="grid justify-items-center gap-3">
        <span className="grid size-20 place-items-center rounded-full bg-brand-50 text-brand-600"><MessageCircle size={34} aria-hidden /></span>
        <h2 className="m-0 text-xl">Pick a conversation</h2>
        <p className="m-0 max-w-72 text-ink-soft">Choose a chat on the left to read it and reply.</p>
      </div>
    </div>
  );
}
