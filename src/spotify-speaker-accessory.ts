import { Service, PlatformAccessory, Logger, Categories } from 'homebridge';

import { HomebridgeSpotifySpeakerPlatform } from './platform';
import { HomebridgeSpotifySpeakerDevice } from './types';

export class SpotifySpeakerAccessory {
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
      this.accessory.addService(this.platform.Service.Lightbulb, this.device.deviceName);

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
      const oldActiveState = this.activeState;
      const oldVolume = this.currentVolume;

      await this.setCurrentStates();

      if (oldActiveState !== this.activeState) {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.activeState);
      }
      if (oldVolume !== this.currentVolume) {
        this.service.updateCharacteristic(this.platform.Characteristic.Brightness, this.currentVolume);
      }
    }, SpotifySpeakerAccessory.DEFAULT_POLL_INTERVAL_MS);
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

    try {
      if (value) {
        await this.platform.spotifyApiWrapper.play(this.device.spotifyDeviceId, this.device.spotifyPlaylistUrl);
        await this.platform.spotifyApiWrapper.setShuffle(true, this.device.spotifyDeviceId);
      } else {
        await this.platform.spotifyApiWrapper.pause(this.device.spotifyDeviceId);
      }

      this.activeState = value;
    } catch (error) {
      if ((error as Error).name === 'SpotifyDeviceNotFoundError') {
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
    }
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

    try {
      await this.platform.spotifyApiWrapper.setVolume(value, this.device.spotifyDeviceId);
      this.currentVolume = value;
    } catch (error) {
      if ((error as Error).name === 'SpotifyDeviceNotFoundError') {
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
    }
  }

  private async setInitialState(): Promise<void> {
    await this.setCurrentStates();

    this.log.debug(`Set initial state // active ${this.activeState} // volume ${this.currentVolume}`);
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.activeState);
    this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(this.currentVolume);
  }

  private async setCurrentStates() {
    const state = await this.platform.spotifyApiWrapper.getPlaybackState();
    const playingHref = state?.body?.context?.href;
    const playingDeviceId = state?.body?.device?.id;

    if (!state || state.statusCode !== 200) {
      this.activeState = false;
      this.currentVolume = 0;
      return;
    }

    if (state.body.is_playing && this.isPlaying(playingHref, playingDeviceId ?? undefined)) {
      this.activeState = state.body.is_playing;
      this.currentVolume = state.body.device.volume_percent || 0;
    } else {
      this.activeState = false;
      this.currentVolume = 0;
    }
  }

  /**
   * Finds which speaker should be synced.
   *
   * Speakers tied to a playlist will have priority over lone
   * speakers (no playlist ID associated).
   *
   * @param playingHref The href of the currently playing Spotify playlist
   * @param playingDeviceId The spotify device ID
   */
  private isPlaying(playingHref: string | undefined, playingDeviceId: string | undefined) {
    const contextPlaylistId = this.accessory.context.playlistId;

    if (contextPlaylistId && playingHref?.includes(contextPlaylistId)) {
      return true;
    }

    const currentDevicePlaying = this.device.spotifyDeviceId === playingDeviceId;
    const hasHigherPrioritySpeaker = this.platform.accessories.find((a) => playingHref?.includes(a.context.playlistId));
    if (currentDevicePlaying && !contextPlaylistId && !hasHigherPrioritySpeaker) {
      return true;
    }

    return false;
  }
}
