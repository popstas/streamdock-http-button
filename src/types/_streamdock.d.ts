/// <reference types="vite/client" />

interface Window {
  argv: StreamDock.Argv; // Entry parameters
  connectSDSocket(): void; // Entry function
  connectMiraBoxSDSocket(): void; // Entry function
  connectSocket(): void; // Compatible with Elgato interface
  connectElgatoStreamDeckSocket(): void; // Compatible with Elgato interface
  onFilePickerReturn(files: string): void; // File upload trigger => Used to get absolute path
}

// Title parameters
type titleParameters = EventPayload.titleParametersDidChange['payload']['titleParameters'];

// Event payload
declare namespace EventPayload {
  // Action persistent data
  type didReceiveSettings = {
    action: string;
    event: string;
    device: string;
    context: string;
    payload: {
      settings: {};
      coordinates: {
        column: number;
        row: number;
      };
    };
    isInMultiAction: boolean;
  };
  type didReceiveGlobalSettings = {
    event: string;
    payload: {
      settings: {};
    };
  };
  type applicationDidLaunch = {
    event: string;
    payload: {
      application: string;
    };
  };
  type applicationDidTerminate = {
    event: string;
    payload: {
      application: string;
    };
  };
  type systemDidWakeUp = {
    event: string;
  };
  type stopBackground = {
    event: string;
    device: string;
    source?: string;
  };
  type lockScreen = {
    event: string;
    device: string;
  };
  type unRegistrationScreenSaverEvent = {
    action: string;
    event: string;
    device: string;
    context: string;
  };
  type keyUpCord = {
    // action: string;
    event: string;
    device: string;
    // context: string;
    payload: {
      coordinates: {
        x: number;
        y: number;
      };
      size: {
        width: number;
        height: number;
      };
    };
    isInMultiAction: boolean;
  };
  type sendUserInfo = {
    event: string;
    payload: {
      loginName: string;
      loginID: string;
      loginImageUrl: string;
    };
  };
  // Press|Release|Touch
  type keyDownUpTouchTap = {
    action: string;
    event: string;
    context: string;
    device: string;
    payload: {
      settings: {};
      coordinates: {
        column: number;
        row: number;
      };
      state: number;
      userDesiredState: number;
      isInMultiAction: boolean;
    };
  };
  // Create|Destroy action
  type willAppearDisappear = {
    action: string;
    event: string;
    context: string;
    device: string;
    payload: {
      settings: {};
      coordinates: {
        column: number;
        row: number;
      };
      state: number;
      isInMultiAction: boolean;
    };
  };
  // Modify title parameters
  type titleParametersDidChange = {
    action: string;
    event: string;
    context: string;
    device: string;
    payload: {
      coordinates: {
        column: number;
        row: number;
      };
      settings: {};
      state: number;
      title: string;
      titleParameters: {
        fontFamily: string;
        fontSize: number;
        fontStyle: string;
        fontUnderline: boolean;
        showTitle: boolean;
        titleAlignment: string;
        titleColor: string;
      };
    };
  };
  // Connect|Disconnect device
  type deviceDidConnectDisconnect = {
    event: string;
    device: string;
    deviceInfo: {
      name: string;
      type: number;
      size: {
        columns: number;
        rows: number;
      };
    };
  };
  // Show|Destroy property inspector
  type propertyInspectorDidAppearDisappear = {
    action: string;
    event: string;
    context: string;
    device: string;
  };
  // Receive property inspector message
  type sendToPlugin = {
    event: string;
    action: string;
    context: string;
    payload: { [k: string]: any };
  };
  // Receive plugin message
  type sendToPropertyInspector = {
    action: string;
    event: string;
    context: string;
    payload: { [k: string]: any };
  };
  // Knob press|release
  type KnobUPDown = {
    action: string;
    event: string;
    device: string;
    context: string;
    payload: {
      controller: 'Knob';
      isInMultiAction: boolean;
      coordinates: {
        column: number;
        row: number;
      };
      userDesiredState: number;
      setting: {};
      state: number;
    };
  };
  // Knob rotate
  type dialRotate = {
    action: string;
    event: string;
    device: string;
    context: string;
    payload: {
      pressed: boolean;
      coordinates: {
        column: number;
        row: number;
      };
      setting: {};
      ticks: number;
    };
  };
}

