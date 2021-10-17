<p style="text-align: center;">
    <img alt="homebridge-logo" src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge Spotify

This plugin is used to control Spotify for specific use cases.

I have two little feather friends at home, and I wanted an easy way to start playing their Spotify playlist when we leave home. Since Apple only supports Music in the Home app, I created this plugin to be able to have a simple switch to start playing a specific playlist on a specific device using Spotify Connect API. I might improve it in the future, but for now this is what I needed.

This is for my personal use, but I let the repo public if it could be of use to someone else. All the login logic is there for Spotify, you will find it in `src/spotifyApiWrapper.ts`. I made it easy to improve this plugin and add new features, PRs are the most welcome!

## Spotify Setup

To use this plugin you must provide some authentication information to Spotify and those steps has to be done manually.

1. Create a Spotify application
    
    To do so, go to https://developer.spotify.com/dashboard and create an app. Once this is done you will have your clientId and clientSecret.

2. Obtain the auth code that this plugin will need to generate the access and refresh tokens

    To do so, you need to allow access to the app you created at the previous step. You only need to do this once.

    ```
    https://accounts.spotify.com/authorize?client_id={clientId}&response_type=code&redirect_uri=https://example.com/callback&scope={scopes}
    ```

    In the above URL, there are 2 parameters to fill, `{clientId}` and `{scopes}`.

    - clientId is found at the step 1 in the developer dashboard.
    - scopes is a list of scopes separated with spaces.
        - The basic scope needed for this app are `streaming user-read-email user-modify-playback-state user-read-private`.

    When you got the URL with the parameters filled, go to your browser and access it.
    - You will have a small agreement form, simply accept it.
    - Then you will be redirected and you will find your code in the URL

    ```
    Example, you will get an URL that looks like the following. The code is everything that follows `code=`.

    https://example.com/callback?code=AQDPqT0ctdUm-uE2JRwbAoaWA-iRm0OuGY7wI17zQUlTxw7JfRma6id1mq-m8xKH6vJVNutJSqQcBrPZ__81uF-hrSJ-q_AX2yUEwERQKTnaPLDFCIE-c_qBjg81JSd5FqmEpJ5j9ddgKvkWUJ6WK5Kj-npTypCrUoQWRn9Vkn33DlYOfU7BxgPAPQBXQtqIfub3S576-gdUOGUAGPd6Ud5esSNMeI2lFKb-sj4eMiQJJJb35VI__EkRuFFJNCZkFagr3rBI-GGzfQA
    ```
    

For more details, see the [official auth documentation](https://developer.spotify.com/documentation/general/guides/authorization-guide/#authorization-code-flow)

And you can find [all the scopes here](https://developer.spotify.com/documentation/general/guides/scopes/)

## Spotify's authentication flow

With the previous steps, you will provide the code grant and the plugin will do the rest.

- It will generate the access and refresh tokens
- It will store them in a file named `.homebridge-spotify` in the homebridge's persist directory. Thus, when your homebridge server restarts, it can fetch back the tokens.
- It will automatically refresh the access token when needed
