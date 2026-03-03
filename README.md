This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Verification

1. Set a user profile to `plan='grace'`.
2. Insert 100 rows into `public.applications` for that user.
3. Confirm the 101st insert fails with `PLAN_LIMIT`.
4. Set the same user to `plan='pro'` and confirm inserts can exceed 100.

## Android Release Build

This project is wrapped with Capacitor and loads only the production Vercel URL via `server.url` in `capacitor.config.ts`.

1. Create a keystore

```powershell
keytool -genkeypair -v -keystore job-tracker-upload-keystore.jks -alias jobtracker -keyalg RSA -keysize 2048 -validity 10000
```

2. Add signing config in `android/app/build.gradle`

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file("job-tracker-upload-keystore.jks")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias "jobtracker"
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            shrinkResources false
        }
    }
}
```

3. Build the release AAB

```powershell
cd android
.\gradlew bundleRelease
```

4. Output AAB path

```text
android/app/build/outputs/bundle/release/app-release.aab
```

### Play Console Upload Checklist

1. `applicationId` matches Play Console package (`com.minwoo.jobtracker`).
2. AAB is signed with the correct upload key.
3. `capacitor.config.ts` uses only HTTPS production URL in `server.url`.
4. No cleartext HTTP settings were added (`cleartext: false`, no `usesCleartextTraffic=true`).
5. Version code/version name are incremented before each upload.
6. App name, icon, and basic startup behavior are verified on a real device.
