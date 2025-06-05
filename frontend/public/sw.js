// SkillForge AI Service Worker
// Provides offline capabilities, caching, and push notifications

const CACHE_NAME = 'skillforge-ai-v1.0.0';
const STATIC_CACHE = 'skillforge-static-v1.0.0';
const DYNAMIC_CACHE = 'skillforge-dynamic-v1.0.0';
const API_CACHE = 'skillforge-api-v1.0.0';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add critical CSS and JS files
  '/static/css/main.css',
  '/static/js/main.js',
  // Critical pages
  '/dashboard',
  '/assessments',
  '/learning-path',
  '/profile'
];

// API endpoints to cache
const CACHEABLE_API_PATTERNS = [
  /\/api\/v1\/users\/profile/,
  /\/api\/v1\/skills/,
  /\/api\/v1\/assessments(?!\/sessions)/,
  /\/api\/v1\/learning-paths/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (STATIC_FILES.includes(url.pathname)) {
    // Static files - cache first
    event.respondWith(handleStaticRequest(request));
  } else {
    // Dynamic content - stale while revalidate
    event.respondWith(handleDynamicRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Check if this API endpoint should be cached
  const shouldCache = CACHEABLE_API_PATTERNS.some(pattern => 
    pattern.test(url.pathname)
  );
  
  if (!shouldCache) {
    // Don't cache sensitive endpoints
    return fetch(request);
  }
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', error);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for critical API failures
    if (url.pathname.includes('/profile') || url.pathname.includes('/dashboard')) {
      return caches.match('/offline');
    }
    
    throw error;
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, fetch and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('Service Worker: Static request failed', error);
    
    // Return offline page as fallback
    return caches.match('/offline');
  }
}

// Handle dynamic requests with stale-while-revalidate strategy
async function handleDynamicRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Fetch in background to update cache
    const fetchPromise = fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    });
    
    // Return cached version immediately if available
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Otherwise wait for network
    return await fetchPromise;
    
  } catch (error) {
    console.log('Service Worker: Dynamic request failed', error);
    
    // Try to return cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page as last resort
    return caches.match('/offline');
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  let notificationData = {
    title: 'SkillForge AI',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'skillforge-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view-action.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-action.png'
      }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('Service Worker: Failed to parse push data', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data || {};
  
  if (action === 'dismiss') {
    return;
  }
  
  // Determine URL to open
  let urlToOpen = '/dashboard';
  
  if (action === 'view' && notificationData.url) {
    urlToOpen = notificationData.url;
  } else if (notificationData.type === 'assessment') {
    urlToOpen = '/assessments';
  } else if (notificationData.type === 'learning') {
    urlToOpen = '/learning-path';
  } else if (notificationData.type === 'job') {
    urlToOpen = '/jobs';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'sync-assessment-progress') {
    event.waitUntil(syncAssessmentProgress());
  } else if (event.tag === 'sync-learning-progress') {
    event.waitUntil(syncLearningProgress());
  } else if (event.tag === 'sync-user-actions') {
    event.waitUntil(syncUserActions());
  }
});

// Sync assessment progress when back online
async function syncAssessmentProgress() {
  try {
    const cache = await caches.open('offline-actions');
    const requests = await cache.keys();
    
    for (const request of requests) {
      if (request.url.includes('/assessments/')) {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.delete(request);
          }
        } catch (error) {
          console.log('Service Worker: Failed to sync assessment', error);
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Assessment sync failed', error);
  }
}

// Sync learning progress when back online
async function syncLearningProgress() {
  try {
    const cache = await caches.open('offline-actions');
    const requests = await cache.keys();
    
    for (const request of requests) {
      if (request.url.includes('/learning-progress/')) {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.delete(request);
          }
        } catch (error) {
          console.log('Service Worker: Failed to sync learning progress', error);
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Learning progress sync failed', error);
  }
}

// Sync general user actions when back online
async function syncUserActions() {
  try {
    const cache = await caches.open('offline-actions');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.log('Service Worker: Failed to sync user action', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: User actions sync failed', error);
  }
}

// Handle app updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }
});

// Sync content in background
async function syncContent() {
  try {
    // Refresh critical cached content
    const cache = await caches.open(API_CACHE);
    
    const criticalEndpoints = [
      '/api/v1/users/profile',
      '/api/v1/skills',
      '/api/v1/assessments'
    ];
    
    for (const endpoint of criticalEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          await cache.put(endpoint, response);
        }
      } catch (error) {
        console.log('Service Worker: Failed to sync content', endpoint, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Content sync failed', error);
  }
}
