var typingDelayTimer = false;           // named timer used to determine when typing has stopped
var returnFocusToEditorDelay     = 200; // in ms
var refreshWidgetFromEditorDelay = 800; // in ms
var currentlyDisplayedEditorObj = false;
var signInWidget = false;               // holds the currently displayed signInWidget object which is setup in index.html
var editors = {};                       // keeps track of all editors that have been setup
// Holds configuration overrides
var localConfig = {
  include: {
    // Needed so we know the name of the div id for the current signInWidget
    name: "home"
  },
  page: {
    okta: {}
  }
};


var sassConf = {
  // HTTP requests are made relative to the SASS worker
  base: "../sass",
  // The directory files should be made available in
  directory: "",
  // The files to load (relative to both base and directory)
  // Okta uses a lot of SCSS files!
  files: [
    "_base.scss",
    "_container.scss",
    "_fonts.scss",
    "_helpers.scss",
    "_ie.scss",
    "_layout.scss",
    "_variables.scss",
    "common/admin/icons/_all.scss",
    "common/admin/icons/_classes-social.scss",
    "common/admin/icons/_classes.scss",
    "common/admin/icons/_functions.scss",
    "common/admin/icons/_variables-theme.scss",
    "common/admin/icons/_variables-unicode-social.scss",
    "common/admin/icons/_variables-unicode.scss",
    "common/admin/modules/infobox/_infobox.scss",
    "common/enduser/_helpers.scss",
    "common/enduser/_reset.scss",
    "common/enduser/_responsive-variables.scss",
    "common/foo.scss",
    "common/shared/helpers/_all.scss",
    "common/shared/helpers/_mixins.scss",
    "common/shared/helpers/_variables.scss",
    "common/shared/o-forms/_o-form-variable.scss",
    "common/shared/o-forms/_o-form.scss",
    "modules/_accessibility.scss",
    "modules/_app-login-banner.scss",
    "modules/_beacon.scss",
    "modules/_btns.scss",
    "modules/_consent.scss",
    "modules/_enroll.scss",
    "modules/_factors-dropdown.scss",
    "modules/_footer.scss",
    "modules/_forgot-password.scss",
    "modules/_forms.scss",
    "modules/_header.scss",
    "modules/_infobox.scss",
    "modules/_mfa-challenge-forms.scss",
    "modules/_okta-footer.scss",
    "modules/_qtip.scss",
    "modules/_registration.scss",
    "modules/_social.scss",
    "okta-sign-in.scss",
    "okta-theme.scss",
    "widgets/_chosen.scss",
    "widgets/_jquery.qtip.scss",
    "widgets/_mega-drop-down.scss",
  ]
}
var sass = new Sass();
sass.preloadFiles(sassConf.base, sassConf.directory, sassConf.files, function() {
  // console.log("SAAS files loaded")
});

// Do not escape HTML or JS inside Mustache templates
Mustache.escape = function(val) {return val;};

// FIXME: Remove before shipping to production
function ga() {}


// This section contains functions that handle the "live" updates of text in CodeMirror editors
function updateEditorAfterDelay(codeMirror) {
  if(typingDelayTimer) {
    clearTimeout(typingDelayTimer);
  }
  typingDelayTimer = setTimeout(function(){ evalEditorContents(codeMirror); }, refreshWidgetFromEditorDelay);
}

function hasLinterError(editor) {
  return (editor.state.lint.marked.length !== 0);
}

function evalEditorContents(editor) {
  if(hasLinterError(editor)) {
    return;
  }
  currentlyDisplayedEditorObj = editor;
  var contents = editor.getValue();
  switch (editor.options.mode) {
  case "javascript":
    // We do not use "refreshWidget()" here because we only want to eval the changes
    signInWidget.remove();
    eval(contents);
    ga("send", "event", "demo", "logo-change", signInWidgetConfig.logo);
    break;
  case "sass":
    evalStyle(contents);
    break;
  default:
    console.log("Hit default switch for mode: " + editor.options.mode);
  }
}

// Register callback to be called whenever a change is made
CodeMirror.defineInitHook(function(cm) {
  cm.on("changes", updateEditorAfterDelay);
});


function evalStyle(input) {
  sass.compile(input, function(result) {
    if (document.getElementById("css-style")) {
      document.getElementById("css-style").remove();
    }
    var tag = document.createElement("style");
    tag.id = "css-style";
    tag.type = "text/css";
    document.getElementsByTagName("head")[0].appendChild(tag);
    
    var style = document.getElementById("css-style");
    style.innerHTML = result.text;
  });
}

function decodeTabId(target) {
  var tabName = target.split("-")[1];
  var tabType = "js";
  var foundType = target.split("-")[2];
  if (foundType) { tabType = foundType }
  rv = {
    name: tabName, // home, custom, nowidget
    type: tabType, // js, css
  };
  return rv;
}

// FIXME: Why do I have two of these functions? Make one
function makeEditorObjId(name, type = "js") {
  return ["editor", name, type, "codemirror"].join("-");
}

