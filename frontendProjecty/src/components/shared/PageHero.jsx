export const PageHero = ({ icon: Icon, title, subtitle, action }) => (
  <div className="animate-in fade-in slide-in-from-bottom-2 mb-8 flex min-w-0 flex-col items-start justify-between gap-4 duration-500 sm:flex-row sm:items-end">
    <div className="min-w-0">
      {Icon && (
        <div className="hero-icon mb-4">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>}
    </div>
    {action && <div className="w-full min-w-0 sm:w-auto sm:shrink-0">{action}</div>}
  </div>
);

export default PageHero;
