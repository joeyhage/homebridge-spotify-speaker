import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { HomebridgeSpotifyPlatform } from './platform';

export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, HomebridgeSpotifyPlatform);
};
