import { Logger, PlatformConfig } from 'homebridge';
import SpotifyWebApi from 'spotify-web-api-node';
import {
  DEFAULT_SPOTIFY_CALLBACK,
  SPOTIFY_AUTH_ERROR,
  SPOTIFY_MISSING_CONFIGURATION_ERROR,
} from './constants';

export class SpotifyWrapper {
  private spotifyApi: SpotifyWebApi;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
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

    this.spotifyApi = new SpotifyWebApi({
      clientId: config.spotifyClientId,
      clientSecret: config.spotifyClientSecret,
      redirectUri: DEFAULT_SPOTIFY_CALLBACK,
    });

    this.login(config.spotifyAuthCode);
  }

  async login(authCode) {
    try {
      const data = await this.spotifyApi.authorizationCodeGrant(authCode);

      this.log.debug('The token expires in ' + data.body['expires_in']);
      this.log.debug('The access token is ' + data.body['access_token']);
      this.log.debug('The refresh token is ' + data.body['refresh_token']);

      this.spotifyApi.setAccessToken(data.body['access_token']);
      this.spotifyApi.setRefreshToken(data.body['refresh_token']);
    } catch (err) {
      this.log.error('Could not authorize Spotify', err);
      throw new Error(SPOTIFY_AUTH_ERROR);
    }
  }
}
