import UIKitimport UIKitimport UIKit

import React

import React_RCTAppDelegateimport Reactimport React



#if canImport(ReactAppDependencyProvider)import React_RCTAppDelegateimport React_RCTAppDelegate

import ReactAppDependencyProvider

#endif#if canImport(ReactAppDependencyProvider)import ReactAppDependencyProvider



import Firebaseimport ReactAppDependencyProviderimport Firebase



@main#endif

class AppDelegate: UIResponder, UIApplicationDelegate {

import Firebase@main

  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?class AppDelegate: UIResponder, UIApplicationDelegate {

  var reactNativeFactory: RCTReactNativeFactory?

@main  var window: UIWindow?

  func application(

    _ application: UIApplication,class AppDelegate: UIResponder, UIApplicationDelegate {

    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil

  ) -> Bool {  var window: UIWindow?  var reactNativeDelegate: ReactNativeDelegate?

    // Initialize Firebase

    FirebaseApp.configure()  var reactNativeFactory: RCTReactNativeFactory?

    

    // Initialize React Native delegate  var reactNativeDelegate: ReactNativeDelegate?

    self.reactNativeDelegate = ReactNativeDelegate()

      var reactNativeFactory: RCTReactNativeFactory?  func application(

    // Initialize React Native factory

    self.reactNativeFactory = RCTReactNativeFactory(    _ application: UIApplication,

      defaultReactNativeDelegate: self.reactNativeDelegate

    )  func application(    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil

    

    #if canImport(ReactAppDependencyProvider)    _ application: UIApplication,  ) -> Bool {

    // Set dependency provider for new architecture

    self.reactNativeFactory?.dependencyProvider = RCTAppDependencyProvider()    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil    // Initialize Firebase

    #endif

      ) -> Bool {    FirebaseApp.configure()

    // Initialize the window

    window = UIWindow(frame: UIScreen.main.bounds)    // Initialize Firebase    

    

    if let rootViewController = self.reactNativeFactory?.viewController(    FirebaseApp.configure()    let delegate = ReactNativeDelegate()

      withModuleName: "PokeExplorer",

      initialProperties: nil        let factory = RCTReactNativeFactory(delegate: delegate)

    ) {

      let rootView = rootViewController.view!    let delegate = ReactNativeDelegate()    delegate.dependencyProvider = RCTAppDependencyProvider()

      

      window?.rootViewController = rootViewController    let factory = RCTReactNativeFactory(delegate: delegate)

      window?.makeKeyAndVisible()

    }        reactNativeDelegate = delegate

    

    return true    #if canImport(ReactAppDependencyProvider)    reactNativeFactory = factory

  }

}    delegate.dependencyProvider = RCTAppDependencyProvider()



// Delegate class for handling React Native bundling    #endif    window = UIWindow(frame: UIScreen.main.bounds)

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {

  

  override func sourceURL(for bridge: RCTBridge) -> URL? {

    self.bundleURL()    reactNativeDelegate = delegate    factory.startReactNative(

  }

      reactNativeFactory = factory      withModuleName: "PokeExplorer",

  override func bundleURL() -> URL? {

    #if DEBUG      in: window,

    // For development, load from dev server

    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")    window = UIWindow(frame: UIScreen.main.bounds)      launchOptions: launchOptions

    #else

    // For production, load from app bundle    )

    Bundle.main.url(forResource: "main", withExtension: "jsbundle")

    #endif    factory.startReactNative(

  }

}      withModuleName: "PokeExplorer",    return true


      in: window,  }

      launchOptions: launchOptions}

    )

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {

    return true  override func sourceURL(for bridge: RCTBridge) -> URL? {

  }    self.bundleURL()

}  }



class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {  override func bundleURL() -> URL? {

  override func sourceURL(for bridge: RCTBridge) -> URL? {#if DEBUG

    self.bundleURL()    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")

  }#else

    Bundle.main.url(forResource: "main", withExtension: "jsbundle")

  override func bundleURL() -> URL? {#endif

#if DEBUG  }

    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")}

#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
