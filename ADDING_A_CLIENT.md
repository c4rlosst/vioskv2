# Adding a new client

Two halves: a row in the database, and a build of the app. Do them in that
order — the build bakes in the store code the database hands you.

## 1. The database

```sql
select * from onboard_business(
  p_business_name => 'Mang Tomas Grill',
  p_slug          => 'mang-tomas',
  p_store_name    => 'Main',
  p_staff_code    => 'TOMS',       -- 4 letters, this is the build's store code
  p_staff_pin     => '<6 digits>',
  p_manager_pin   => '<6 digits>',
  p_table_count   => 8
);
```

It returns the `store_code` and a `qr_url`. Keep both. PINs are hashed on the
way in and **cannot be read back** — write them down now or reset them later
with `set_staff_pin`.

## 2. The APK

Each client gets its own app on the phone: its own name, its own icon, its
own `applicationId` so two clients' apps can sit side by side on one device,
and the store code compiled in so staff only ever type a PIN.

**a. Add a flavour** in `android/app/build.gradle`, under `productFlavors`:

```gradle
mangtomas {
    dimension "client"
    applicationId "com.vioskv2.receiptprinter.mangtomas"
    resValue "string", "app_name", "Mang Tomas"
    buildConfigField "String", "CLIENT_NAME", '"Mang Tomas Grill"'
    buildConfigField "String", "CLIENT_STORE_CODE", '"TOMS"'
}
```

The flavour name must be a valid Java identifier — lowercase, no spaces or
hyphens. `applicationId` must be unique and must never change once the client
has installed it, or their next build looks like a different app.

**b. Add the icon.** Edit the `CLIENTS` map in `tools/mkicons.py`, then run it:

```bash
python3 tools/mkicons.py
```

That writes `android/app/src/<flavour>/res/mipmap-*/ic_launcher.png` at all
five densities. Replace them by hand if the client has a real logo.

**c. Build it:**

```powershell
cd android
.\gradlew assembleMangtomasRelease
```

Output: `android\app\build\outputs\apk\mangtomas\release\app-mangtomas-release.apk`

`.\gradlew assembleRelease` builds every client at once.

## Signing

All flavours are currently signed with the **debug keystore**. That is fine
for sideloading and testing, and not fine for anything else: anyone can forge
an update, and Play Store will refuse it. Before a real rollout, generate a
release keystore, keep it somewhere it cannot be lost, and point
`signingConfigs.release` at it. Losing that keystore means no client can ever
receive an update to their app again.

## The plain `viosk` flavour

Keeps the original `applicationId`, so it upgrades the app already installed
on your phone. It ships with an **empty** store code, so it shows the store
code field and can sign in to any shop. Use it for demos and for a shop that
has not had its own build cut yet.
