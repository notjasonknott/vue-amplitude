import amplitude from "amplitude-js";

function _init(key, callback) {
  let config = {
    batchEvents: false,
    includeReferrer: true,
    includeUtm: true
  };

  amplitude.getInstance().init(key, null, config, callback);
}

function _deviceId() {
  return amplitude.getInstance().options.deviceId;
}

function _getGlobalEventProperties(route) {
  return {
    'PAGE' : route.name,
    'PATH' : route.fullPath,
    'QUERY': route.query,
    'HASH': route.hash
  };
}

function isValidRoute(route) {
  if (route === undefined || route === null || route.name === undefined || route.fullPath === undefined ||
    route.query === undefined || route.hash === undefined) {
    console.error("Route object must be define 'page', 'fullPath', 'query', and 'hash' properties");
    return false;
  }
  return true;
}

class _Event {
  constructor(global_event_properties) {
    this.geps = global_event_properties;
    this.properties = {};
  }

  sendEvent() {
    let properties = Object.assign({}, this.properties, this.geps);
    amplitude.getInstance().logEvent(this.name, properties);
  }
}

class _PageLoadEvent extends _Event {
  constructor(global_event_properties) {
    super(global_event_properties);
    this.name = "load-page";
  }
}

class _ClickEvent extends _Event {
  constructor(description, destination, section, global_event_properties) {
    super(global_event_properties);
    this.name = "click";
    this.properties = {
      'ITEM-DESCRIPTION': description,
      'LINK-DESTINATION': destination,
      'SECTION': section
    };
  }
}

class VueAmplitude {
  constructor(key, debug=false) {

    if (key === undefined) {
      console.error("init must be passed a valid Key");
      return;
    }
    this._initialized = true;
    this._debug = debug;
    return _init(key);
  }

  get device_id() {
    if (this._initialized !== true) {
      console.error("init must be called for Amplitude before accessing deviceId");
      return;
    }
    return _deviceId();
  }

  pageLoadEvent(route) {
    if (this._initialized !== true) {
      console.error("init must be called for Amplitude before calling onPageLoad");
      return;
    }
    if (!isValidRoute(route)) {
      return;
    }
    const geps = _getGlobalEventProperties(route);
    const event = new _PageLoadEvent(geps);
    event.sendEvent();

    if (this._debug) {
      console.log('sent event ' + event.name);
    }
  }

  clickEvent({ route, description, destination=null, section=null }) {
    if (this._initialized !== true) {
      console.error("init must be called for Amplitude before calling clickEvent");
      return;
    }
    if (description === undefined) {
      console.error("Click Event options must define 'item description'");
      return;
    }
    if (!isValidRoute(route)) {
      return;
    }
    const geps = _getGlobalEventProperties(route);
    const event = new _ClickEvent(description, destination, section, geps);
    event.sendEvent();

    if (this._debug) {
      console.log('sent event ' + event.name);
    }
  }
}


// noinspection JSUnusedGlobalSymbols
export default {
  install(Vue, { router, amplitude_key, debug = false } = {}) {

    const plugin = new VueAmplitude(amplitude_key, debug);

    // add easy access to the amplitude plugin
    // noinspection JSUnusedGlobalSymbols
    Vue.prototype.$amplitude = plugin;

    // add a before resolve hook to the router so that
    // a page load event is sent everytime a page is loaded
    router.beforeResolve((to, from, next) => {
      plugin.pageLoadEvent(to);
      next();
    });

    Vue.directive('amplitude-click', {
      bind(el, binding) {
        const item_description = binding.value.description;
        if (item_description === undefined) {
          console.error("amplitude-click value must define 'description'");
          return;
        }

        const route = binding.value.route;
        if (route === undefined) {
          console.error("amplitude-click value must define 'route'");
          return;
        }

        el.addEventListener('click', () => {
          plugin.clickEvent(binding.value);
        });
      },
    });
  },
};
