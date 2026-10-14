export async function registerOfflineWorker() {
  // Register only the small worker; game assets are downloaded by explicit request.
  const registration = await navigator.serviceWorker.register('/sw.js', {
    updateViaCache: 'none',
  });
  const worker =
    registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) throw new Error('Offline worker unavailable');
  if (worker.state !== 'activated') {
    await new Promise<void>((resolve, reject) => {
      const onChange = () => {
        if (worker.state === 'activated' || worker.state === 'redundant') {
          worker.removeEventListener('statechange', onChange);
          if (worker.state === 'activated') resolve();
          else reject(new Error('Offline worker installation failed'));
        }
      };
      worker.addEventListener('statechange', onChange);
      onChange();
    });
  }
  return worker;
}

export function requestOffline(
  worker: ServiceWorker,
  type: 'OFFLINE_STATUS' | 'CACHE_OFFLINE',
) {
  return new Promise<boolean>((resolve, reject) => {
    const channel = new MessageChannel();
    const close = () => {
      clearTimeout(timeout);
      channel.port1.close();
      channel.port2.close();
    };
    const timeout = setTimeout(
      () => {
        close();
        reject(new Error('Offline request timed out'));
      },
      type === 'CACHE_OFFLINE' ? 300_000 : 10_000,
    );
    channel.port1.onmessage = (event) => {
      close();
      if (event.data?.error) reject(new Error('Offline caching failed'));
      else resolve(event.data?.ready === true);
    };
    try {
      worker.postMessage({ type }, [channel.port2]);
    } catch (error) {
      close();
      reject(error);
    }
  });
}
