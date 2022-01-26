import { Service, PlatformAccessory, Logger } from 'homebridge';

import { HomebridgeSpotifyPlatform } from './platform';
import { HomebridgeSpotifyDevice } from './types';

export class SpotifyPlaylistPlayerAccessory {
  private service: Service;
  private isOn: boolean;

  constructor(
    private readonly platform: HomebridgeSpotifyPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly device: HomebridgeSpotifyDevice,
    public readonly log: Logger,
  ) {
    this.isOn = false;
    this.service =
      this.accessory.getService(
        this.platform.Service.Switch,
      ) ||
      this.accessory.addService(
        this.platform.Service.Switch,
      );

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.device.deviceName,
    );

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));

  }

  handleOnGet() {
    this.log.debug('Triggered GET On');
    return this.isOn;
  }

  handleOnSet(value) {
    this.log.debug('Triggered SET On:', value);
    this.isOn = value;

    !this.isOn ?
      this.platform.spotifyApiWrapper?.pause(this.device.spotifyDeviceId)
      : this.platform.spotifyApiWrapper?.play(this.device.spotifyDeviceId, this.device.spotifyPlaylistId);
  }
}
