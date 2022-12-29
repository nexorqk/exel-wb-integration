import * as React from 'react';
import styles from './styles.module.css';
export const Loader = () => {
    return (
        <div className={styles.wrapper}>
            <div className={styles.loader}></div>
        </div>
    );
};
