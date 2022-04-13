<p style="text-align: center;">
    <img alt="homebridge-logo" src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge Spotify Speaker

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![npm version](https://img.shields.io/npm/v/@poblouin/homebridge-spotify-speaker)](https://www.npmjs.com/package/@poblouin/homebridge-spotify-speaker) [![npm downloads](https://img.shields.io/npm/dt/@poblouin/homebridge-spotify-speaker)](https://www.npmjs.com/package/@poblouin/homebridge-spotify-speaker) [![Build and Lint](https://github.com/poblouin/homebridge-spotify-speaker/actions/workflows/build.yml/badge.svg)](https://github.com/poblouin/homebridge-spotify-speaker/actions/workflows/build.yml)

**Please read before using and facing any deceptions**

The main purpose of this plugin is to expose a speaker in Homekit that is linked to a specific spotify device ID and that will play a specific playlist once activated. As of the current state, it is not a real speaker in Homekit, it's a lightbulb. A speaker accessory requires Airplay 2 and Spotify is not Airplay 2 compatible yet (will it ever be!?). With a lightbulb, you can toggle on/off the playlist and change the volume via the brightness setting.

The primary use case for me is that we have a little feather friend at home, and I wanted an easy way to start playing its Spotify playlist when we leave home. I might improve it in the future, but for now this is what I needed. I guess once Spotify will support Airplay 2, we will be able to play Spotify on the Homepod Mini, for example and this plugin won't have any purpose anymore. If you feel that something could be improved, PRs are the most welcome!

## Distinction between Spotify Connect and Spotify Connect API

Spotify Connect is the technology built-in the Spotify app (Desktop and Mobile) that allow a device to play music on a compatible Spotify Connect device.

Spotify Connect API is a collection of HTTP endpoints to communicate with compatible devices. Also, keep in mind that Spotify Connect API is still in beta. Features could change at any moment and I might need to adapt this plugin as it evolves.

A device that is compatible with Spotify Connect is not automatically compatible with Spotify Connect API. The best example is Sonos, they are obviously compatible with Spotify Connect, but not with the API.

I am not able to find an official, up to date and complete list of compatible Spotify Connect API devices unfortunately. If I do find one, I will update this documentation!

## Speaker setup

The speaker itself only need to be Spotify connect compatible. Either natively or you can use a library to make a speaker compatible. I personally use a bluetooth speaker hooked up to a Raspberry pi and I use [Raspotify](https://github.com/dtcooper/raspotify).

## Warning about the volume

This is Homekit's behaviour to set back the brightness to 100% when a device is shut down. There is nothing I can do about it unfortunately. So to make sure that you don't turn on your speaker with the volume set to 100%, use a scene to toggle on the speaker and set the default volume (brightness) in there.

## Spotify Setup

To use this plugin you must provide some authentication information to Spotify and those steps has to be done manually.

1. Create a Spotify application in the developer's dashboard
    
    To do so, go to https://developer.spotify.com/dashboard and create an app. Once this is done you will have your clientId and clientSecret.

2. Obtain the auth code that this plugin will need to generate the access and refresh tokens

    To do so, you need to allow access to the app you created at the previous step. You only need to do this once.

    ```
    https://accounts.spotify.com/authorize?client_id={clientId}&response_type=code&redirect_uri=https://example.com/callback&scope={scopes}
    ```

    In the above URL, there are 2 parameters to fill, `{clientId}` and `{scopes}`.

    - clientId is found at the step 1 in the developer dashboard.
    - scopes is a list of scopes separated with spaces.
        - The basic scope needed for this app are `user-read-playback-state user-modify-playback-state user-read-currently-playing`.

    When you got the URL with the parameters filled, go to your browser and access it.
    - You will have a small agreement form, simply accept it.
    - Then you will be redirected and you will find your code in the URL

    ```
    Example, you will get an URL that looks like the following. The code is everything that follows `code=`.

    https://example.com/callback?code=AQDPqT0ctdUm-uE2JRwbAoaWA-iRm0OuGY7wI17zQUlTxw7JfRma6id1mq-m8xKH6vJVNutJSqQcBrPZ__81uF-hrSJ-q_AX2yUEwERQKTnaPLDFCIE-c_qBjg81JSd5FqmEpJ5j9ddgKvkWUJ6WK5Kj-npTypCrUoQWRn9Vkn33DlYOfU7BxgPAPQBXQtqIfub3S576-gdUOGUAGPd6Ud5esSNMeI2lFKb-sj4eMiQJJJb35VI__EkRuFFJNCZkFagr3rBI-GGzfQA
    ```  
3. Take the code obtained at step #2 and put it in your homebridge `config.json` as the value of the attribute `spotifyAuthCode`. Once that is done, restart Homebridge and you should be up and running. Look at the logs for ay errors.

For more details, see the [official auth documentation](https://developer.spotify.com/documentation/general/guides/authorization-guide/#authorization-code-flow)

And you can find [all the scopes here](https://developer.spotify.com/documentation/general/guides/authorization/scopes/)

## Spotify's authentication flow

With the previous steps, you will provide the code grant and the plugin will do the rest.

- It will generate the access and refresh tokens
- It will store them in a file named `.homebridge-spotify-speaker` in the homebridge's persist directory. Thus, when your homebridge server restarts, it can fetch back the tokens.
- It will automatically refresh the access token when needed

## Finding a speaker device ID

Once the spotify authentication flow is done, the plugin will display the list of available devices in your Homebridge logs. In Homebridge UI, keep an eye on the logs when the plugin restarts and you will see a message looking like the following:

![Example Device Log](assets/example-device.png)

You can then take the `id` from the Spotify device that you want to control and this is what you put in the plugin's configuration as the `spotifyDeviceId`.

## Issues and Questions

If you run into issues or you need help please use the [issues template](https://github.com/poblouin/homebridge-spotify-speaker/issues/new/choose). Fill all the relevant sections and submit your issue. It is important that you use the templates because I will automatically be assigned to your issue and I will receive an email. If you use the blank template without assigning me, I will most likely miss the Github notification since I have too many of them with work, I can't read them all.

## FAQ

### I don't see my device in the list of available devices

If you haven't done it already, start by reading [this section](#distinction-between-spotify-connect-and-spotify-connect-api).

Common issues related to that though could be:
  - The Homebridge instance on which this plugin is installed is not on the same network as the Spotify device
  - The Spotify device is currently tied to another user account. Example, you authenticated this plugin using your account, and the Spotify device was last played with your SO's account.
  - The device is in sleep mode. Any devices that sleeps (e.g. a computer) won't be available via the API.

## Contributors

Special thanks to Tuca, the reason behind this plugin.
![One Scary Reptile](assets/scary-reptile.png)
