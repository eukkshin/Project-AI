/* DINOVO Web Push — service worker. HTTPS required except localhost. */
self.addEventListener('push', (event) => {
  let payload = {};
  try {payload = event.data ? event.data.json() : {};} catch {}
  const title = typeof payload.title === 'string' ? payload.title : 'DINOVO';
  const body = typeof payload.body === 'string' ? payload.body : '예약 정보를 확인해 주세요.';
  const url = typeof payload.url === 'string' && payload.url.startsWith('/group/three/3/') ? payload.url : '/group/three/3/bookings/';
  event.waitUntil(self.registration.showNotification(title, {body, icon:'/group/three/3/icon.png', data:{url}, tag:'dinovo-booking', renotify:true}));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/group/three/3/bookings/';
  event.waitUntil(self.clients.openWindow(url));
});
