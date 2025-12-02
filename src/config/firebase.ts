import { initializeApp } from '@react-native-firebase/app';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = Platform.select({
  android: {
    appId: '1:998672412190:android:d2314b33efdcefe464480f',
    apiKey: 'AIzaSyB4OKEiFC72n3QWb4R-cmJKxFfq4InlI0Y',
    projectId: 'pokeexplorer-8b5dc',
    storageBucket: 'pokeexplorer-8b5dc.firebasestorage.app',
    messagingSenderId: '998672412190',
  },
  ios: {
    appId: '1:998672412190:ios:a3b6aeb3a2c42d0864480f',
    apiKey: 'AIzaSyBt2NqeafYCoQaQc0T8PVCbELMfhQimypM',
    projectId: 'pokeexplorer-8b5dc',
    storageBucket: 'pokeexplorer-8b5dc.firebasestorage.app',
    messagingSenderId: '998672412190',
  },
  default: {
    appId: '1:998672412190:android:d2314b33efdcefe464480f',
    apiKey: 'AIzaSyB4OKEiFC72n3QWb4R-cmJKxFfq4InlI0Y',
    projectId: 'pokeexplorer-8b5dc',
    storageBucket: 'pokeexplorer-8b5dc.firebasestorage.app',
    messagingSenderId: '998672412190',
  },
});

const app = initializeApp(firebaseConfig);

export default app;