// Software related
declare namespace StreamDock {
  // Entry parameters
  type Argv = [
    string,
    string,
    string,
    {
      application: {
        font: string;
        language: string;
        platform: string;
        platformVersion: string;
        version: string;
      };
      plugin: {
        uuid: string;
        version: string;
      };
    },
    {
      action: string;
      context: string;
      payload: {
        controller: string;
        coordinates: {
          column: number;
          row: number;
        };
        isInMultiAction: boolean;
        settings: any;
        state: number;
      };
    }
  ];

  // Message communication
  type Message = {
    event: string;
    action?: string;
    context?: string;
    payload?: unknown;
  };

  // Property inspector events
  type ProperMessage = {
    didReceiveSettings?(this: ProperMessage, data: EventPayload.didReceiveSettings): void;
    didReceiveGlobalSettings?(this: ProperMessage, data: EventPayload.didReceiveGlobalSettings): void;
    sendToPropertyInspector?(this: ProperMessage, data: EventPayload.sendToPropertyInspector): void;
  };

  // Action trigger events
  type ActionMessage = {
    ActionID?: string;
    didReceiveSettings?(this: ActionMessage, data: EventPayload.didReceiveSettings): void;
    keyDown?(this: ActionMessage, data: EventPayload.keyDownUpTouchTap): void;
    keyUp?(this: ActionMessage, data: EventPayload.keyDownUpTouchTap): void;
    touchTap?(this: ActionMessage, data: EventPayload.keyDownUpTouchTap): void;
    willAppear?(this: ActionMessage, data: EventPayload.willAppearDisappear): void;
    willDisappear?(this: ActionMessage, data: EventPayload.willAppearDisappear): void;
    titleParametersDidChange?(this: ActionMessage, data: EventPayload.titleParametersDidChange): void;
    propertyInspectorDidAppear?(this: ActionMessage, data: EventPayload.propertyInspectorDidAppearDisappear): void;
    propertyInspectorDidDisappear?(this: ActionMessage, data: EventPayload.propertyInspectorDidAppearDisappear): void;
    sendToPlugin?(this: ActionMessage, data: EventPayload.sendToPlugin): void;
    dialDown?(this: ActionMessage, data: EventPayload.KnobUPDown): void;
    keyUp?(this: ActionMessage, data: EventPayload.KnobUPDown): void;
    dialRotate?(this: ActionMessage, data: EventPayload.dialRotate): void;
    deletesAction?(this: PluginMessage, data: EventPayload.willAppearDisappear): void;
    unRegistrationScreenSaverEvent?(this: PluginMessage, data: EventPayload.unRegistrationScreenSaverEvent): void;
  };

  // Plugin trigger events
  type PluginMessage = {
    // Device connect TODO: Parameters unknown
    deviceDidConnect?(this: PluginMessage, data: EventPayload.deviceDidConnectDisconnect): void;
    // Device disconnect TODO: Parameters unknown
    deviceDidDisconnect?(this: PluginMessage, data: EventPayload.deviceDidConnectDisconnect): void;
    didReceiveGlobalSettings?(this: PluginMessage, data: EventPayload.didReceiveGlobalSettings): void;
    applicationDidLaunch?(this: PluginMessage, data: EventPayload.applicationDidLaunch): void;
    applicationDidTerminate?(this: PluginMessage, data: EventPayload.applicationDidTerminate): void;
    systemDidWakeUp?(this: PluginMessage, data: EventPayload.systemDidWakeUp): void;
    keyUpCord?(this: PluginMessage, data: EventPayload.keyUpCord): void;
    keyDownCord?(this: PluginMessage, data: EventPayload.keyUpCord): void;
    stopBackground?(this: PluginMessage, data: EventPayload.stopBackground): void;
    lockScreen?(this: PluginMessage, data: EventPayload.lockScreen): void;
    unLockScreen?(this: PluginMessage, data: EventPayload.lockScreen): void;
    sendUserInfo?(this: PluginMessage, data: EventPayload.sendUserInfo): void;
  };
}
