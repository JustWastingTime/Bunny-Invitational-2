import { livePayload, loadOverlayRow, hasOverlayKv } from "@/lib/overlay-store";
import { noStoreHeaders } from "@/lib/no-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let last = "";
  let closed = false;
  const interval = hasOverlayKv() ? 80 : 150;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const tick = async () => {
        try {
          const live = livePayload(await loadOverlayRow());
          if (live.stamp === last) return;
          last = live.stamp;
          send(live);
        } catch {
          /* keep the stream */
        }
      };

      void tick();
      const poll = setInterval(() => void tick(), interval);
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
