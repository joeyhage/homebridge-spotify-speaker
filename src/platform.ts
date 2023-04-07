import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';
import { URL } from 'url';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SpotifySpeakerAccessory } from './spotify-speaker-accessory';
import { SpotifyApiWrapper } from './spotify-api-wrapper';

const DEVICE_CLASS_CONFIG_MAP = {
  speaker: SpotifySpeakerAccessory,
};

const DAY_INTERVAL = 60 * 60 * 24 * 1000;

export class HomebridgeSpotifySpeakerPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly spotifyApiWrapper: SpotifyApiWrapper;
  public readonly accessories: {
    [uuid: string]: PlatformAccessory;
  } = {};

  constructor(public readonly log: Logger, public readonly config: PlatformConfig, public readonly api: API) {
    this.log.debug('Finished initializing platform:', this.config.name);

    if (!config.spotifyClientId || !config.spotifyClientSecret || !config.spotifyAuthCode) {
      this.log.error('Missing configuration for this plugin to work, see the documentation for initial setup');
      return;
    }

    this.spotifyApiWrapper = new SpotifyApiWrapper(log, config, api);

    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');

      const isAuthenticated = await this.spotifyApiWrapper.authenticate();
      if (!isAuthenticated) {
        return;
      }

      this.logAvailableSpotifyDevices();
      this.discoverDevices();
    });

    // Make sure we have the latest tokens saved
    this.api.on('shutdown', () => {
      this.spotifyApiWrapper.persistTokens();
    });

    setInterval(async () => await this.spotifyApiWrapper.refreshTokens(), DAY_INTERVAL);
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories[accessory.UUID] = accessory;
  }

  discoverDevices() {
    if (!this.config.devices) {
      this.log.error('The "devices" section is missing in your plugin configuration, please add at least one device.');
      return;
    }

    const cachedAccessoryIds = Object.keys(this.accessories),
      platformAccessories: PlatformAccessory[] = [],
      activeAccessoryIds: string[] = [];

    for (const device of this.config.devices) {
      const deviceClass = this.getDeviceConstructor(device.deviceType);
      if (!deviceClass) {
        continue;
      }

      const uuid = this.api.hap.uuid.generate(`${device.deviceName}-${device.spotifyDeviceId}`);
      const existingAccessory = this.accessories[uuid];
      const playlistId = this.extractPlaylistId(device.spotifyPlaylistUrl);

      const accessory =
        existingAccessory ?? new this.api.platformAccessory(device.deviceName, uuid, deviceClass.CATEGORY);
      accessory.context.device = device;
      accessory.context.playlistId = playlistId;
      new deviceClass(this, accessory, device, this.log);
      activeAccessoryIds.push(uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', accessory.displayName);
      } else {
        this.log.info('Adding new accessory:', device.deviceName);
        platformAccessories.push(accessory);
      }
    }

    if (platformAccessories.length) {
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, platformAccessories);
    }

    const staleAccessories = cachedAccessoryIds
      .filter((cachedId) => !activeAccessoryIds.includes(cachedId))
      .map((id) => this.accessories[id]);

    staleAccessories.forEach((staleAccessory) => {
      this.log.info(`Removing stale cached accessory ${staleAccessory.UUID} ${staleAccessory.displayName}`);
    });

    if (staleAccessories.length) {
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, staleAccessories);
    }
  }

  private extractPlaylistId(playlistUrl: string): string | null {
    try {
      // Empty playlist ID is allowed for cases where one wants to only
      // play or pause one speaker started from an external source.
      if (!playlistUrl) {
        return null;
      }

      const url = new URL(playlistUrl);
      const playlistId = url.pathname.split('/')[2];
      this.log.debug(`Found playlistId: ${playlistId}`);

      return playlistId;
    } catch (error) {
      this.log.error(
        `Failed to extract playlist ID, the plugin might behave in an unexpected way.
        Please check the configuration and provide a valid playlist URL`,
      );

      return null;
    }
  }

  private getDeviceConstructor(deviceType): typeof SpotifySpeakerAccessory | null {
    if (!deviceType) {
      this.log.error('It is missing the `deviceType` in the configuration.');
      return null;
    }

    return DEVICE_CLASS_CONFIG_MAP[deviceType];
  }

  private async logAvailableSpotifyDevices(): Promise<void> {
    const spotifyDevices = await this.spotifyApiWrapper.getMyDevices();

    if (!spotifyDevices || spotifyDevices.length === 0) {
      this.log.warn(
        'No available spotify devices found, make sure that the speaker you configured is On and visible by Spotify Connect',
      );
    } else {
      this.log.info('Available Spotify devices', spotifyDevices);
    }
  }
}
