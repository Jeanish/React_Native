/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundHandler } from './src/services/firebase/notifications.service';

// FCM background handler must be registered before AppRegistry.registerComponent.
registerBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
