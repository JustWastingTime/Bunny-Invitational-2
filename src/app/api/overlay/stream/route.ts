import { livePayload, loadOverlayRow } from "@/lib/overlay-store";
import { noStoreHeaders } from "@/lib/no-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let last = "";
  let closed = false;
  let inFlight = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const tick = async () => {
        if (closed || inFlight) return;
        inFlight = true;
        try {
          const live = livePayload(await loadOverlayRow());
          if (live.stamp === last) return;
          last = live.stamp;
          send(live);
        } catch {
          /* keep the stream */
        } finally {
          inFlight = false;
        }
      };

      void tick();
      const poll = setInterval(() => void tick(), 250);
      const beat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);

      const stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(poll);
        clearInterval(beat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", stop);
    },
  });

  return new Response(stream, {
    headers: {
      ...noStoreHeaders(),
      "Content-Type": "text/event-stream; charset=utf-8",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
