package com.vioskv2.receiptprinter

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

/**
 * Tells the JavaScript side which client this APK was built for.
 *
 * The values come from buildConfigField in app/build.gradle, so a build of
 * the "akanan" flavour reports AKANAN and its store code, while the plain
 * "viosk" flavour reports an empty code and asks the user to type one.
 */
class ClientBrandModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "ClientBrand"

  // Exposed as constants so JS can read them synchronously at startup,
  // before the login screen paints.
  override fun getConstants(): MutableMap<String, Any> =
    hashMapOf(
      "clientName" to BuildConfig.CLIENT_NAME,
      "storeCode" to BuildConfig.CLIENT_STORE_CODE,
      "flavor" to BuildConfig.FLAVOR,
    )

  @ReactMethod
  fun get(promise: Promise) {
    promise.resolve(
      com.facebook.react.bridge.Arguments.createMap().apply {
        putString("clientName", BuildConfig.CLIENT_NAME)
        putString("storeCode", BuildConfig.CLIENT_STORE_CODE)
        putString("flavor", BuildConfig.FLAVOR)
      }
    )
  }
}
