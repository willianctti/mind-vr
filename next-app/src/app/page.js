'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const router = useRouter();

  const joinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/viewer?room=${roomId}`);
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          VR Mouse Streaming
        </h1>

        <p className={styles.description}>
          Conecte-se a um PC para visualizar a tela em VR
        </p>

        <form onSubmit={joinRoom} className={styles.form}>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Digite o ID da sala"
            className={styles.input}
          />
          <button type="submit" className={styles.button}>
            Conectar
          </button>
        </form>
      </main>
    </div>
  );
}