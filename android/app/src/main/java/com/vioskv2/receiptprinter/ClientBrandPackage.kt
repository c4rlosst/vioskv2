package com.vioskv2.receiptprinter

import android.view.View
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.ViewManager

class ClientBrandPackage : ReactPackage {
  override fun createNativeModules(
    reactContext: ReactApplicationContext
  ): MutableList<NativeModule> = mutableListOf(ClientBrandModule(reactContext))

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): MutableList<ViewManager<View, ReactShadowNode<*>>> = mutableListOf()
}
