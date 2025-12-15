declare const process: {
  env: {
    NG_APP_FIREBASE_API_KEY?: string;
    NG_APP_FIREBASE_AUTH_DOMAIN?: string;
    NG_APP_FIREBASE_PROJECT_ID?: string;
    NG_APP_FIREBASE_STORAGE_BUCKET?: string;
    NG_APP_FIREBASE_MESSAGING_SENDER_ID?: string;
    NG_APP_FIREBASE_APP_ID?: string;
  }
};

export const firebaseConfig = {
  apiKey: process.env['NG_APP_FIREBASE_API_KEY'] || '',
  authDomain: process.env['NG_APP_FIREBASE_AUTH_DOMAIN'] || '',
  projectId: process.env['NG_APP_FIREBASE_PROJECT_ID'] || '',
  storageBucket: process.env['NG_APP_FIREBASE_STORAGE_BUCKET'] || '',
  messagingSenderId: process.env['NG_APP_FIREBASE_MESSAGING_SENDER_ID'] || '',
  appId: process.env['NG_APP_FIREBASE_APP_ID'] || ''
};