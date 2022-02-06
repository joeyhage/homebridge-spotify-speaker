import fs from 'fs';

import { API, Logger, PlatformConfig } from 'homebridge';
import SpotifyWebApi from 'spotify-web-api-node';

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
      redirectUri: DEFAULT_SPOTIFY_CALLBACK,
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

  async play(deviceId: string, contextUri: string, uris?: string, offset?: number, positionMs?: number) {
    const options = {
      device_id: deviceId,
      context_uri: contextUri,
      ...(uris && { uris }),
      ...(offset && { offset }),
      ...(positionMs && { position_ms: positionMs }),
    };

    await this.wrappedRequest(() => this.spotifyApi.play(options));
  }

  async pause(deviceId: string) {
    await this.wrappedRequest(() => this.spotifyApi.pause({ device_id: deviceId }));
  }

  async getPlaybackState(): Promise<SpotifyPlaybackState | undefined> {
    return this.wrappedRequest(() => this.spotifyApi.getMyCurrentPlaybackState());
  }

  async setShuffle(state: boolean, deviceId: string) {
    await this.wrappedRequest(() => this.spotifyApi.setShuffle(state, { device_id: deviceId }));
  }

  async setVolume(volume: number, deviceId: string) {
    await this.wrappedRequest(() => this.spotifyApi.setVolume(volume, { device_id: deviceId }));
  }

  async getMyDevices() {
    try {
      const res = await this.spotifyApi.getMyDevices();
      return res.body.devices;
    } catch (error) {
      this.log.error('Failed to fetch available Spotify devices.');
      return null;
    }
  }

  private async authWithCodeGrant(): Promise<void> {
    this.log.debug('Attempting the code grant authorization flow');

    try {
      const data = await this.spotifyApi.authorizationCodeGrant(this.authCode);
      this.spotifyApi.setAccessToken(data.body['access_token']);
      this.spotifyApi.setRefreshToken(data.body['refresh_token']);
    } catch (err) {
      this.log.error('Could not authorize Spotify:\n\n', err);
    }
  }

  private async fetchTokensFromStorage() {
    this.log.debug('Attempting to fetch tokens saved in the storage');

    let tokens;
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
    } catch (err) {
      this.log.debug('Could not refresh access token: ', err);
      return false;
    }

    return true;
  }

  private async wrappedRequest<T>(cb: () => Promise<T>): Promise<T | undefined> {
    try {
      const response = await cb();
      return response;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isWebApiError = Object.getPrototypeOf((error as any).constructor).name === 'WebapiError';

      if (isWebApiError && (error as WebapiError).statusCode === 401) {
        this.log.debug('Access token has expired, attempting token refresh');

        const areTokensRefreshed = await this.refreshTokens();
        if (areTokensRefreshed) {
          return this.wrappedRequest(cb);
        }
      }

      this.log.error('Unexpected error when making a request to Spotify:', (error as WebapiError).body);
    }
  }
}
