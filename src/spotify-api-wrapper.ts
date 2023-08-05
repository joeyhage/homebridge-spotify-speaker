import fs from 'fs';
import SpotifyWebApi from 'spotify-web-api-node';
import { SpotifyDeviceNotFoundError } from './errors';

import type { API, Logger, PlatformConfig } from 'homebridge';
import type { HomebridgeSpotifySpeakerDevice } from './spotify-speaker-accessory';
import { SpotifyPlaybackState, WebapiError } from './types';

const DEFAULT_SPOTIFY_CALLBACK = 'https://example.com/callback';

export class SpotifyApiWrapper {
  private readonly authCode: string;
  private readonly persistPath: string;

  private spotifyApi: SpotifyWebApi;

  constructor(public readonly log: Logger, public readonly config: PlatformConfig, public readonly api: API) {
    this.authCode = config.spotifyAuthCode;
    this.persistPath = `${api.user.persistPath()}/.homebridge-spotify-speaker`;

    this.spotifyApi = new SpotifyWebApi({
      clientId: config.spotifyClientId,
      clientSecret: config.spotifyClientSecret,
      redirectUri: config.spotifyRedirectUri || DEFAULT_SPOTIFY_CALLBACK,
    });
  }

  async authenticate(): Promise<boolean> {
    await this.fetchTokensFromStorage();
    if (this.spotifyApi.getAccessToken()) {
      this.log.debug('Spotify auth success using saved tokens');
      return true;
    }

    await this.authWithCodeGrant();
    if (this.spotifyApi.getAccessToken()) {
      this.log.debug('Spotify auth success using authorization code flow');
      return true;
    }

    this.log.error(
      `We could not fetch the Spotify tokens nor authenticate using the code grant flow.
        Please redo the manual login step, provide the new auth code in the config then try again.`,
    );

    return false;
  }

  persistTokens() {
    if (!this.spotifyApi.getAccessToken() || !this.spotifyApi.getRefreshToken()) {
      return;
    }

    const writeData = JSON.stringify({
      accessToken: this.spotifyApi.getAccessToken(),
      refreshToken: this.spotifyApi.getRefreshToken(),
    });

    try {
      fs.writeFileSync(this.persistPath, writeData);
    } catch (err) {
      this.log.warn(
        'Failed to persist tokens, the plugin might not be able to authenticate when homebridge restarts:\n\n',
        err,
      );
    }
  }

  async play(deviceId: string, contextUri: string) {
    const options = {
      device_id: deviceId,
      context_uri: contextUri,
    };

    await this.wrappedRequest(() => this.spotifyApi.play(options));
  }

  async pause(deviceId: string) {
    await this.wrappedRequest(() => this.spotifyApi.pause({ device_id: deviceId }));
  }

  async getPlaybackState(): Promise<SpotifyPlaybackState | undefined> {
    return this.wrappedRequest(() => this.spotifyApi.getMyCurrentPlaybackState());
  }

  async setShuffle(state: HomebridgeSpotifySpeakerDevice['playlistShuffle'], deviceId: string) {
    await this.wrappedRequest(() => this.spotifyApi.setShuffle(state ?? true, { device_id: deviceId }));
  }

  async setRepeat(state: HomebridgeSpotifySpeakerDevice['playlistRepeat'], deviceId: string) {
    await this.wrappedRequest(() => this.spotifyApi.setRepeat(state ? 'context' : 'off', { device_id: deviceId }));
  }

  async setVolume(volume: number, deviceId: string) {
    await this.wrappedRequest(() => this.spotifyApi.setVolume(volume, { device_id: deviceId }));
  }

  async getMyDevices(isFirstAttempt = true): Promise<SpotifyApi.UserDevice[]> {
    try {
      const res = await this.spotifyApi.getMyDevices();
      return res.body.devices;
    } catch (error) {
      if (isFirstAttempt) {
        return new Promise((resolve) => {
          setTimeout(() => {
            this.getMyDevices(false).then(resolve);
          }, 500);
        });
      } else {
        this.log.error('Failed to fetch available Spotify devices.', error);
        return [];
      }
    }
  }

  private async authWithCodeGrant(): Promise<void> {
    this.log.debug('Attempting the code grant authorization flow');

    try {
      const data = await this.spotifyApi.authorizationCodeGrant(this.authCode);
      this.spotifyApi.setAccessToken(data.body['access_token']);
      this.spotifyApi.setRefreshToken(data.body['refresh_token']);
    } catch (err) {
      this.log.error('Could not authorize Spotify:\n\n', JSON.stringify(err));
    }
  }

  private async fetchTokensFromStorage() {
    this.log.debug('Attempting to fetch tokens saved in the storage');

    let tokens: { accessToken: string; refreshToken: string };
    try {
      tokens = JSON.parse(fs.readFileSync(this.persistPath, { encoding: 'utf-8' }));
    } catch (err) {
      this.log.debug('Failed to fetch tokens: ', err);
      return;
    }

    if (!tokens.accessToken || !tokens.refreshToken) {
      return;
    }

    this.spotifyApi.setAccessToken(tokens.accessToken);
    this.spotifyApi.setRefreshToken(tokens.refreshToken);
    this.log.debug('Successfully fetched the tokens from storage, going to refresh the access token');

    const areTokensRefreshed = await this.refreshTokens();
    if (!areTokensRefreshed) {
      // Reset the creds since they are wrong, we will try the code auth grant instead.
      this.spotifyApi.resetCredentials();
    }
  }

  async refreshTokens(): Promise<boolean> {
    try {
      const data = await this.spotifyApi.refreshAccessToken();
      this.log.debug('The access token has been refreshed!');

      this.spotifyApi.setAccessToken(data.body['access_token']);
      this.persistTokens();
    } catch (error: unknown) {
      this.log.debug('Could not refresh access token: ', (error as WebapiError).body);
      return false;
    }

    return true;
  }

  private async wrappedRequest<T>(cb: () => Promise<T>, isFirstAttempt = true): Promise<T | undefined> {
    try {
      const response = await cb();
      return response;
    } catch (error: unknown) {
      let errorMessage = error;
      if (isWebApiError(error)) {
        const webApiError = error as WebapiError;
        if (isFirstAttempt && webApiError.statusCode === 401) {
          this.log.debug('Access token has expired, attempting token refresh');

          const areTokensRefreshed = await this.refreshTokens();
          if (areTokensRefreshed) {
            return this.wrappedRequest(cb, false);
          }
        } else if (webApiError.statusCode === 404) {
          return isFirstAttempt ? this.wrappedRequest(cb, false) : Promise.reject(new SpotifyDeviceNotFoundError());
        }
        errorMessage = webApiError.body;
      }

      this.log.error('Unexpected error when making a request to Spotify:', JSON.stringify(errorMessage));
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isWebApiError(error: any): boolean {
  return error.constructor.name === 'WebapiError' || Object.getPrototypeOf(error.constructor).name === 'WebapiError';
}
