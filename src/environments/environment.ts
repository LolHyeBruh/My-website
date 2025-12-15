declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

const getFirebaseConfig = () => {
  try {
    const apiKey = (process as any).env?.['NG_APP_FIREBASE_API_KEY'];
    if (apiKey) {
      return {
        apiKey: apiKey,
        authDomain: (process as any).env?.['NG_APP_FIREBASE_AUTH_DOMAIN'] || '',
        projectId: (process as any).env?.['NG_APP_FIREBASE_PROJECT_ID'] || '',
        storageBucket: (process as any).env?.['NG_APP_FIREBASE_STORAGE_BUCKET'] || '',
        messagingSenderId: (process as any).env?.['NG_APP_FIREBASE_MESSAGING_SENDER_ID'] || '',
        appId: (process as any).env?.['NG_APP_FIREBASE_APP_ID'] || '',
      };
    }
  } catch (e) {
    // Silently fail - fall through to local config
  }

  return {
    apiKey: "AIzaSyBW0XZ8W5RlxLtD9Ql_sM8GpSCLA-sWQas",
    authDomain: "videoplayer-91460.firebaseapp.com",
    projectId: "videoplayer-91460",
    storageBucket: "videoplayer-91460.firebasestorage.app",
    messagingSenderId: "447765082696",
    appId: "1:447765082696:web:750e61c59143cf52c9de7d",
    measurementId: "G-FS29NTHHY6"
  };
};

export const environment = {
  production: false,
  firebase: getFirebaseConfig()
};
