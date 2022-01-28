import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, Categories } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
// import { SpotifySmartSpeakerAccessory } from './spotify-smart-speaker-accessory';
import { SpotifyFakeSpeakerAccessory } from './spotify-speaker-accessory';
import { SpotifyApiWrapper } from './spotify-api-wrapper';

export class HomebridgeSpotifyPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly spotifyApiWrapper: SpotifyApiWrapper;
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
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
      const uuid = this.api.hap.uuid.generate(device.spotifyDeviceId);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // Update the playlist ID if it changed
        existingAccessory.context.device = device;
        this.api.updatePlatformAccessories([existingAccessory]);

        // new SpotifySmartSpeakerAccessory(this, existingAccessory, device, this.log);
        new SpotifyFakeSpeakerAccessory(this, existingAccessory, device, this.log);
      } else {
        this.log.info('Adding new accessory:', device.deviceName);

        const accessory = new this.api.platformAccessory(device.deviceName, uuid, SpotifyFakeSpeakerAccessory.CATEGORY);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // new SpotifySmartSpeakerAccessory(this, accessory, device, this.log);
        new SpotifyFakeSpeakerAccessory(this, accessory, device, this.log);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  private async logAvailableSpotifyDevices() {
    const spotifyDevices = await this.spotifyApiWrapper.getMyDevices();
    this.log.info('Available Spotify devices', spotifyDevices);
  }
}
