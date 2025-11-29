import Sidebar from '../components/ui/Sidebar';
import Topbar from '../components/ui/Topbar';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children }) {
  return (
    <div className={styles.dashboard}>
      <Sidebar />
      <main className={styles.main}>
        <Topbar />
        <section className={styles.content}>{children}</section>
      </main>
    </div>
  );
} 