import fs from 'fs';

import { API, Logger, PlatformConfig } from 'homebridge';
import SpotifyWebApi from 'spotify-web-api-node';

import {
  DEFAULT_SPOTIFY_CALLBACK,
  SPOTIFY_AUTH_ERROR,
  SPOTIFY_MISSING_CONFIGURATION_ERROR,
  SPOTIFY_REFRESH_TOKEN_ERROR,
} from './constants';

export class SpotifyApiWrapper {
  private readonly authCode: string;
  private readonly persistPath: string;

  private spotifyApi: SpotifyWebApi;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    if (
      !config.spotifyClientId ||
      !config.spotifyClientSecret ||
      !config.spotifyAuthCode
    ) {
      this.log.error(
        'Missing configuration for this plugin to work, see the documentation for initial setup',
      );
      throw new Error(SPOTIFY_MISSING_CONFIGURATION_ERROR);
    }

    this.authCode = config.spotifyAuthCode;
    this.persistPath = `${api.user.persistPath()}/.homebridge-spotify`;

    this.spotifyApi = new SpotifyWebApi({
      clientId: config.spotifyClientId,
      clientSecret: config.spotifyClientSecret,
      redirectUri: DEFAULT_SPOTIFY_CALLBACK,
    });
  }

  private async authWithCodeGrant() {
    this.log.debug('Attempting the code grant authorization flow');

    try {
      const data = await this.spotifyApi.authorizationCodeGrant(this.authCode);

      this.log.debug('The token expires in ' + data.body['expires_in']);
      this.log.debug('The access token is ' + data.body['access_token']);
      this.log.debug('The refresh token is ' + data.body['refresh_token']);

      this.spotifyApi.setAccessToken(data.body['access_token']);
      this.spotifyApi.setRefreshToken(data.body['refresh_token']);
    } catch (err) {
      this.log.error('Could not authorize Spotify:\n\n', err);
      throw new Error(SPOTIFY_AUTH_ERROR);
    }
  }

  private async fetchTokensFromStorage() {
    this.log.debug('Attempting to fetch tokens saved in the storage');

    let tokens;
    try {
      tokens = JSON.parse(
        fs.readFileSync(this.persistPath, { encoding: 'utf-8' }),
      );
    } catch (err) {
      this.log.debug('Failed to fetch tokens:\n\n', err);
      return;
    }

    if (!tokens.accessToken || ! tokens.refreshToken) {
      return;
    }

    this.spotifyApi.setAccessToken(tokens.accessToken);
    this.spotifyApi.setRefreshToken(tokens.refreshToken);
    this.log.debug(
      'Successfully fetched the tokens from storage, going to refresh the access token',
    );

    try {
      await this.refreshToken();
    } catch {
      // Reset the creds since they are wrong, we will try the code auth grant instead.
      this.spotifyApi.resetCredentials();
    }
  }

  async authenticate() {
    await this.fetchTokensFromStorage();
    if (this.spotifyApi.getAccessToken()) {
      this.log.debug('Spotify auth success using saved tokens');
      return;
    }

    await this.authWithCodeGrant();
    if (this.spotifyApi.getAccessToken()) {
      this.log.debug('Spotify auth success using authorization code flow');
      return;
    }

    this.log.error(
      `We could not fetch the Spotify tokens nor authenticate using the code grant flow.
        Please redo the manual login step, provide the new auth code in the config then try again.`,
    );
    throw new Error(SPOTIFY_AUTH_ERROR);
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
      this.log.warn('Failed to persist tokens, the plugin might not be able to authenticate when homebridge restarts:\n\n', err);
    }
  }

  // TODO: Implement retries, it failed me once.
  async refreshToken() {
    try {
      const data = await this.spotifyApi.refreshAccessToken();
      this.log.debug('The access token has been refreshed!');

      this.spotifyApi.setAccessToken(data.body['access_token']);
      this.persistTokens();
    } catch (err) {
      this.log.debug('Could not refresh access token:\n\n', err);
      throw new Error(SPOTIFY_REFRESH_TOKEN_ERROR);
    }
  }

  async play( deviceId: string,
    contextUri: string,
    uris?: string,
    offset?: number,
    positionMs?: number) {
    const options = {
      device_id: deviceId,
      context_uri: contextUri,
      ...(uris && {uris}),
      ...(offset && {offset}),
      ...(positionMs && {position_ms: positionMs}),
    };

    await this.spotifyApi.play(options);
  }

  async pause(deviceId: string) {
    await this.spotifyApi.pause({ device_id: deviceId });
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
}
