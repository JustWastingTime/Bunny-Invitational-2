import type { UmaFinishRecord } from "./types";

export type { UmaFinishRecord };

export function emptyFinish(): UmaFinishRecord {
  return { places: [0, 0, 0, 0, 0], points: 0 };
}

export function finishKey(teamId: string, category: string, slot: number) {
  return `${teamId}:${category}:${slot}`;
}

export function addFinish(record: UmaFinishRecord, place: number, points: number) {
  if (place >= 1 && place <= 5) record.places[place - 1] += 1;
  record.points += points;
}
