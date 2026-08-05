import { Card, CardContent } from '../ui/card';
import {CircularProgress} from '../shared/CircularProgress';

export const StatCard = ({ title, subtitle, percentage, color }) => {
    return (
      <Card className="border-border/80 bg-card transition-colors hover:border-border">
        <CardContent className="flex flex-col items-center space-y-4 p-6 text-center">
          {/* Circular Progress */}
          <CircularProgress percentage={percentage} size={100} strokeWidth={8} color={color} />

          <div className="space-y-1">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
            {subtitle && (
              <p className="text-sm font-medium text-foreground">{subtitle}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  