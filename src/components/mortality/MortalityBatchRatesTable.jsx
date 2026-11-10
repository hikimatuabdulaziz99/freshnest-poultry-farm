import styles from './MortalityBatchRatesTable.module.css';

export function MortalityBatchRatesTable({ batchStats = [] }) {
  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div className={styles.titleBox}>
          <h4 className={styles.title}>Cohort Mortality & Survival Analysis</h4>
          <p className={styles.subtitle}>
            Cumulative mortality percentage calculated against initial intake headcount
          </p>
        </div>
        <span className={styles.formulaNote}>
          Mortality Rate = (Deaths / Initial Count) × 100
        </span>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Batch Code</th>
              <th>Bird Type & Breed</th>
              <th>Initial Headcount</th>
              <th>Current Live Birds</th>
              <th>Total Losses</th>
              <th>Mortality Rate</th>
              <th>Survival Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {batchStats.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className={styles.emptyState}>
                    No flock batches currently registered on the farm.
                  </div>
                </td>
              </tr>
            ) : (
              batchStats.map((b) => {
                const rate = b.mortalityRate;
                let rateClass = styles.rateNormal;
                if (rate >= 10.0) rateClass = styles.rateDanger;
                else if (rate >= 5.0) rateClass = styles.rateWarning;

                return (
                  <tr key={b.id}>
                    <td>
                      <span className={styles.batchCode}>{b.batchCode}</span>
                    </td>
                    <td>
                      <span>{b.birdType}</span>
                      <span className={styles.batchBreed}>{b.breed}</span>
                    </td>
                    <td>{b.initialCount.toLocaleString()} birds</td>
                    <td>
                      <strong>{b.currentCount.toLocaleString()}</strong> live
                    </td>
                    <td style={{ color: b.deaths > 0 ? '#dc2626' : 'inherit', fontWeight: b.deaths > 0 ? 600 : 400 }}>
                      {b.deaths > 0 ? `-${b.deaths}` : '0'}
                    </td>
                    <td>
                      <span className={rateClass}>{rate}%</span>
                    </td>
                    <td>
                      <span className={styles.survivalBadge}>{b.survivalRate}%</span>
                    </td>
                    <td>
                      <span
                        className={
                          b.status === 'Active' ? styles.statusActive : styles.statusOther
                        }
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
