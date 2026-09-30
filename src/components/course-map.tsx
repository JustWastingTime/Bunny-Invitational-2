import type { CourseProfile, CourseSegment } from "@/lib/course-profiles";

/** Broadcast palette: gold, peach, and rose on the briefing slide. */
export const COURSE_COLORS = {
  sky: "#3d2232",
  flat: "#f3ddd4",
  uphill: "#ffd56a",
  downhill: "#ff7b8a",
  blank: "#8a6a78",
  straight: "#ffc4a8",
  corner: "#ffd56a",
  early: "#f6e4dc",
  mid: "#ffd0bc",
  late: "#ffb0a8",
  spurt: "#ff7b8a",
  title: "#ffd56a",
  axis: "#fff6ee",
  tick: "rgba(255, 246, 238, 0.72)",
  meter: "#2a160c",
  ink: "#2a160c",
  pk: "#ff7b8a",
  border: "rgba(42, 22, 12, 0.22)",
};

type RowKey = "elevation" | "layout" | "zones";

export function CourseMap({ profile, compact = false }: { profile: CourseProfile; compact?: boolean }) {
  const width = 1600;
  const rowHeight = compact ? 150 : 118;
  const margin = compact
    ? { top: 6, right: 16, bottom: 4, left: 16 }
    : { top: 72, right: 36, bottom: 6, left: 36 };
  const length = profile.length;
  const trackWidth = width - margin.left - margin.right;
  const trackTop = margin.top;
  const rowBottom = trackTop + rowHeight * 3;
  const axisY = rowBottom + (compact ? 22 : 40);
  const statText = profile.statThreshold ? `Stat Thresholds: ${profile.statThreshold}` : "";
  const height = statText && !compact ? axisY + 68 : axisY + (compact ? 22 : 34);

  const xOf = (distance: number) => margin.left + (clamp(distance, 0, length) / length) * trackWidth;
  const rows: { key: RowKey; y: number; segments: CourseSegment[] }[] = [
    { key: "elevation", y: trackTop, segments: profile.elevation },
    { key: "layout", y: trackTop + rowHeight, segments: profile.layout },
    { key: "zones", y: trackTop + rowHeight * 2, segments: profile.zones },
  ];
  const elevation = buildElevation(profile.elevation, trackTop, rowHeight, profile.elevationScale);
  const labelSize = compact ? 13 : 26;
  const meterSize = compact ? 10 : 16;
  const axisSize = compact ? 12 : 22;
  const minSpan = compact ? 48 : 36;
  const boundary = rows.flatMap((row) =>
    row.segments
      .filter((segment) => segment.end < length && xOf(segment.end) - xOf(segment.start) >= minSpan)
      .map((segment) => ({
        x: xOf(segment.end),
        y: row.y + rowHeight,
        text: `${segment.end}m`,
      })),
  );

  return (
    <svg className={compact ? "course-map is-compact" : "course-map"} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={profile.name}>
      {compact ? null : (
        <text className="course-title" x={width / 2} y={46} textAnchor="middle" fill={COURSE_COLORS.title} fontSize={40}>
          {profile.name}
        </text>
      )}
      {rows.map((row) => {
        if (row.key === "elevation" && row.segments.length) {
          const startX = xOf(row.segments[0].start);
          const endX = xOf(row.segments[row.segments.length - 1].end);
          return (
            <g key={row.key}>
              <rect x={startX} y={row.y} width={endX - startX} height={rowHeight} fill={COURSE_COLORS.sky} stroke={COURSE_COLORS.border} />
              {row.segments.map((segment) => {
                const x1 = xOf(segment.start);
                const x2 = xOf(segment.end);
                const y1 = elevation.yAt(segment.start);
                const y2 = elevation.yAt(segment.end);
                const bottom = row.y + rowHeight;
                return (
                  <polygon
                    key={`${segment.start}-${segment.end}`}
                    points={`${x1},${bottom} ${x2},${bottom} ${x2},${y2} ${x1},${y1}`}
                    fill={elevationColor(segment)}
                    stroke={COURSE_COLORS.border}
                    strokeWidth={0.8}
                  />
                );
              })}
            </g>
          );
        }
        return (
          <g key={row.key}>
            {row.segments.map((segment) => {
              const x = xOf(segment.start);
              const w = xOf(segment.end) - x;
              const label = rowLabel(row.key, segment);
              return (
                <g key={`${segment.start}-${segment.end}`}>
                  <rect x={x} y={row.y} width={w} height={rowHeight} fill={rowColor(row.key, segment)} stroke={COURSE_COLORS.border} />
                  {label && !compact && w > 64 ? (
                    <text x={x + w / 2} y={row.y + rowHeight / 2 + (w < 150 ? 6 : labelSize * 0.35)} textAnchor="middle" fill={COURSE_COLORS.ink} fontSize={w < 150 ? 18 : labelSize} fontWeight={700}>
                      {label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}
      {compact
        ? null
        : boundary.map((marker) => (
            <g key={`${marker.y}-${marker.x}-${marker.text}`}>
              <line x1={marker.x} y1={marker.y - 8} x2={marker.x} y2={marker.y + 5} stroke={COURSE_COLORS.ink} strokeWidth={1.5} />
              <text x={marker.x} y={marker.y - 10} textAnchor="middle" fill={COURSE_COLORS.meter} fontSize={meterSize}>
                {marker.text}
              </text>
            </g>
          ))}
      <line x1={margin.left} y1={axisY} x2={width - margin.right} y2={axisY} stroke={COURSE_COLORS.axis} strokeWidth={2} />
      {ticks(length).map((distance) => {
        const x = xOf(distance);
        return (
          <g key={distance}>
            <line x1={x} y1={axisY} x2={x} y2={axisY - (compact ? 7 : 12)} stroke={COURSE_COLORS.tick} strokeWidth={2} />
            {compact ? null : (
              <text x={x} y={axisY + 26} textAnchor="middle" fill={COURSE_COLORS.axis} fontSize={axisSize}>
                {distance}
              </text>
            )}
          </g>
        );
      })}
      {statText && !compact ? (
        <text x={width / 2} y={axisY + 50} textAnchor="middle" fill={COURSE_COLORS.axis} fontSize={22} fontWeight={700}>
          {statText}
        </text>
      ) : null}
      {profile.positionKeep.map((distance) => {
        const x = xOf(distance);
        return (
          <g key={`pk-${distance}`}>
            <line x1={x} y1={Math.max(2, trackTop - 8)} x2={x} y2={axisY + 4} stroke={COURSE_COLORS.pk} strokeWidth={compact ? 2 : 3} />
            {compact ? null : (
              <text x={Math.min(x + 8, width - margin.right - 28)} y={trackTop + rowHeight * 0.38} fill={COURSE_COLORS.pk} fontSize={18} fontWeight={700}>
                PK
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function buildElevation(segments: CourseSegment[], rowY: number, rowHeight: number, elevationScale: number | null) {
  let elevation = 0;
  const boundaries = [{ distance: segments[0]?.start ?? 0, elevation: 0 }];
  for (const segment of segments) {
    elevation += elevationDelta(segment);
    boundaries.push({ distance: segment.end, elevation });
  }
  const samples = boundaries.map((point) => point.elevation);
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const baseline = rowY + rowHeight * 0.56;
  const amplitude = rowHeight * 0.4;

  const yFrom = (value: number) => {
    if (elevationScale && elevationScale > 0) return baseline - (value / elevationScale) * amplitude;
    const center = (min + max) / 2;
    const half = Math.max((max - min) / 2, 0.5);
    return baseline - ((value - center) / half) * amplitude;
  };

  const at = (distance: number) => {
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (distance >= segment.start && distance <= segment.end) {
        const start = boundaries[i].elevation;
        const end = boundaries[i + 1].elevation;
        const span = segment.end - segment.start;
        if (span <= 0 || start === end) return start;
        return start + (end - start) * ((distance - segment.start) / span);
      }
    }
    return boundaries[boundaries.length - 1]?.elevation ?? 0;
  };

  return { yAt: (distance: number) => yFrom(at(distance)) };
}

function elevationDelta(segment: CourseSegment) {
  const span = segment.end - segment.start;
  if (span <= 0) return 0;
  if (typeof segment.change === "number" && Number.isFinite(segment.change)) return (segment.change / 100) * span;
  const type = (segment.type ?? "").toLowerCase();
  if (type.includes("uphill")) return span / 100;
  if (type.includes("downhill")) return -span / 100;
  return 0;
}

function elevationColor(segment: CourseSegment) {
  const type = `${segment.type ?? ""} ${segment.label ?? ""}`.toLowerCase();
  if (type.includes("uphill")) return COURSE_COLORS.uphill;
  if (type.includes("downhill")) return COURSE_COLORS.downhill;
  return COURSE_COLORS.flat;
}

function rowColor(key: RowKey, segment: CourseSegment) {
  if (key === "zones") return zoneColor(segment.label ?? "");
  const label = (segment.label ?? "").trim().toLowerCase();
  if (!label) return COURSE_COLORS.blank;
  if (label.includes("corner")) return COURSE_COLORS.corner;
  return COURSE_COLORS.straight;
}

function zoneColor(label: string) {
  const text = label.toLowerCase();
  if (text.includes("spurt")) return COURSE_COLORS.spurt;
  if (text.includes("early")) return COURSE_COLORS.early;
  if (text.includes("mid")) return COURSE_COLORS.mid;
  if (text.includes("late")) return COURSE_COLORS.late;
  return COURSE_COLORS.blank;
}

function rowLabel(key: RowKey, segment: CourseSegment) {
  if (key === "elevation") return "";
  return (segment.label ?? "").trim();
}

function ticks(length: number) {
  const step = length <= 1200 ? 100 : length <= 2000 ? 200 : length <= 3000 ? 300 : 400;
  const marks: number[] = [];
  for (let distance = 0; distance <= length; distance += step) marks.push(distance);
  if (marks[marks.length - 1] !== length) marks.push(length);
  return marks;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
