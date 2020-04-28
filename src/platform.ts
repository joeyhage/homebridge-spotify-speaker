import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SpotifyPlaylistPlayerAccessory } from './spotifyPlaylistPlayerAccessory';
import { SpotifyApiWrapper } from './spotifyApiWrapper';

export class HomebridgeSpotifyPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly spotifyApiWrapper: SpotifyApiWrapper | null;
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    try {
      this.spotifyApiWrapper = new SpotifyApiWrapper(log, config, api);
    } catch (err) {
      this.spotifyApiWrapper = null;
      return;
    }

    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');

      try {
        await this.spotifyApiWrapper?.authenticate();
        this.discoverDevices();
      } catch {
        return;
      }

    });

    // Make sure we have the latest tokens saved
    this.api.on('shutdown', () => {
      this.spotifyApiWrapper?.persistTokens();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {

    // EXAMPLE ONLY
    // A real plugin you would discover accessories from the local network, cloud services
    // or a user-defined array in the platform config.
    const exampleDevices = [
      {
        deviceName: 'Cool Speaker',
        spotifyDeviceId: '123',
        spotifyPlaylistId: '456',
      },
    ];

    for (const device of exampleDevices) {
      const uuid = this.api.hap.uuid.generate(device.spotifyDeviceId);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // Update the playlist ID if it changed
        existingAccessory.context.device = device;
        this.api.updatePlatformAccessories([existingAccessory]);

        new SpotifyPlaylistPlayerAccessory(this, existingAccessory, this.log);
      } else {
        this.log.info('Adding new accessory:', device.deviceName);

        const accessory = new this.api.platformAccessory(device.deviceName, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        new SpotifyPlaylistPlayerAccessory(this, accessory, this.log);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
