import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import "nativewind/tailwind.css";

AppRegistry.registerComponent(appName, () => App);
