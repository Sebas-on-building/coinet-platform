import { Recommendations } from '../components/dashboard/Recommendations';
import { BadgeList } from '../components/badges/BadgeList';
import { AnimatedStats } from '../components/dashboard/AnimatedStats';

export default function DashboardPage() {
  // Get userId from auth context/session
  const userId = 'current-user-id';
  return (
    <>
      <AnimatedStats userId={userId} />
      <Recommendations />
      <BadgeList userId={userId} />
    </>
  );
} 