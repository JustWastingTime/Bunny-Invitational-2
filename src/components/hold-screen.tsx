import "./hold-screen.css";

export function HoldScreen({
  title,
  tag,
  teams,
  cue,
}: {
  title: string;
  tag: string;
  teams?: { name: string; color: string }[];
  cue?: { label: string; match: string; category: string } | null;
}) {
  return (
    <div className="hold">
      <div className="hold-wash" />
      <div className="hold-aurora" />
      <div className="hold-spark hold-spark-a" />
      <div className="hold-spark hold-spark-b" />
      <div className="hold-spark hold-spark-c" />
      <div className="hold-ring hold-ring-1" />
      <div className="hold-ring hold-ring-2" />
      <div className="hold-ring hold-ring-3" />
      <div className="hold-core">
        <p className="hold-kicker">Bunny Invitational 2</p>
        <h1 className={title.length > 8 ? "hold-title hold-title-long" : "hold-title"}>{title}</h1>
        <p className="hold-tag">{tag}</p>
        {cue ? (
          <div className="hold-cue">
            <span>{cue.label}</span>
            <strong>{cue.match}</strong>
            <em>{cue.category}</em>
          </div>
        ) : null}
      </div>
      {teams?.length ? (
        <div className="hold-teams">
          {teams.map((team) => (
            <span key={team.name} style={{ ["--team" as string]: team.color }}>
              {team.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