function refreshWidget(target) {
  if(signInWidget) {
    signInWidget.remove();
  }
  var tab = decodeTabId(target);
  // set the global variable to the current editor:
  currentlyDisplayedEditorObj = editors[makeEditorObjId(tab.name, "js")];
  eval(currentlyDisplayedEditorObj.getValue());
  var styleEditorObjId = makeEditorObjId(tab.name, "css");
  if (styleEditorObjId in editors) {
    evalStyle(editors[styleEditorObjId].getValue());
  }
}

function fetchRemoteFileForObjIdAndApplyFunction(objId, callback) {
  var tab = decodeTabId(objId);
  // FIXME: Clean these next 4 lines up
  var remoteFile = "includes/" + tab.name + ".js";
  if (tab.type == "css") {
    remoteFile = "includes/" + tab.name + ".scss";
  }
  
  var customVariables = JSON.parse(JSON.stringify(localConfig));
  customVariables["include"]["name"] = tab.name;
  $.get(remoteFile, function(remoteFileContents) {
    var engine = new Liquid();

    engine.parseAndRender(remoteFileContents, customVariables) .then(callback);
    // var updatedText = Mustache.render(remoteFileContents, customVariables);
    // callback(updatedText);
  }, "text");
}

function setupEditor(name, type) {
  var tab = {
    name: name,
    type: type,
  };
  if (tab.name === "profile") {
    return;
  }
  if (tab.name === "nowidget" && tab.type !== "js") {
    return
  }
    
  var target = makeEditorObjId(tab.name, tab.type);

  var codeMirrorMode = "sass";
  if (tab.type === "js") {
    codeMirrorMode = "javascript";
  }

  
  if (!(target in editors)) {
    editors[target] = CodeMirror.fromTextArea(document.getElementById(target), {
      whoAmI: target,
      lineNumbers: true,
      mode: codeMirrorMode,
      gutters: ["CodeMirror-lint-markers"],
      lint: true,
      matchBrackets: true,
      theme: "neat"
    });
  } else {
    // console.log(tab.name + " is already enabled, refreshing");
    editors[target].refresh();
  }
  currentlyDisplayedEditorObj = editors[target];
}

function updateModalWithLocalConfig() {
  Object.keys(localConfig.page.okta).forEach(function (key) {
    var objId = "#okta\\." + key;
    console.log("objId: " + objId);
    $( objId ).val(localConfig.page.okta[key]);
  });
}

function updateLocalConfig() {
  // FIXME: This is an ugly hack!
  localConfig = {include: {name: ""}, page: {okta: {}}};

  // Re-read local configuration values
  $("#configuration-modal input").each(function(){
    var key = this.id.split(".")[1];
    localConfig["page"]["okta"][key] = this.value;
  });

  localConfig["page"]["okta"]["logo"] = logoFromDomain();

  // Save to localstorage
  localStorage.setItem('localConfig', JSON.stringify(localConfig));
  console.log("Saved to localStorage");
}


// This is only for config changes!
function updateEditors() {
  var localConfigJson = localStorage.getItem('localConfig');
  localConfig = JSON.parse(localConfigJson);

  var tabsFound = [];
  $("#nav-tab a").each(function () {
    var tab = decodeTabId(this.id);
    tabsFound.push(tab.name);
  })

  // "for tabName in tabsFound"
  tabsFound.forEach(function (tabName) {
    // FIXME: Change "css" to "sass" and fix updateForm/updateEditor
    ["js", "css"].forEach(function (editorType) {
      var objId = makeEditorObjId(tabName, editorType);
      if (objId in editors) {
        fetchRemoteFileForObjIdAndApplyFunction(objId, function(value) {
          editors[objId].getDoc().setValue(value);
        });
      } else if (document.getElementById(objId)) {
        fetchRemoteFileForObjIdAndApplyFunction(objId, function(value) {
          $("#" + objId).val(value);
        });
      }
    })
  });
}

// Toggles the "logged in" and "not logged in" views
function toggleProfileTab(state) {
  $("#nav-tab a").each(function () {
    if(this.id.indexOf("profile") !== -1 && state) {
      $( this ).tab("show");
    } else if(this.id.indexOf("home") !== -1 && !state) {
      $( this ).tab("show");
    }

    if(this.id.indexOf("profile") !== -1) {
      $( this ).toggle(state);
    } else {
      $( this ).toggle(!state);
    }
  });
}

function loginWith(accessToken) {
  // IMPORTANT!
  //   The code below does NOT validate the token!
  //   This is for DEMONSTRATION PURPOSES ONLY!
  var jwtPayload = accessToken.split(".")[1];
  var b64 = jwtPayload.replace("-", "+").replace("_", "/");
  var decodedPayload = JSON.parse(window.atob(b64));
  var prettyPrintedPayload = JSON.stringify(decodedPayload, null, 2);
  $( "#token-display" ).text(prettyPrintedPayload);
  //   This is for DEMONSTRATION PURPOSES ONLY!
  //   The code above does NOT validate the token!
  // IMPORTANT!
  
  toggleProfileTab(true);
  console.log("Logged in successfully");
}

