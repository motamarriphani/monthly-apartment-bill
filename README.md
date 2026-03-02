# Monthly Apartment Bill (Expo Android App)

Simple offline Android app for calculating apartment water bills month-by-month.

## Live Links

- Web app (GitHub Pages): https://motamarriphani.github.io/monthly-apartment-bill/
- APK download (Expo build): https://expo.dev/artifacts/eas/qhHsAFXAqvbCfZqwcCeuoK.apk
- Build reference: `eea19937b7fdbb0f5c30a1ddaf22af2df7616e31`

## Features

- Tankers, tanker price, current bill, maintenance, flats, and flat minutes inputs
- Add/Remove flat rows
- Auto recalculation on every input change
- Money values rounded to nearest rupee
- Flat-wise breakdown table
- Offline persistence using AsyncStorage
- Android-first setup with EAS APK build profile

## Install and Run

```bash
npm install
npx expo start
```

To run on Android device while developing:

```bash
npx expo start --android
```

## Build APK with EAS

1. Install EAS CLI:

```bash
npm install -g eas-cli
```

2. Login:

```bash
npx expo login
eas login
```

3. Configure EAS (one-time):

```bash
eas build:configure
```

4. Build APK:

```bash
eas build --platform android --profile preview
```

5. Open the build URL, download APK, and transfer it to the phone.

## Manual APK Install on Android

1. On the phone, enable installing from unknown sources for the file manager/browser used.
2. Tap the downloaded APK file.
3. Complete installation and open the app.
