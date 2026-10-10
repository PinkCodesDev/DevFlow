type StatCardProps = {
  title: string;
  value: string;
  description: string;
};

function StatCard({ title, value, description }: StatCardProps) {
  return (
    <div className="stat-card">
      <p className="stat-title">{title}</p>
      <h3>{value}</h3>
      <span>{description}</span>
    </div>
  );
}

export default StatCard;

export const StatCardList = ({ stats }: { stats: { title: string; value: string; description: string; }[] }) => (
  <>
    {stats.map(({ title, value, description }) => (
      <StatCard key={title} title={title} value={value} description={description} />
    ))}
  </>
);