function login() {
  signInWidget.session.get(function (res) {
    if (res.status === "ACTIVE") {
      var rv = signInWidget.tokenManager.get("accessToken");
      loginWith(rv.accessToken)
    } else {
      console.log("Can not log in a user when their status is not ACTIVE");
    }
  });

}

function logout () {
  signInWidget.session.get(function (res) {
    if (res.status === "ACTIVE") {
      // Clear tokens from local storage
      signInWidget.tokenManager.clear();
      signInWidget.session.close(function (err) {
        if (err) {
          console.log(err);
          return;
        } else {
          console.log("Logged out successfully");
          toggleProfileTab(false);
        }
      });
    } else {
      console.log("Can not log out a user when their status is not ACTIVE");
    }
  });
}

function logoFromDomain() {
  var domainName = $( "#okta\\.domainName" ).val();
  var prefix = "//logo.clearbit.com/";
  var uri = prefix + domainName;
  return uri;
}

function updateLogo() {
  var uri = logoFromDomain();
  $("#logo-preview").attr("src", uri);
  localConfig["page"]["okta"]["logo"] = uri;
  var uri = logoFromDomain();
  Vibrant.from("http:" + uri).getPalette(function(err, palette) {
    if (err !== null) {
      return
    }
    vib = palette;
    $("#color1").colorpicker("setValue", palette["Vibrant"].getHex());
    if(palette['LightVibrant']) {
      $("#color2").colorpicker("setValue", palette["LightVibrant"].getHex());
    }
    updateLocalConfig();
    updateEditors();

    // FIXME: This is an UGLY hack!
    // If you switch to another tab, like "social" or "custom", then switch back to "home"
    // and then config, and then change logo, it won't work, unless you do this, I don't know why
    // it's proabably a race condition :(
    var tab = decodeTabId(currentlyDisplayedEditorObj.options.whoAmI);
    var thisTabId = "nav-" + tab.name + "-tab";
    setTimeout(function(){ refreshWidget(thisTabId); }, refreshWidgetFromEditorDelay * 3);
    // ENDFIXME
  });
}

var logoTypingDelayTimer = false;
$("#okta\\.domainName").keyup(function() {
  if(logoTypingDelayTimer) {
    clearTimeout(logoTypingDelayTimer);
  }
  logoTypingDelayTimer = setTimeout(function(){ updateLogo(); }, refreshWidgetFromEditorDelay);
})

// FIXME: Replace this with Vue.js logic
// This is called when a tab is switched to
$("a[data-toggle='tab']").on("shown.bs.tab", function (e) {
  // FIXME: Do not hard code the if statement below
  if(e.target.id === "nav-profile-tab") {
    return;
  }
  // console.log("Tab switched from: " + e.relatedTarget.id + " to: " + e.target.id)
  var tab = decodeTabId(e.target.id);
  if(e.target.id.startsWith("nav-") ) {
    setupEditor(tab.name, "js");
    setupEditor(tab.name, "css");
    
    refreshWidget(e.target.id);
  // Needed for the SASS editor tab to work
  } else if (e.target.id.endsWith("css-tab")) {
    setupEditor(tab.name, tab.type);
    evalStyle(editors[makeEditorObjId(tab.name, "css")].getValue());
  } else {
    // console.log("Ignoring tab: " + e.target.id);
  }
});

$( "#nav-profile-tab" ).click(function() {
  logout();
});

$( "#nav-onclick-tab" ).click(function() {
  var authClient = new OktaAuth({
    url:         signInWidgetConfig.baseUrl,
    clientId:    signInWidgetConfig.clientId,
    redirectUri: signInWidgetConfig.redirectUri,
    issuer:      signInWidgetConfig.authParams.issuer,
  });
  authClient.token.getWithRedirect({
    responseType: ['token', 'id_token'],
    scopes: signInWidgetConfig.authParams.scopes
  });
});

$("#modal-save").click(function() {
  updateLocalConfig();
  updateEditors();
  $('#configuration-modal').modal('hide');
});

$("#modal-reset").click(function() {
  localStorage.clear();
  location.reload();
});


function preventOktaSignInWidgetFromStealingFocus() {
  // Note: This requires that the "signInWidget" object has been defined already
  signInWidget.on("pageRendered", function (data) {
    setTimeout(function(){ currentlyDisplayedEditorObj.focus(); }, returnFocusToEditorDelay);
  });
}

$(function () {
  setupEditor("home", "css");
  setupEditor("home", "js");

  if (localStorage.getItem('localConfig')) {
    updateEditors();
    updateModalWithLocalConfig();
    setTimeout(function(){ refreshWidget("nav-home-tab"); }, refreshWidgetFromEditorDelay);
  } else {
    refreshWidget("nav-home-tab");
  }

  preventOktaSignInWidgetFromStealingFocus();

  $("#color1").colorpicker();
  $("#color2").colorpicker();
});
