import styles from './PluginReviewList.module.css';

export function PluginReviewList({ plugin }) {
  return (
    <div className={styles.reviews}>
      {plugin.reviews && plugin.reviews.length > 0 ? (
        plugin.reviews.map((review, i) => (
          <div key={i} className={styles.review}>
            <div className={styles.avatar}>{review.user[0]}</div>
            <div className={styles.body}>
              <div className={styles.header}>
                <span className={styles.user}>{review.user}</span>
                <span className={styles.rating}>{'★'.repeat(review.rating)}</span>
              </div>
              <div className={styles.comment}>{review.comment}</div>
            </div>
          </div>
        ))
      ) : (
        <div className={styles.empty}>No reviews yet.</div>
      )}
    </div>
  );
} 