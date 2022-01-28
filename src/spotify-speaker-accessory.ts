import { Service, PlatformAccessory, Logger } from 'homebridge';

import { HomebridgeSpotifyPlatform } from './platform';
import { HomebridgeSpotifyDevice } from './types';

export class SpotifySpeakerAccessory {
  private static DEFAULT_POLL_INTERVAL_MS = 20 * 1000;
  private service: Service;
  private activeState: number;
  private isMuted: boolean;
  private currentVolume: number;

  constructor(
    private readonly platform: HomebridgeSpotifyPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly device: HomebridgeSpotifyDevice,
    public readonly log: Logger,
  ) {
    this.service =
      this.accessory.getService(
        this.platform.Service.Speaker,
      ) ||
      this.accessory.addService(
        this.platform.Service.Speaker,
      );

    this.service.updateCharacteristic(this.platform.Characteristic.Name, this.device.deviceName);

    this.service.getCharacteristic(this.platform.Characteristic.Mute)
      .onGet(this.handleMuteGet.bind(this))
      .onSet(this.handleMuteSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.handleActiveGet.bind(this))
      .onSet(this.handleActiveSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Volume)
      .onGet(this.handleVolumeGet.bind(this))
      .onSet(this.handleVolumeSet.bind(this));

    this.activeState = this.platform.Characteristic.Active.ACTIVE;
    this.currentVolume = 0;
    this.isMuted = false;

    this.setInitialState();

    setInterval(async () => {
      const state = await this.platform.spotifyApiWrapper.getPlaybackState();

      const oldActiveState = this.activeState;
      const oldVolume = this.currentVolume;

      if (state.statusCode === 200) {
        this.activeState = this.getActiveState(state.body.is_playing);
        this.currentVolume = state.body.device.volume_percent;
      } else if (state.statusCode === 204) {
        this.activeState = this.platform.Characteristic.Active.INACTIVE;
        this.currentVolume = 0;
      }

      if (oldActiveState !== this.activeState) {
        this.service.getCharacteristic(this.platform.Characteristic.Active).updateValue(this.activeState);
      }
      if (oldVolume !== this.currentVolume) {
        this.service.updateCharacteristic(this.platform.Characteristic.Volume, this.currentVolume);
      }
    }, SpotifySpeakerAccessory.DEFAULT_POLL_INTERVAL_MS);

  }

  handleActiveGet(): number {
    this.log.debug('Triggered GET Active:', this.activeState);
    return this.activeState;
  }

  async handleActiveSet(value): Promise<void> {
    this.log.debug('Triggered SET Active:', value);

    switch (value) {
      case this.platform.Characteristic.Active.ACTIVE:
        await this.platform.spotifyApiWrapper.play(this.device.spotifyDeviceId, this.device.spotifyPlaylistId);
        break;
      case this.platform.Characteristic.Active.INACTIVE:
        await this.platform.spotifyApiWrapper.pause(this.device.spotifyDeviceId);
        break;

      default:
        this.log.error('Unknown target media state:', value);
        break;
    }

    this.activeState = value;
  }

  async handleVolumeGet() {
    this.log.debug('Triggered GET CurrentMediaState:', this.currentVolume);
    return this.currentVolume;
  }

  async handleVolumeSet(value): Promise<void> {
    this.log.debug('Set volume');
    await this.platform.spotifyApiWrapper.setVolume(value, this.device.spotifyDeviceId);
    this.currentVolume = value;
  }

  handleMuteGet() {
    this.log.debug('Triggered GET Mute:', this.isMuted);
    return this.isMuted;
  }

  async handleMuteSet(): Promise<void> {
    this.log.debug('Set mute');
    const volume = this.isMuted ? 50 : 0;
    await this.platform.spotifyApiWrapper.setVolume(volume, this.device.spotifyDeviceId);
    this.isMuted = !this.isMuted;
  }

  private getActiveState(isPlaying: boolean): number {
    return isPlaying
      ? this.platform.Characteristic.Active.ACTIVE
      : this.platform.Characteristic.Active.INACTIVE;
  }

  private async setInitialState(): Promise<void> {
    this.log.debug('Set initial state');
    const state = await this.platform.spotifyApiWrapper.getPlaybackState();

    if (state.statusCode === 200) {
      this.activeState = this.getActiveState(state.body.is_playing);
      this.currentVolume = state.body.device.volume_percent;
    } else if (state.statusCode === 204) {
      this.activeState = this.platform.Characteristic.Active.INACTIVE;
      this.currentVolume = 0;
    }

    this.service.getCharacteristic(this.platform.Characteristic.Active).updateValue(this.activeState);
    this.service.getCharacteristic(this.platform.Characteristic.Volume).updateValue(this.currentVolume);
    this.service.getCharacteristic(this.platform.Characteristic.Mute).updateValue(this.isMuted);
  }
}