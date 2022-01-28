import { Service, PlatformAccessory, Logger, Categories } from 'homebridge';

import { HomebridgeSpotifySpeakerPlatform } from './platform';
import { HomebridgeSpotifySpeakerDevice } from './types';

export class SpotifySmartSpeakerAccessory {
  private static DEFAULT_POLL_INTERVAL_MS = 20 * 1000;
  private service: Service;
  private currentMediaState: number;
  private targetMediaState: number;
  private currentVolume: number;

  public static CATEGORY = Categories.SPEAKER;

  constructor(
    private readonly platform: HomebridgeSpotifySpeakerPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly device: HomebridgeSpotifySpeakerDevice,
    public readonly log: Logger,
  ) {
    this.service =
      this.accessory.getService(
        this.platform.Service.SmartSpeaker,
      ) ||
      this.accessory.addService(
        this.platform.Service.SmartSpeaker,
      );

    this.service.updateCharacteristic(this.platform.Characteristic.Name, this.device.deviceName);
    this.service.updateCharacteristic(this.platform.Characteristic.ConfiguredName, this.device.deviceName);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentMediaState)
      .onGet(this.handleCurrentMediaStateGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetMediaState)
      .onGet(this.handleTargetMediaStateGet.bind(this))
      .onSet(this.handleTargetMediaStateSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Volume)
      .onGet(this.handleVolumeGet.bind(this))
      .onSet(this.handleVolumeSet.bind(this));

    this.currentMediaState = this.platform.Characteristic.CurrentMediaState.PAUSE;
    this.targetMediaState = this.platform.Characteristic.CurrentMediaState.PLAY;
    this.currentVolume = 0;

    this.setInitialState();

    setInterval(async () => {
      const state = await this.platform.spotifyApiWrapper.getPlaybackState();

      const oldMediaState = this.currentMediaState;
      const oldVolume = this.currentVolume;

      if (state.statusCode === 200) {
        this.currentMediaState = this.getMediaState(state.body.is_playing);
        this.currentVolume = state.body.device.volume_percent;
      } else if (state.statusCode === 204) {
        this.currentMediaState = this.platform.Characteristic.CurrentMediaState.STOP;
        this.currentVolume = 0;
      }

      if (oldMediaState !== this.currentMediaState) {
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentMediaState, this.currentMediaState);
      }
      if (oldVolume !== this.currentVolume) {
        this.service.updateCharacteristic(this.platform.Characteristic.Volume, this.currentVolume);
      }
    }, SpotifySmartSpeakerAccessory.DEFAULT_POLL_INTERVAL_MS);

  }

  handleCurrentMediaStateGet(): number {
    this.log.debug('Triggered GET CurrentMediaState:', this.currentMediaState);
    return this.currentMediaState;
  }

  handleTargetMediaStateGet(): number {
    this.log.debug('Triggered GET TargetMediaState:', this.targetMediaState);
    return this.targetMediaState;
  }

  async handleTargetMediaStateSet(value): Promise<void> {
    this.log.debug('Triggered SET TargetMediaState:', value);

    switch (value) {
      case this.platform.Characteristic.CurrentMediaState.PLAY:
        await this.platform.spotifyApiWrapper.play(this.device.spotifyDeviceId, this.device.spotifyPlaylistId);
        break;
      case this.platform.Characteristic.CurrentMediaState.PAUSE:
      case this.platform.Characteristic.CurrentMediaState.STOP:
        await this.platform.spotifyApiWrapper.pause(this.device.spotifyDeviceId);
        break;

      default:
        this.log.error('Unknown target media state:', value);
        break;
    }

    this.targetMediaState = value;
  }

  handleVolumeGet() {
    this.log.debug('Triggered GET CurrentMediaState:', this.currentVolume);
    return this.currentVolume;
  }

  async handleVolumeSet(value): Promise<void> {
    this.log.debug('Set volume');
    await this.platform.spotifyApiWrapper.setVolume(value, this.device.spotifyDeviceId);
    this.currentVolume = value;
  }

  private getMediaState(isPlaying: boolean): number {
    return isPlaying
      ? this.platform.Characteristic.CurrentMediaState.PLAY
      : this.platform.Characteristic.CurrentMediaState.PAUSE;
  }

  private async setInitialState(): Promise<void> {
    this.log.debug('Set initial state');
    const state = await this.platform.spotifyApiWrapper.getPlaybackState();

    if (state.statusCode === 200) {
      this.currentMediaState = this.getMediaState(state.body.is_playing);
      this.currentVolume = state.body.device.volume_percent;
    } else if (state.statusCode === 204) {
      this.currentMediaState = this.platform.Characteristic.CurrentMediaState.STOP;
      this.currentVolume = 0;
    }

    this.service.getCharacteristic(this.platform.Characteristic.CurrentMediaState).updateValue(this.currentMediaState);
    this.service.getCharacteristic(this.platform.Characteristic.Volume).updateValue(this.currentVolume);
  }
}