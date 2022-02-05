import { Service, PlatformAccessory, Logger, Categories } from 'homebridge';

import { HomebridgeSpotifySpeakerPlatform } from './platform';
import { HomebridgeSpotifySpeakerDevice } from './types';

export class SpotifyFakeSpeakerAccessory {
  private static DEFAULT_POLL_INTERVAL_MS = 20 * 1000;
  private service: Service;
  private activeState: boolean;
  private currentVolume: number;

  public static CATEGORY = Categories.LIGHTBULB;

  constructor(
    private readonly platform: HomebridgeSpotifySpeakerPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly device: HomebridgeSpotifySpeakerDevice,
    public readonly log: Logger,
  ) {
    this.service =
      this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.updateCharacteristic(this.platform.Characteristic.Name, this.device.deviceName);

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Brightness)
      .onGet(this.handleBrightnessGet.bind(this))
      .onSet(this.handleBrightnessSet.bind(this));

    this.activeState = false;
    this.currentVolume = 0;

    this.setInitialState();

    setInterval(async () => {
      const state = await this.platform.spotifyApiWrapper.getPlaybackState();

      const oldActiveState = this.activeState;
      const oldVolume = this.currentVolume;

      if (state.statusCode === 200) {
        this.activeState = state.body.is_playing;
        this.currentVolume = state.body.device.volume_percent;
      } else if (state.statusCode === 204) {
        this.activeState = false;
        this.currentVolume = 0;
      }

      if (oldActiveState !== this.activeState) {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.activeState);
      }
      if (oldVolume !== this.currentVolume) {
        this.service.updateCharacteristic(this.platform.Characteristic.Brightness, this.currentVolume);
      }
    }, SpotifyFakeSpeakerAccessory.DEFAULT_POLL_INTERVAL_MS);
  }

  handleOnGet(): boolean {
    this.log.debug('Triggered GET Active:', this.activeState);
    return this.activeState;
  }

  async handleOnSet(value): Promise<void> {
    this.log.debug('Triggered SET Active:', value);
    if (value === this.activeState) {
      return;
    }

    if (value) {
      this.platform.spotifyApiWrapper.play(this.device.spotifyDeviceId, this.device.spotifyPlaylistId);
      this.platform.spotifyApiWrapper.setShuffle(true, this.device.spotifyDeviceId);
    } else {
      this.platform.spotifyApiWrapper.pause(this.device.spotifyDeviceId);
    }

    this.activeState = value;
  }

  async handleBrightnessGet() {
    this.log.debug('Get volume', this.currentVolume);
    return this.currentVolume;
  }

  async handleBrightnessSet(value): Promise<void> {
    this.log.debug('Set volume:', value);
    if (value === this.currentVolume) {
      return;
    }

    await this.platform.spotifyApiWrapper.setVolume(value, this.device.spotifyDeviceId);
    this.currentVolume = value;
  }

  private async setInitialState(): Promise<void> {
    const state = await this.platform.spotifyApiWrapper.getPlaybackState();

    if (state.statusCode === 200) {
      this.activeState = state.body.is_playing;
      this.currentVolume = state.body.device.volume_percent;
    } else if (state.statusCode === 204) {
      this.activeState = false;
      this.currentVolume = 0;
    }

    this.log.debug(`Set initial state // active ${this.activeState} // volume ${this.currentVolume}`);
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.activeState);
    this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(this.currentVolume);
  }
}
