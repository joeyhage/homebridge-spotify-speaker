<<<<<<< HEAD
import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { HomebridgeSpotifyPlatform } from './platform';

export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, HomebridgeSpotifyPlatform);
};
=======
import type { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { ExampleHomebridgePlatform } from './platform'; 

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, ExampleHomebridgePlatform);
}
>>>>>>> 7d40dc0 (split into multiple files)
