import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SpotifySmartSpeakerAccessory } from './spotify-smart-speaker-accessory';
import { SpotifyFakeSpeakerAccessory } from './spotify-speaker-accessory';
import { SpotifyApiWrapper } from './spotify-api-wrapper';
import { SPOTIFY_MISSING_CONFIGURATION_ERROR } from './constants';

const DEVICE_CLASS_CONFIG_MAP = {
  speaker: SpotifyFakeSpeakerAccessory,
  smartSpeaker: SpotifySmartSpeakerAccessory,
};
export class HomebridgeSpotifySpeakerPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly spotifyApiWrapper: SpotifyApiWrapper;
  public readonly accessories: PlatformAccessory[] = [];

  constructor(public readonly log: Logger, public readonly config: PlatformConfig, public readonly api: API) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.spotifyApiWrapper = new SpotifyApiWrapper(log, config, api);

    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');

      await this.spotifyApiWrapper.authenticate();
      this.logAvailableSpotifyDevices();
      this.discoverDevices();
    });

    // Make sure we have the latest tokens saved
    this.api.on('shutdown', () => {
      this.spotifyApiWrapper.persistTokens();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {
    for (const device of this.config.devices) {
      const deviceClass = this.getDeviceConstructor(device.deviceType);
      const uuid = this.api.hap.uuid.generate(device.spotifyDeviceId);
      const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        existingAccessory.context.device = device;
        this.api.updatePlatformAccessories([existingAccessory]);

        new deviceClass(this, existingAccessory, device, this.log);
      } else {
        this.log.info('Adding new accessory:', device.deviceName);

        const accessory = new this.api.platformAccessory(device.deviceName, uuid, deviceClass.CATEGORY);
        accessory.context.device = device;

        new deviceClass(this, accessory, device, this.log);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  private getDeviceConstructor(deviceType) {
    if (!deviceType) {
      this.log.error('It is missing the `deviceType` in the configuration.');
      throw new Error(SPOTIFY_MISSING_CONFIGURATION_ERROR);
    }

    return DEVICE_CLASS_CONFIG_MAP[deviceType];
  }

  private async logAvailableSpotifyDevices() {
    const spotifyDevices = await this.spotifyApiWrapper.getMyDevices();
    this.log.info('Available Spotify devices', spotifyDevices);
  }
}
